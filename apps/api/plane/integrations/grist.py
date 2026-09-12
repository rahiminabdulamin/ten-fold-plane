# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only

import re
from urllib.parse import urlparse

import requests
from django.conf import settings


class GristConfigurationError(RuntimeError):
    pass


class GristClient:
    _ID = re.compile(r"^[A-Za-z0-9_-]+$")

    def __init__(self):
        self.base_url = getattr(settings, "GRIST_INTERNAL_URL", "")
        parsed = urlparse(self.base_url)
        if parsed.scheme != "http" or parsed.hostname not in {"grist", "localhost", "127.0.0.1"}:
            raise GristConfigurationError("GRIST_INTERNAL_URL must be a private HTTP endpoint")
        self.secret = getattr(settings, "GRIST_INTERNAL_SECRET", "")

    def document_path(self, document_id, suffix=""):
        if not self._ID.fullmatch(document_id) or not suffix.startswith("/"):
            raise ValueError("Invalid Grist document path")
        return f"/api/docs/{document_id}{suffix}"

    def request(self, method, path, *, json=None, timeout=15):
        if not path.startswith("/") or ".." in path:
            raise ValueError("Invalid Grist path")
        response = requests.request(
            method,
            f"{self.base_url}{path}",
            json=json,
            timeout=timeout,
            headers={
                "X-Ten-Fold-Internal-Secret": self.secret,
                "X-Ten-Fold-User": "spreadsheet-system@tenfold.internal",
            },
        )
        response.raise_for_status()
        return response.json() if response.content else None

    def create_document(self, name, workspace_id):
        result = self.request("POST", f"/api/workspaces/{int(workspace_id)}/docs", json={"name": name})
        return self._document_id(result)

    def copy_document(self, document_id, name, workspace_id):
        result = self.request(
            "POST",
            "/api/docs",
            json={"sourceDocumentId": document_id, "workspaceId": int(workspace_id), "documentName": name},
        )
        return self._document_id(result)

    @staticmethod
    def _document_id(result):
        document_id = result.get("id") if isinstance(result, dict) else result
        if not isinstance(document_id, (str, int)):
            raise GristConfigurationError("Grist returned an invalid document id")
        return str(document_id)

    def rename_document(self, document_id, name):
        return self.request("PATCH", self.document_path(document_id, ""), json={"name": name})

    def archive_document(self, document_id):
        return self.request("DELETE", self.document_path(document_id, ""))

    def update_permissions(self, document_id, users):
        return self.request("PATCH", self.document_path(document_id, "/access"), json={"delta": {"users": users}})

    def create_form_view(self, document_id, table_id="Table1"):
        table_ref = self.table_ref(document_id, table_id)
        self.document_api(
            "POST",
            document_id,
            "/apply",
            payload=[["CreateViewSection", table_ref, 0, "form", None, None]],
        )
        sections = self.document_api("GET", document_id, "/tables/_grist_Views_section/records")
        form_sections = [
            record
            for record in sections.get("records", [])
            if record.get("fields", {}).get("tableRef") == table_ref
            and record.get("fields", {}).get("parentKey") == "form"
        ]
        if not form_sections:
            raise GristConfigurationError("Grist did not create a form view")
        section = max(form_sections, key=lambda record: int(record["id"]))
        view_id = section.get("fields", {}).get("parentId")
        if not isinstance(view_id, int) or view_id <= 0:
            raise GristConfigurationError("Grist created a form without an editor page")
        return view_id, int(section["id"])

    def form_view_id(self, document_id, section_id):
        sections = self.document_api("GET", document_id, "/tables/_grist_Views_section/records")
        for record in sections.get("records", []):
            if int(record.get("id", 0)) == int(section_id):
                view_id = record.get("fields", {}).get("parentId")
                if isinstance(view_id, int) and view_id > 0:
                    return view_id
        raise GristConfigurationError("Grist form editor page was not found")

    def document_api(self, method, document_id, suffix, *, payload=None):
        return self.request(method, self.document_path(document_id, suffix), json=payload)

    def table_ref(self, document_id, table_id):
        result = self.document_api("GET", document_id, "/tables/_grist_Tables/records")
        for record in result.get("records", []):
            if record.get("fields", {}).get("tableId") == table_id:
                return int(record["id"])
        raise ValueError("Unknown table")
