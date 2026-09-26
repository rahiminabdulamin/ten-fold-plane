# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only

import pytest
from django.template.loader import get_template, render_to_string


@pytest.mark.unit
def test_issue_updates_email_uses_ten_fold_branding_without_plane_social_links():
    html = render_to_string(
        "emails/notifications/issue-updates.html",
        {
            "entity_type": "issue",
            "issue": {"issue_identifier": "ENG-1", "name": "Example"},
            "workspace": "Acme",
            "project": "Engineering",
            "project_url": "https://ten-fold.co/acme/projects/engineering",
            "issue_url": "https://ten-fold.co/acme/issues/eng-1",
            "actors_involved": 1,
            "summary": "Updates were made by",
            "data": [],
            "comments": [],
            "receiver": {"email": "user@example.com"},
            "user_preference": "https://ten-fold.co/profile/preferences",
        },
    )

    assert "https://ten-fold.co/branding/tenfold-rebrand-logo-white.png" in html
    assert 'alt="Ten-Fold"' in html
    for legacy_reference in ("Plane", "plane", "makeplane", "planepowers"):
        assert legacy_reference not in html

    assert "plane" not in get_template("emails/notifications/issue-updates.html").template.source.lower()


@pytest.mark.unit
def test_issue_updates_email_is_monochrome_except_for_primary_blue_actions():
    source = get_template("emails/notifications/issue-updates.html").template.source

    assert 'class="email-brand-header"' in source
    assert ".email-brand-header { background-color: #3e63dd !important; }" in source
    assert ".email-cta { background-color: #3e63dd !important;" in source
    assert "body, p, span, td, a, div { color: #171717 !important; }" in source
    assert '[style*="background-color"] { background-color: #ffffff !important; }' in source
