# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only

import pytest

from plane.api.views.spreadsheet import (
    _can_recover_provisioning_operation,
    _grist_authorization_document_id,
    _grist_document_id_from_path,
    _structural_actions,
    _validate_agent_payload,
)
from plane.integrations.grist import GristClient
from plane.db.models import SpreadsheetOperation


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
                    {"id": 9, "fields": {"tableRef": 7, "parentKey": "form"}},
                ]
            }

    monkeypatch.setattr(client, "document_api", document_api)

    assert client.create_form_view("document") == 9
    assert calls[0] == (
        "POST",
        "document",
        "/apply",
        [["CreateViewSection", 7, 0, "form", None, None]],
    )


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
