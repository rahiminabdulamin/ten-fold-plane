import requests
import pytest
from contextlib import nullcontext
from types import SimpleNamespace

from plane.bgtasks import spreadsheet_task
from plane.bgtasks.spreadsheet_task import grist_failure_code, process_spreadsheet_operation_now


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
