# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import pytest

from plane.db.models import Profile


@pytest.mark.django_db
def test_new_profiles_disable_product_tours(create_user):
    """New users must not receive first-time tour prompts."""
    profile = Profile.objects.create(user=create_user)

    assert profile.is_tour_completed is True
    assert profile.is_navigation_tour_completed is True
    assert profile.product_tour == {
        "work_items": True,
        "cycles": True,
        "modules": True,
        "intake": True,
        "pages": True,
    }
