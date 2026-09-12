# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only

import uuid

from django.db import models
from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .base import BaseModel
from .workspace import WorkspaceBaseModel
from .project import ProjectMember


class SpreadsheetDocument(WorkspaceBaseModel):
    class DocumentType(models.TextChoices):
        SHEET = "sheet", "Sheet"
        FORM = "form", "Form"

    class Status(models.TextChoices):
        PROVISIONING = "provisioning", "Provisioning"
        READY = "ready", "Ready"
        DEGRADED = "degraded", "Degraded"
        ARCHIVING = "archiving", "Archiving"
        ARCHIVED = "archived", "Archived"

    name = models.CharField(max_length=255)
    document_type = models.CharField(max_length=8, choices=DocumentType.choices, default=DocumentType.SHEET)
    grist_document_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    grist_form_view_section_id = models.PositiveIntegerField(null=True, blank=True)
    grist_form_view_id = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PROVISIONING)
    last_error_code = models.CharField(max_length=64, blank=True)
    grist_permissions = models.JSONField(default=dict)

    class Meta:
        db_table = "spreadsheet_documents"
        constraints = [
            models.UniqueConstraint(
                fields=["project", "name"],
                condition=models.Q(deleted_at__isnull=True),
                name="spreadsheet_unique_active_project_name",
            )
        ]


class SpreadsheetOperation(BaseModel):
    class Kind(models.TextChoices):
        PROVISION = "provision", "Provision"
        RENAME = "rename", "Rename"
        DUPLICATE = "duplicate", "Duplicate"
        RECONCILE_ACCESS = "reconcile_access", "Reconcile access"
        ARCHIVE = "archive", "Archive"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        COMPLETE = "complete", "Complete"
        FAILED = "failed", "Failed"

    spreadsheet = models.ForeignKey(SpreadsheetDocument, on_delete=models.CASCADE, related_name="operations")
    kind = models.CharField(max_length=24, choices=Kind.choices)
    payload = models.JSONField(default=dict)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    attempts = models.PositiveSmallIntegerField(default=0)
    available_at = models.DateTimeField(auto_now_add=True)
    idempotency_key = models.CharField(max_length=255, unique=True)
    last_error_code = models.CharField(max_length=64, blank=True)

    class Meta:
        db_table = "spreadsheet_operations"


class SpreadsheetFormPublication(BaseModel):
    class Access(models.TextChoices):
        PUBLIC = "public", "Public"
        AUTHENTICATED = "authenticated", "Authenticated"

    spreadsheet = models.ForeignKey(SpreadsheetDocument, on_delete=models.CASCADE, related_name="form_publications")
    view_section_id = models.PositiveIntegerField()
    share_key = models.CharField(max_length=255)
    access = models.CharField(max_length=16, choices=Access.choices, default=Access.PUBLIC)
    enabled = models.BooleanField(default=True)

    class Meta:
        db_table = "spreadsheet_form_publications"
        constraints = [
            models.UniqueConstraint(
                fields=["spreadsheet", "view_section_id"],
                condition=models.Q(deleted_at__isnull=True),
                name="spreadsheet_unique_active_form_section",
            )
        ]


class SpreadsheetAgentExecution(BaseModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        COMPLETE = "complete", "Complete"
        UNCERTAIN = "uncertain", "Uncertain"

    spreadsheet = models.ForeignKey(SpreadsheetDocument, on_delete=models.CASCADE, related_name="agent_executions")
    user = models.ForeignKey("db.User", null=True, on_delete=models.SET_NULL)
    operation = models.CharField(max_length=32)
    payload = models.JSONField(default=dict)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    idempotency_key = models.CharField(max_length=255)
    result = models.JSONField(null=True)

    class Meta:
        db_table = "spreadsheet_agent_executions"
        constraints = [
            models.UniqueConstraint(
                fields=["spreadsheet", "user", "idempotency_key"], name="spreadsheet_unique_agent_execution"
            )
        ]


def _queue_access_reconciliation(project_id):
    from plane.bgtasks.spreadsheet_task import process_spreadsheet_operation

    for spreadsheet in SpreadsheetDocument.objects.filter(
        project_id=project_id, status=SpreadsheetDocument.Status.READY
    ):
        operation = SpreadsheetOperation.objects.create(
            spreadsheet=spreadsheet,
            kind=SpreadsheetOperation.Kind.RECONCILE_ACCESS,
            idempotency_key=f"access:{spreadsheet.id}:{uuid.uuid4()}",
        )
        process_spreadsheet_operation.delay(str(operation.id))


@receiver(post_save, sender=ProjectMember)
@receiver(post_delete, sender=ProjectMember)
def reconcile_spreadsheet_access(sender, instance, **kwargs):
    transaction.on_commit(lambda: _queue_access_reconciliation(instance.project_id))
