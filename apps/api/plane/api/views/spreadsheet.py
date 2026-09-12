# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only

import re
import uuid
from datetime import timedelta
from urllib.parse import urlsplit

from django.conf import settings
from django.core import signing
from django.db import transaction
from django.utils import timezone
from django.http import HttpResponseNotFound, HttpResponseRedirect
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from plane.api.serializers import SpreadsheetDocumentSerializer, SpreadsheetFormPublicationSerializer
from plane.app.permissions import ProjectEntityPermission
from plane.bgtasks.spreadsheet_task import (
    grist_failure_code,
    process_spreadsheet_operation,
    process_spreadsheet_operation_now,
)
from plane.db.models import (
    ProjectMember,
    SpreadsheetAgentExecution,
    SpreadsheetDocument,
    SpreadsheetFormPublication,
    SpreadsheetOperation,
    Workspace,
)
from plane.integrations.grist import GristClient
from plane.authentication.session import BaseSessionAuthentication
from plane.api.middleware.api_authentication import APIKeyAuthentication
from .base import BaseAPIView


TABLE_ID = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
AGENT_OPERATIONS = {
    "add_records",
    "update_records",
    "delete_records",
    "create_table",
    "add_column",
    "update_column",
    "create_view",
    "create_form",
    "set_formula",
}


class SpreadsheetBaseEndpoint(BaseAPIView):
    authentication_classes = [BaseSessionAuthentication, APIKeyAuthentication]


def _document(slug, project_id, pk):
    return SpreadsheetDocument.objects.get(id=pk, workspace__slug=slug, project_id=project_id, deleted_at__isnull=True)


def _queue(spreadsheet, kind, payload=None, enqueue=True):
    operation = SpreadsheetOperation.objects.create(
        spreadsheet=spreadsheet,
        kind=kind,
        payload=payload or {},
        idempotency_key=f"{kind}:{spreadsheet.id}:{uuid.uuid4()}",
    )
    if enqueue:
        transaction.on_commit(lambda: process_spreadsheet_operation.delay(str(operation.id)))
    return operation


def _can_recover_provisioning_operation(operation):
    if not operation:
        return False
    if operation.status in {SpreadsheetOperation.Status.PENDING, SpreadsheetOperation.Status.FAILED}:
        return True
    return operation.status == SpreadsheetOperation.Status.RUNNING and operation.updated_at < timezone.now() - timedelta(
        seconds=30
    )


def _record_synchronous_failure(spreadsheet, error):
    spreadsheet.status = SpreadsheetDocument.Status.DEGRADED
    spreadsheet.last_error_code = grist_failure_code(error)
    spreadsheet.save(update_fields=["status", "last_error_code", "updated_at"])


class SpreadsheetListCreateEndpoint(SpreadsheetBaseEndpoint):
    permission_classes = [ProjectEntityPermission]

    def get(self, request, slug, project_id):
        items = SpreadsheetDocument.objects.filter(
            workspace__slug=slug, project_id=project_id, deleted_at__isnull=True
        ).exclude(status="archived")
        return Response(SpreadsheetDocumentSerializer(items, many=True).data)

    def post(self, request, slug, project_id):
        serializer = SpreadsheetDocumentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        workspace = Workspace.objects.get(slug=slug)
        spreadsheet = serializer.save(workspace=workspace, project_id=project_id)
        operation = _queue(spreadsheet, SpreadsheetOperation.Kind.PROVISION, enqueue=False)
        try:
            process_spreadsheet_operation_now(operation)
        except Exception as error:
            _record_synchronous_failure(spreadsheet, error)
        spreadsheet.refresh_from_db()
        if spreadsheet.status == SpreadsheetDocument.Status.PROVISIONING:
            spreadsheet.status = SpreadsheetDocument.Status.DEGRADED
            spreadsheet.last_error_code = "grist_unavailable"
            spreadsheet.save(update_fields=["status", "last_error_code", "updated_at"])
        if spreadsheet.status != SpreadsheetDocument.Status.READY:
            return Response(
                {"error": spreadsheet.last_error_code or "grist_unavailable"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(SpreadsheetDocumentSerializer(spreadsheet).data, status=status.HTTP_201_CREATED)


class SpreadsheetDetailEndpoint(SpreadsheetBaseEndpoint):
    permission_classes = [ProjectEntityPermission]

    def get(self, request, slug, project_id, pk):
        return Response(SpreadsheetDocumentSerializer(_document(slug, project_id, pk)).data)

    def patch(self, request, slug, project_id, pk):
        spreadsheet = _document(slug, project_id, pk)
        serializer = SpreadsheetDocumentSerializer(spreadsheet, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        _queue(spreadsheet, SpreadsheetOperation.Kind.RENAME)
        return Response(serializer.data)

    def delete(self, request, slug, project_id, pk):
        spreadsheet = _document(slug, project_id, pk)
        spreadsheet.status = SpreadsheetDocument.Status.ARCHIVING
        spreadsheet.save(update_fields=["status", "updated_at"])
        _queue(spreadsheet, SpreadsheetOperation.Kind.ARCHIVE)
        return Response(status=status.HTTP_202_ACCEPTED)


class SpreadsheetLaunchEndpoint(SpreadsheetBaseEndpoint):
    permission_classes = [ProjectEntityPermission]

    def post(self, request, slug, project_id, pk):
        spreadsheet = _document(slug, project_id, pk)
        if spreadsheet.status in {
            SpreadsheetDocument.Status.PROVISIONING,
            SpreadsheetDocument.Status.DEGRADED,
        }:
            operation = (
                spreadsheet.operations.filter(kind=SpreadsheetOperation.Kind.PROVISION).order_by("-created_at").first()
            )
            can_recover = _can_recover_provisioning_operation(operation)
            if can_recover:
                if operation.status == SpreadsheetOperation.Status.RUNNING:
                    operation.status = SpreadsheetOperation.Status.FAILED
                    operation.save(update_fields=["status", "updated_at"])
                try:
                    process_spreadsheet_operation_now(operation)
                except Exception as error:
                    _record_synchronous_failure(spreadsheet, error)
                spreadsheet.refresh_from_db()
            elif not operation or operation.status == SpreadsheetOperation.Status.COMPLETE:
                spreadsheet.status = SpreadsheetDocument.Status.DEGRADED
                spreadsheet.last_error_code = "grist_unavailable"
                spreadsheet.save(update_fields=["status", "last_error_code", "updated_at"])
        if spreadsheet.status != SpreadsheetDocument.Status.READY:
            return Response(
                {
                    "error": spreadsheet.last_error_code or "spreadsheet_not_ready",
                    "status": spreadsheet.status,
                },
                status=409,
            )
        return Response({"url": f"{settings.GRIST_PUBLIC_BASE_PATH}/doc/{spreadsheet.grist_document_id}?embed=true"})


class SpreadsheetDuplicateEndpoint(SpreadsheetBaseEndpoint):
    permission_classes = [ProjectEntityPermission]

    def post(self, request, slug, project_id, pk):
        source = _document(slug, project_id, pk)
        if source.status != SpreadsheetDocument.Status.READY:
            return Response({"error": "spreadsheet_not_ready"}, status=409)
        name = str(request.data.get("name", f"{source.name} copy")).strip()[:255]
        spreadsheet = SpreadsheetDocument.objects.create(
            workspace=source.workspace, project=source.project, name=name, created_by=request.user
        )
        _queue(
            spreadsheet,
            SpreadsheetOperation.Kind.DUPLICATE,
            {"source_document_id": source.grist_document_id},
        )
        return Response(SpreadsheetDocumentSerializer(spreadsheet).data, status=202)


class SpreadsheetFormsEndpoint(SpreadsheetBaseEndpoint):
    permission_classes = [ProjectEntityPermission]

    def get(self, request, slug, project_id, pk):
        spreadsheet = _document(slug, project_id, pk)
        return Response(
            SpreadsheetFormPublicationSerializer(
                spreadsheet.form_publications.filter(deleted_at__isnull=True), many=True
            ).data
        )

    def post(self, request, slug, project_id, pk):
        spreadsheet = _document(slug, project_id, pk)
        share_key = str(request.data.get("share_key", ""))
        if not re.fullmatch(r"[A-Za-z0-9_-]{8,255}", share_key):
            return Response({"error": "invalid_share_key"}, status=400)
        serializer = SpreadsheetFormPublicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        publication = serializer.save(spreadsheet=spreadsheet, share_key=share_key)
        return Response(SpreadsheetFormPublicationSerializer(publication).data, status=201)


class SpreadsheetFormDetailEndpoint(SpreadsheetBaseEndpoint):
    permission_classes = [ProjectEntityPermission]

    def _publication(self, slug, project_id, pk, publication_id):
        spreadsheet = _document(slug, project_id, pk)
        return spreadsheet.form_publications.get(id=publication_id, deleted_at__isnull=True)

    def patch(self, request, slug, project_id, pk, publication_id):
        publication = self._publication(slug, project_id, pk, publication_id)
        serializer = SpreadsheetFormPublicationSerializer(publication, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, slug, project_id, pk, publication_id):
        publication = self._publication(slug, project_id, pk, publication_id)
        publication.delete()
        return Response(status=204)


class SpreadsheetAgentEndpoint(SpreadsheetBaseEndpoint):
    permission_classes = [ProjectEntityPermission]

    def post(self, request, slug, project_id, pk, action):
        spreadsheet = _document(slug, project_id, pk)
        if spreadsheet.status != SpreadsheetDocument.Status.READY:
            return Response({"error": "spreadsheet_not_ready"}, status=409)
        if action == "query":
            table = request.data.get("table", "")
            if not TABLE_ID.fullmatch(table):
                return Response({"error": "invalid_table"}, status=400)
            limit = min(max(int(request.data.get("limit", 50)), 1), 100)
            return Response(
                GristClient().document_api(
                    "GET", spreadsheet.grist_document_id, f"/tables/{table}/records?limit={limit}"
                )
            )
        if action == "preview":
            operation = request.data.get("operation")
            payload = request.data.get("payload", {})
            if operation not in AGENT_OPERATIONS:
                return Response({"error": "unsupported_operation"}, status=400)
            try:
                _validate_agent_payload(operation, payload)
            except (TypeError, ValueError):
                return Response({"error": "invalid_payload"}, status=400)
            idempotency_key = str(request.data.get("idempotency_key") or uuid.uuid4())[:255]
            execution, _ = SpreadsheetAgentExecution.objects.get_or_create(
                spreadsheet=spreadsheet,
                user=request.user,
                idempotency_key=idempotency_key,
                defaults={"operation": operation, "payload": payload},
            )
            if execution.operation != operation or execution.payload != payload:
                return Response({"error": "idempotency_key_reused"}, status=409)
            token = signing.dumps({"execution": str(execution.id)}, salt="spreadsheet-agent")
            return Response({"preview_token": token, "operation": operation, "payload": payload, "expires_in": 300})
        if action == "execute":
            try:
                preview = signing.loads(request.data.get("preview_token", ""), salt="spreadsheet-agent", max_age=300)
            except signing.BadSignature:
                return Response({"error": "invalid_or_expired_preview"}, status=400)
            with transaction.atomic():
                execution = (
                    SpreadsheetAgentExecution.objects.select_for_update()
                    .filter(id=preview.get("execution"), spreadsheet=spreadsheet, user=request.user)
                    .first()
                )
                if not execution:
                    return Response({"error": "preview_scope_mismatch"}, status=403)
                if execution.status == SpreadsheetAgentExecution.Status.COMPLETE:
                    return Response(execution.result)
                if execution.status != SpreadsheetAgentExecution.Status.PENDING:
                    return Response({"error": "execution_outcome_uncertain"}, status=409)
                execution.status = SpreadsheetAgentExecution.Status.RUNNING
                execution.save(update_fields=["status", "updated_at"])
                execution_operation = execution.operation
                execution_payload = execution.payload
            try:
                result = _execute_agent(
                    GristClient(), spreadsheet.grist_document_id, execution_operation, execution_payload
                )
            except (TypeError, ValueError):
                execution.status = SpreadsheetAgentExecution.Status.PENDING
                execution.save(update_fields=["status", "updated_at"])
                return Response({"error": "invalid_payload"}, status=400)
            except Exception:
                # A lost Grist response may hide an applied write. Mark it for
                # reconciliation and never replay it automatically.
                execution.status = SpreadsheetAgentExecution.Status.UNCERTAIN
                execution.save(update_fields=["status", "updated_at"])
                raise
            with transaction.atomic():
                execution = SpreadsheetAgentExecution.objects.select_for_update().get(id=execution.id)
                execution.result = result
                execution.status = SpreadsheetAgentExecution.Status.COMPLETE
                execution.save(update_fields=["result", "status", "updated_at"])
            return Response(result)
        return Response({"error": "unsupported_action"}, status=404)


class GristForwardAuthEndpoint(SpreadsheetBaseEndpoint):
    def get(self, request):
        path = urlsplit(request.headers.get("X-Forwarded-Uri", "")).path
        match = re.fullmatch(r"/grist/(?:doc|api/docs)/([A-Za-z0-9_-]+)(?:/.*)?", path)
        if not match:
            match = re.fullmatch(r"/grist/o/docs/([A-Za-z0-9_-]+)(?:/.*)?", path)
        if not match:
            return Response({"error": "document_required"}, status=403)
        spreadsheet = SpreadsheetDocument.objects.filter(
            grist_document_id=match.group(1), status=SpreadsheetDocument.Status.READY
        ).first()
        if (
            not spreadsheet
            or not ProjectMember.objects.filter(
                project=spreadsheet.project, member=request.user, is_active=True
            ).exists()
        ):
            return Response({"error": "forbidden"}, status=403)
        response = Response(status=204)
        response["X-Ten-Fold-User"] = request.user.email
        response["X-Ten-Fold-Name"] = request.user.display_name or request.user.email
        return response


class GristPublicFormAuthEndpoint(SpreadsheetBaseEndpoint):
    permission_classes = [AllowAny]

    def get(self, request):
        path = urlsplit(request.headers.get("X-Forwarded-Uri", "")).path
        match = re.fullmatch(r"/grist-public/forms/([A-Za-z0-9_-]+)/([0-9]+)(?:/.*)?", path)
        if not match:
            return Response({"error": "form_required"}, status=403)
        try:
            capability = signing.loads(
                request.COOKIES.get("tenfold_form_capability", ""), salt="spreadsheet-form", max_age=300
            )
        except signing.BadSignature:
            return Response({"error": "invalid_or_expired_form_link"}, status=403)
        publication = (
            SpreadsheetFormPublication.objects.select_related("spreadsheet__project")
            .filter(
                id=capability.get("publication"),
                share_key=match.group(1),
                view_section_id=int(match.group(2)),
                enabled=True,
                deleted_at__isnull=True,
                spreadsheet__status=SpreadsheetDocument.Status.READY,
            )
            .first()
        )
        if not publication:
            return Response({"error": "form_not_found"}, status=403)
        if publication.access == SpreadsheetFormPublication.Access.AUTHENTICATED and (
            not request.user.is_authenticated
            or not ProjectMember.objects.filter(
                project=publication.spreadsheet.project, member=request.user, is_active=True
            ).exists()
        ):
            return Response({"error": "forbidden"}, status=403)
        return Response(status=204)


def _execute_agent(client, document_id, operation, payload):
    _validate_agent_payload(operation, payload)
    table = payload.get("table", "")
    if operation in {"add_records", "update_records", "delete_records"} and not TABLE_ID.fullmatch(table):
        raise ValueError("Invalid table")
    records = payload.get("records", [])
    if operation == "add_records":
        return client.document_api("POST", document_id, f"/tables/{table}/records", payload={"records": records})
    if operation == "update_records":
        return client.document_api("PATCH", document_id, f"/tables/{table}/records", payload={"records": records})
    if operation == "delete_records":
        return client.document_api(
            "POST", document_id, f"/tables/{table}/records/delete", payload=payload.get("record_ids", [])
        )
    table_ref = client.table_ref(document_id, table) if operation in {"create_view", "create_form"} else None
    actions = _structural_actions(operation, payload, table_ref=table_ref)
    return client.document_api("POST", document_id, "/apply", payload=actions)


def _identifier(value):
    if not isinstance(value, str) or not TABLE_ID.fullmatch(value):
        raise ValueError("Invalid identifier")
    return value


def _column_options(payload):
    allowed_types = {
        "Any",
        "Text",
        "Numeric",
        "Int",
        "Bool",
        "Date",
        "DateTime",
        "Choice",
        "ChoiceList",
        "Ref",
        "RefList",
        "Attachments",
    }
    column_type = payload.get("type", "Any")
    if column_type.split(":", 1)[0] not in allowed_types:
        raise ValueError("Invalid column type")
    options = {"type": column_type, "isFormula": False}
    if "label" in payload:
        options["label"] = str(payload["label"])[:255]
    if "formula" in payload:
        options.update({"formula": str(payload["formula"])[:10000], "isFormula": True})
    return options


def _validate_agent_payload(operation, payload):
    if not isinstance(payload, dict) or len(str(payload)) > 100_000:
        raise ValueError("Invalid payload")
    if operation in {"add_records", "update_records"}:
        records = payload.get("records", [])
        if not isinstance(records, list) or len(records) > 50:
            raise ValueError("A maximum of 50 records may be changed")
    if operation == "delete_records":
        record_ids = payload.get("record_ids", [])
        if (
            not isinstance(record_ids, list)
            or len(record_ids) > 50
            or len(record_ids) != len(set(record_ids))
            or any(not isinstance(record_id, int) or record_id <= 0 for record_id in record_ids)
        ):
            raise ValueError("Invalid record ids")


def _structural_actions(operation, payload, table_ref=None):
    table = _identifier(payload.get("table", ""))
    if operation == "create_table":
        columns = payload.get("columns", [])
        if not isinstance(columns, list) or len(columns) > 20:
            raise ValueError("Invalid columns")
        return [
            [
                "AddTable",
                table,
                [{"id": _identifier(column.get("id", "")), **_column_options(column)} for column in columns],
            ]
        ]
    if operation == "add_column":
        return [["AddColumn", table, _identifier(payload.get("column", "")), _column_options(payload)]]
    if operation in {"update_column", "set_formula"}:
        return [["ModifyColumn", table, _identifier(payload.get("column", "")), _column_options(payload)]]
    if operation in {"create_view", "create_form"}:
        if not isinstance(table_ref, int) or table_ref <= 0:
            raise ValueError("Table reference required")
        return [["CreateViewSection", table_ref, 0, "form" if operation == "create_form" else "record", None, None]]
    raise ValueError("Unsupported structural operation")


def published_spreadsheet_form(request, publication_id):
    publication = (
        SpreadsheetFormPublication.objects.select_related("spreadsheet__project")
        .filter(
            id=publication_id,
            enabled=True,
            deleted_at__isnull=True,
            spreadsheet__status=SpreadsheetDocument.Status.READY,
        )
        .first()
    )
    if not publication:
        return HttpResponseNotFound("Form not found")
    if publication.access == SpreadsheetFormPublication.Access.AUTHENTICATED:
        if (
            not request.user.is_authenticated
            or not ProjectMember.objects.filter(
                project=publication.spreadsheet.project, member=request.user, is_active=True
            ).exists()
        ):
            return HttpResponseNotFound("Form not found")
    response = HttpResponseRedirect(f"/grist-public/forms/{publication.share_key}/{publication.view_section_id}")
    response.set_cookie(
        "tenfold_form_capability",
        signing.dumps({"publication": str(publication.id)}, salt="spreadsheet-form"),
        max_age=300,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="Lax",
        path="/grist-public/",
    )
    return response
