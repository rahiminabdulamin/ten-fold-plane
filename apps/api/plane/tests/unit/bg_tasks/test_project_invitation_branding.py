# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only

import pytest
from django.template.loader import render_to_string


@pytest.mark.unit
def test_project_invitation_email_uses_ten_fold_branding():
    html = render_to_string(
        "emails/invitations/project_invitation.html",
        {
            "email": "invitee@example.com",
            "first_name": "Amin",
            "project_name": "Administration",
            "invitation_url": "https://ten-fold.co/project-invitations/?invitation_id=123",
            "logo_url": "https://ten-fold.co/branding/tenfold-rebrand-logo-white.png",
        },
    )

    assert "Join Administration on Ten-Fold" in html
    assert "background-color: #00364C;" in html
    assert "https://ten-fold.co/branding/tenfold-rebrand-logo-white.png" in html
    assert "Plane" not in html
