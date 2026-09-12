# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only

import pytest
from types import SimpleNamespace
from unittest.mock import Mock
from plane.api.views import spreadsheet as spreadsheet_views

from plane.api.views.spreadsheet import (
    _can_recover_provisioning_operation,
    _duplicate_document_fields,
    _form_branding_css,
    _grist_authorization_document_id,
    _grist_document_id_from_path,
    _publication_values,
    _structural_actions,
    _validate_agent_payload,
)
from plane.integrations.grist import GristClient
from plane.db.models import SpreadsheetDocument, SpreadsheetOperation


@pytest.mark.unit
def test_formula_action_is_built_from_allowlisted_fields():
    assert _structural_actions(
        "set_formula",
        {"table": "Orders", "column": "Total", "type": "Numeric", "formula": "$Quantity * $Price"},
    ) == [[
        "ModifyColumn",
        "Orders",
        "Total",
        {"type": "Numeric", "isFormula": True, "formula": "$Quantity * $Price"},
    ]]


@pytest.mark.unit
def test_structural_actions_reject_arbitrary_grist_actions():
    with pytest.raises(ValueError):
        _structural_actions("create_table", {"table": "../Secrets", "actions": [["RemoveTable", "Users"]]})


@pytest.mark.unit
def test_view_uses_numeric_table_reference():
    assert _structural_actions("create_form", {"table": "Orders"}, table_ref=7) == [
        ["CreateViewSection", 7, 0, "form", None, None]
    ]


@pytest.mark.unit
def test_create_form_view_returns_the_new_form_section(monkeypatch):
    client = object.__new__(GristClient)
    monkeypatch.setattr(client, "table_ref", lambda *_: 7)
    calls = []

    def document_api(method, document_id, suffix, payload=None):
        calls.append((method, document_id, suffix, payload))
        if method == "GET":
            return {
                "records": [
                    {"id": 2, "fields": {"tableRef": 7, "parentKey": "record"}},
                    {"id": 9, "fields": {"tableRef": 7, "parentKey": "form", "parentId": 3}},
                ]
            }

    monkeypatch.setattr(client, "document_api", document_api)

    assert client.create_form_view("document") == (3, 9)
    assert calls[0] == (
        "POST",
        "document",
        "/apply",
        [["CreateViewSection", 7, 0, "form", None, None]],
    )


@pytest.mark.unit
def test_form_view_id_finds_an_existing_form_editor_page(monkeypatch):
    client = object.__new__(GristClient)
    monkeypatch.setattr(
        client,
        "document_api",
        lambda *_: {"records": [{"id": 9, "fields": {"parentId": 3}}]},
    )

    assert client.form_view_id("document", 9) == 3


@pytest.mark.unit
def test_delete_records_are_bounded_unique_positive_integers():
    _validate_agent_payload("delete_records", {"record_ids": [1, 2]})
    for invalid in ([1, 1], [0], ["1"], list(range(1, 52))):
        with pytest.raises(ValueError):
            _validate_agent_payload("delete_records", {"record_ids": invalid})


@pytest.mark.unit
def test_failed_provisioning_operation_can_be_retried_once():
    operation = type("Operation", (), {"status": SpreadsheetOperation.Status.FAILED})()

    assert _can_recover_provisioning_operation(operation)


def test_form_publication_defaults_to_the_document_section_and_a_secure_key():
    document = type("Document", (), {"grist_form_view_section_id": 17})()

    values = _publication_values(document, {"access": "authenticated"})

    assert values["view_section_id"] == 17
    assert values["access"] == "authenticated"
    assert len(values["share_key"]) >= 32


@pytest.mark.unit
def test_form_branding_css_uses_workspace_name_and_uploaded_logo():
    css = _form_branding_css("Brunei4AI", "/api/assets/v2/static/logo-id/")

    assert '--tenfold-form-team-name: "Brunei4AI";' in css
    assert '--tenfold-form-team-logo: url("/api/assets/v2/static/logo-id/");' in css


@pytest.mark.unit
def test_form_branding_preserves_unicode_and_escapes_css_strings():
    css = _form_branding_css('团队 "A"\nB', None)
    assert '团队 \\22 A\\22 \\a B' in css
    assert '--tenfold-form-team-logo: none;' in css


@pytest.mark.unit
@pytest.mark.parametrize("path,lookup", [
    ("/canonical12345/Form/f/4", "/api/docs/canonical12345"),
    ("/forms/native-key/4", "/api/docs/s.native-key"),
    ("/grist-public/forms/native-key/4", "/api/docs/s.native-key"),
])
def test_branding_resolves_native_shares_and_canonical_previews(monkeypatch, path, lookup):
    workspace = SimpleNamespace(name="Brunei4AI", logo_url="/api/assets/v2/static/logo/")
    documents = Mock()
    documents.select_related.return_value.filter.return_value.first.side_effect = [
        None, SimpleNamespace(workspace=workspace),
    ]
    publications = Mock()
    publications.select_related.return_value.filter.return_value.first.return_value = None
    monkeypatch.setattr(spreadsheet_views.SpreadsheetDocument, "objects", documents)
    monkeypatch.setattr(spreadsheet_views.SpreadsheetFormPublication, "objects", publications)

    def metadata(self, method, requested_path):
        assert (method, requested_path) == ("GET", lookup)
        return {"id": "full-document-id"}

    monkeypatch.setattr(GristClient, "__init__", lambda self: None)
    monkeypatch.setattr(GristClient, "request", metadata)
    assert spreadsheet_views._form_branding_workspace(path) is workspace
    assert documents.select_related.return_value.filter.call_args.kwargs["grist_document_id"] == "full-document-id"


def test_duplicate_preserves_the_source_document_type():
    source = type(
        "Document",
        (),
        {
            "document_type": SpreadsheetDocument.DocumentType.FORM,
            "grist_form_view_id": 4,
            "grist_form_view_section_id": 9,
        },
    )()

    assert _duplicate_document_fields(source) == {
        "document_type": SpreadsheetDocument.DocumentType.FORM,
        "grist_form_view_id": 4,
        "grist_form_view_section_id": 9,
    }


@pytest.mark.unit
@pytest.mark.parametrize(
    "path",
    [
        "/grist/doc/g31document?embed=true",
        "/grist/o/ten-fold/doc/g31document/p/1",
        "/grist/api/docs/g31document/tables/Table1/records",
        "/grist/o/ten-fold/api/docs/g31document/download",
        "/grist/o/ten-fold/api/worker/g31document",
        "/o/ten-fold/doc/g31document?embed=true",
        "/o/ten-fold/api/worker/g31document",
        "/dw/self/v/unknown/o/ten-fold/api/docs/g31document/tables",
        "/g31document1/TEST/f/11",
    ],
)
def test_grist_forward_auth_extracts_document_from_supported_paths(path):
    assert _grist_document_id_from_path(path) == "g31document"


@pytest.mark.unit
def test_grist_forward_auth_rejects_non_document_paths():
    assert _grist_document_id_from_path("/grist/") is None


def test_grist_forward_auth_uses_the_launch_document_for_session_routes():
    assert _grist_document_id_from_path("/grist/o/ten-fold/api/session/access/active") is None
    assert _grist_authorization_document_id(
        "/grist/o/ten-fold/api/session/access/active", {"document": "g31document"}
    ) == "g31document"


@pytest.mark.unit
def test_grist_canonical_document_url():
    assert _grist_document_id_from_path(
        "/grist/o/ten-fold/g31dmLkSY8WV/Untitled-spreadsheet-9?embed=true"
    ) == "g31dmLkSY8WV"
    assert _grist_document_id_from_path(
        "/o/ten-fold/g31dmLkSY8WV/Untitled-spreadsheet-9"
    ) == "g31dmLkSY8WV"


def test_grist_socket_authorization_requires_launch_context():
    path = "/dw/self/v/unknown/o/ten-fold?clientId=0&newClient=1"
    assert _grist_authorization_document_id(path, {"document": "g31document"}) == "g31document"
    assert _grist_authorization_document_id(path, {}) is None
    # A request for another document must check that document's membership.
    assert _grist_authorization_document_id(
        "/dw/self/v/unknown/o/ten-fold/api/docs/anotherDocument",
        {"document": "g31document"},
    ) == "anotherDocument"


def test_grist_launch_context_does_not_authorize_arbitrary_routes():
    for path in ["/admin", "/o/other/doc/123", "/o/ten-fold/api/orgs", "/dw/other/o/ten-fold"]:
        assert _grist_authorization_document_id(path, {"document": "g31document"}) is None
