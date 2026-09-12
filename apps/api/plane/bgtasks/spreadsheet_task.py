# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only

import logging

import requests
from celery import shared_task
from django.conf import settings
from django.db import transaction

from plane.db.models import ProjectMember, SpreadsheetDocument, SpreadsheetOperation
from plane.integrations.grist import GristClient, GristConfigurationError


logger = logging.getLogger(__name__)


def grist_failure_code(error):
    if isinstance(error, GristConfigurationError):
        return "grist_configuration_error"
    if isinstance(error, requests.Timeout):
        return "grist_timeout"
    if isinstance(error, requests.ConnectionError):
        return "grist_connection_failed"
    if isinstance(error, requests.HTTPError) and error.response is not None:
        return f"grist_http_{error.response.status_code}"
    return f"grist_internal_{type(error).__name__.lower()}"[:64]


def _roles(spreadsheet):
    roles = {20: "owners", 15: "editors", 5: "viewers"}
    return {
        member.member.email: roles.get(member.role, "viewers")
        for member in ProjectMember.objects.filter(project=spreadsheet.project, is_active=True).select_related("member")
    }


def _permission_delta(spreadsheet):
    current = _roles(spreadsheet)
    return current, {**{email: None for email in spreadsheet.grist_permissions if email not in current}, **current}


def process_spreadsheet_operation_now(operation_id):
    with transaction.atomic():
        operation = (
            SpreadsheetOperation.objects.select_for_update().select_related("spreadsheet__project").get(id=operation_id)
        )
        if operation.status in {SpreadsheetOperation.Status.RUNNING, SpreadsheetOperation.Status.COMPLETE}:
            return
        operation.status = SpreadsheetOperation.Status.RUNNING
        operation.attempts += 1
        operation.save(update_fields=["status", "attempts", "updated_at"])

    spreadsheet = operation.spreadsheet
    try:
        client = GristClient()
        if operation.kind == SpreadsheetOperation.Kind.PROVISION:
            if not spreadsheet.grist_document_id:
                spreadsheet.grist_document_id = client.create_document(spreadsheet.name, settings.GRIST_WORKSPACE_ID)
                spreadsheet.save(update_fields=["grist_document_id", "updated_at"])
            current, delta = _permission_delta(spreadsheet)
            client.update_permissions(spreadsheet.grist_document_id, delta)
            spreadsheet.grist_permissions = current
            spreadsheet.status = SpreadsheetDocument.Status.READY
        elif operation.kind == SpreadsheetOperation.Kind.DUPLICATE:
            if not spreadsheet.grist_document_id:
                spreadsheet.grist_document_id = client.copy_document(
                    operation.payload["source_document_id"], spreadsheet.name, settings.GRIST_WORKSPACE_ID
                )
                spreadsheet.save(update_fields=["grist_document_id", "updated_at"])
            current, delta = _permission_delta(spreadsheet)
            client.update_permissions(spreadsheet.grist_document_id, delta)
            spreadsheet.grist_permissions = current
            spreadsheet.status = SpreadsheetDocument.Status.READY
        elif operation.kind == SpreadsheetOperation.Kind.RENAME:
            client.rename_document(spreadsheet.grist_document_id, spreadsheet.name)
            spreadsheet.status = SpreadsheetDocument.Status.READY
        elif operation.kind == SpreadsheetOperation.Kind.RECONCILE_ACCESS:
            current, delta = _permission_delta(spreadsheet)
            client.update_permissions(spreadsheet.grist_document_id, delta)
            spreadsheet.grist_permissions = current
            spreadsheet.status = SpreadsheetDocument.Status.READY
        elif operation.kind == SpreadsheetOperation.Kind.ARCHIVE:
            client.archive_document(spreadsheet.grist_document_id)
            spreadsheet.status = SpreadsheetDocument.Status.ARCHIVED
        spreadsheet.last_error_code = ""
        spreadsheet.save(
            update_fields=["grist_document_id", "grist_permissions", "status", "last_error_code", "updated_at"]
        )
        operation.status = SpreadsheetOperation.Status.COMPLETE
        operation.last_error_code = ""
        operation.save(update_fields=["status", "last_error_code", "updated_at"])
    except Exception as error:
        logger.exception("Spreadsheet operation %s failed", operation_id)
        spreadsheet.status = SpreadsheetDocument.Status.DEGRADED
        spreadsheet.last_error_code = grist_failure_code(error)
        spreadsheet.save(update_fields=["status", "last_error_code", "updated_at"])
        operation.status = SpreadsheetOperation.Status.FAILED
        operation.last_error_code = spreadsheet.last_error_code
        operation.save(update_fields=["status", "last_error_code", "updated_at"])
        raise


@shared_task(autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={"max_retries": 5})
def process_spreadsheet_operation(operation_id):
    return process_spreadsheet_operation_now(operation_id)
