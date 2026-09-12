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

    def document_api(self, method, document_id, suffix, *, payload=None):
        return self.request(method, self.document_path(document_id, suffix), json=payload)

    def table_ref(self, document_id, table_id):
        result = self.document_api("GET", document_id, "/tables/_grist_Tables/records")
        for record in result.get("records", []):
            if record.get("fields", {}).get("tableId") == table_id:
                return int(record["id"])
        raise ValueError("Unknown table")
