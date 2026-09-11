# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only

import pytest

from plane.api.views.spreadsheet import _structural_actions, _validate_agent_payload


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
def test_delete_records_are_bounded_unique_positive_integers():
    _validate_agent_payload("delete_records", {"record_ids": [1, 2]})
    for invalid in ([1, 1], [0], ["1"], list(range(1, 52))):
        with pytest.raises(ValueError):
            _validate_agent_payload("delete_records", {"record_ids": invalid})
