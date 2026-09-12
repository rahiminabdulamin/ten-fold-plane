# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only

import pytest

from plane.integrations.grist import GristClient, GristConfigurationError


@pytest.mark.unit
def test_grist_client_requires_an_internal_http_url(settings):
    settings.GRIST_INTERNAL_URL = "https://public.example.com"

    with pytest.raises(GristConfigurationError):
        GristClient()


@pytest.mark.unit
def test_grist_client_builds_allowlisted_document_paths(settings):
    settings.GRIST_INTERNAL_URL = "http://grist:8484"
    settings.GRIST_INTERNAL_SECRET = "test-secret"
    client = GristClient()

    assert client.document_path("doc_123", "/tables") == "/api/docs/doc_123/tables"

    with pytest.raises(ValueError):
        client.document_path("../admin", "/tables")


@pytest.mark.unit
def test_grist_client_resolves_numeric_table_ref(settings, monkeypatch):
    settings.GRIST_INTERNAL_URL = "http://grist:8484"
    client = GristClient()
    monkeypatch.setattr(
        client,
        "document_api",
        lambda *args, **kwargs: {"records": [{"id": 9, "fields": {"tableId": "Orders"}}]},
    )

    assert client.table_ref("doc_123", "Orders") == 9


@pytest.mark.unit
def test_create_document_accepts_scalar_document_id(settings, monkeypatch):
    settings.GRIST_INTERNAL_URL = "http://grist:8484"
    client = GristClient()
    monkeypatch.setattr(client, "request", lambda *args, **kwargs: 123)

    assert client.create_document("Budget", 1) == "123"
