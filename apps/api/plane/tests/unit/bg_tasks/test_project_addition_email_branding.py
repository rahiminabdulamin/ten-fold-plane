# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only

import pytest
from django.template.loader import render_to_string


@pytest.mark.unit
def test_project_addition_email_uses_ten_fold_branding():
    html = render_to_string(
        "emails/notifications/project_addition.html",
        {
            "email": "invitee@example.com",
            "inviter_first_name": "Amin",
            "project_name": "Finance",
            "workspace_name": "Brune4AI",
            "project_url": "https://ten-fold.co/brune4ai/projects/123/issues",
            "logo_url": "https://ten-fold.co/branding/tenfold-rebrand-logo-white.png",
        },
    )

    assert "background-color: #00364C;" in html
    assert "https://ten-fold.co/branding/tenfold-rebrand-logo-white.png" in html
    assert "Kognitif AI Enterprise" in html
    assert "Plane" not in html
