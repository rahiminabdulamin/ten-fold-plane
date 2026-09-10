# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only

import pytest
from django.template.loader import render_to_string


@pytest.mark.unit
def test_workspace_invitation_email_uses_ten_fold_branding():
    """The delivered invitation identifies Ten-Fold and links its public logo."""
    html = render_to_string(
        "emails/invitations/workspace_invitation.html",
        {
            "email": "invitee@example.com",
            "first_name": "Amin",
            "workspace_name": "Brune4AI",
            "abs_url": "https://ten-fold.co/workspace-invitations/?invitation_id=123",
            "logo_url": "https://ten-fold.co/branding/tenfold-logo-long-rebrand-v4.png",
        },
    )

    assert "Join Brune4AI on Ten-Fold" in html
    assert "Brune4AI workspace on Ten-Fold" in html
    assert "https://ten-fold.co/branding/tenfold-logo-long-rebrand-v4.png" in html
    assert "Kognitif AI Enterprise" in html
    assert "Plane Software, Inc." not in html
    assert "on Plane" not in html
