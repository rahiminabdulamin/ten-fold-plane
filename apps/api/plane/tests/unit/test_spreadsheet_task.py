import requests
import pytest
from contextlib import nullcontext
from types import SimpleNamespace

from plane.bgtasks import spreadsheet_task
from plane.bgtasks.spreadsheet_task import grist_failure_code, process_spreadsheet_operation_now
from plane.db.models import Project, SpreadsheetDocument, SpreadsheetOperation


def test_grist_failure_code_preserves_safe_http_status():
    response = requests.Response()
    response.status_code = 404
    error = requests.HTTPError(response=response)

    assert grist_failure_code(error) == "grist_http_404"


def test_grist_failure_code_classifies_connectivity_without_error_details():
    assert grist_failure_code(requests.ConnectionError("private host")) == "grist_connection_failed"


def test_synchronous_operation_processor_is_not_a_celery_task():
    assert not hasattr(process_spreadsheet_operation_now, "delay")


def test_failed_operation_preserves_the_grist_error_instead_of_raising_a_name_error(monkeypatch):
    class OperationType:
        class Status:
            RUNNING = "running"
            COMPLETE = "complete"
            FAILED = "failed"

        class Kind:
            PROVISION = "provision"
            ARCHIVE = "archive"

    class Operation(OperationType):
        id = "operation-1"
        status = "pending"
        attempts = 0
        kind = OperationType.Kind.PROVISION

        def save(self, **_kwargs):
            pass

    spreadsheet = SimpleNamespace(
        grist_document_id="",
        status="provisioning",
        last_error_code="",
        save=lambda **_kwargs: None,
    )
    operation = Operation()
    operation.spreadsheet = spreadsheet

    monkeypatch.setattr(spreadsheet_task, "SpreadsheetOperation", OperationType)
    monkeypatch.setattr(spreadsheet_task.transaction, "atomic", nullcontext)
    monkeypatch.setattr(spreadsheet_task, "GristClient", lambda: (_ for _ in ()).throw(requests.ConnectionError()))

    with pytest.raises(requests.ConnectionError):
        process_spreadsheet_operation_now(operation)

    assert spreadsheet.last_error_code == "grist_connection_failed"


def test_archiving_an_unprovisioned_sheet_completes_without_calling_grist(monkeypatch):
    class OperationType:
        class Status:
            RUNNING = "running"
            COMPLETE = "complete"
            FAILED = "failed"

        class Kind:
            PROVISION = "provision"
            DUPLICATE = "duplicate"
            RENAME = "rename"
            RECONCILE_ACCESS = "reconcile_access"
            ARCHIVE = "archive"

    class Operation(OperationType):
        id = "operation-1"
        status = "pending"
        attempts = 0
        kind = OperationType.Kind.ARCHIVE

        def save(self, **_kwargs):
            pass

    spreadsheet = SimpleNamespace(
        grist_document_id=None,
        status="archiving",
        last_error_code="",
        grist_form_view_id=None,
        grist_form_view_section_id=None,
        grist_permissions={},
        save=lambda **_kwargs: None,
    )
    operation = Operation()
    operation.spreadsheet = spreadsheet

    monkeypatch.setattr(spreadsheet_task, "SpreadsheetOperation", OperationType)
    monkeypatch.setattr(
        spreadsheet_task,
        "SpreadsheetDocument",
        SimpleNamespace(Status=SimpleNamespace(ARCHIVED="archived", DEGRADED="degraded")),
    )
    monkeypatch.setattr(spreadsheet_task.transaction, "atomic", nullcontext)
    monkeypatch.setattr(spreadsheet_task, "GristClient", lambda: (_ for _ in ()).throw(AssertionError("Grist called")))

    process_spreadsheet_operation_now(operation)

    assert spreadsheet.status == "archived"
    assert operation.status == OperationType.Status.COMPLETE


@pytest.mark.django_db(transaction=True)
def test_archive_operation_loaded_by_id_completes_for_an_unprovisioned_sheet(monkeypatch, workspace, create_user):
    project = Project.objects.create(name="Sheets", identifier="SH", workspace=workspace, created_by=create_user)
    spreadsheet = SpreadsheetDocument.objects.create(
        workspace=workspace,
        project=project,
        name="Never provisioned",
        status=SpreadsheetDocument.Status.ARCHIVING,
        created_by=create_user,
    )
    operation = SpreadsheetOperation.objects.create(
        spreadsheet=spreadsheet,
        kind=SpreadsheetOperation.Kind.ARCHIVE,
        idempotency_key="archive-never-provisioned",
    )
    monkeypatch.setattr(spreadsheet_task, "GristClient", lambda: (_ for _ in ()).throw(AssertionError("Grist called")))

    process_spreadsheet_operation_now(str(operation.id))

    spreadsheet.refresh_from_db()
    operation.refresh_from_db()
    assert spreadsheet.status == SpreadsheetDocument.Status.ARCHIVED
    assert spreadsheet.deleted_at is not None
    assert operation.status == SpreadsheetOperation.Status.COMPLETE
    assert SpreadsheetDocument.objects.create(
        workspace=workspace,
        project=project,
        name="Never provisioned",
        created_by=create_user,
    )
