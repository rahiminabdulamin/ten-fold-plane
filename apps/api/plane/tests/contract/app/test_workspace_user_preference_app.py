# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import importlib
from datetime import timedelta

import pytest
from django.apps import apps as django_apps
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from plane.db.models import User, WorkspaceMember
from plane.db.models.workspace import WorkspaceUserPreference


@pytest.mark.contract
class TestWorkspaceUserPreferencePatch:
    """Contract tests for the sidebar preference PATCH endpoint.

    Regression coverage for #9260: ``patch`` filtered ``WorkspaceUserPreference``
    by ``key``/``workspace__slug`` only, so in a workspace with multiple members
    ``.first()`` (ordered by ``-created_at``) could return — and mutate — another
    member's preference row instead of the requesting user's.
    """

    KEY = WorkspaceUserPreference.UserPreferenceKeys.ANALYTICS.value

    @pytest.mark.django_db
    def test_get_creates_personal_preferences_unpinned(self, session_client, create_user, workspace):
        """Missing personal preferences are created hidden from the primary sidebar."""
        response = session_client.get(reverse("workspace-user-preference", kwargs={"slug": workspace.slug}))

        assert response.status_code == status.HTTP_200_OK
        for key in ("drafts", "your_work", "stickies"):
            assert response.data[key]["is_pinned"] is False

    @pytest.mark.django_db
    def test_personal_sidebar_pin_reset_preserves_order_and_other_preferences(self, create_user, workspace):
        """The rollout reset hides personal items without touching any other preference state."""
        personal_preferences = [
            WorkspaceUserPreference.objects.create(
                workspace=workspace, user=create_user, key=key, is_pinned=True, sort_order=sort_order
            )
            for key, sort_order in (("drafts", 11), ("your_work", 22), ("stickies", 33))
        ]
        analytics = WorkspaceUserPreference.objects.create(
            workspace=workspace, user=create_user, key="analytics", is_pinned=True, sort_order=44
        )

        migration = importlib.import_module("plane.db.migrations.0129_reset_personal_sidebar_pins")
        migration.reset_personal_sidebar_pins(django_apps, None)

        for preference in personal_preferences:
            preference.refresh_from_db()
            assert preference.is_pinned is False
        analytics.refresh_from_db()
        assert analytics.is_pinned is True
        assert [preference.sort_order for preference in personal_preferences] == [11, 22, 33]

    @pytest.mark.django_db
    def test_patch_only_updates_requesting_users_preference(self, session_client, create_user, workspace):
        """A member's PATCH must update only their own preference, never another member's."""
        # A second, more-recently-active member of the same workspace.
        other_user = User.objects.create(
            email="other@plane.so", username="other_user", first_name="Other", last_name="User"
        )
        WorkspaceMember.objects.create(workspace=workspace, member=other_user, role=15)

        own_pref = WorkspaceUserPreference.objects.create(
            workspace=workspace, user=create_user, key=self.KEY, is_pinned=False, sort_order=100
        )
        other_pref = WorkspaceUserPreference.objects.create(
            workspace=workspace, user=other_user, key=self.KEY, is_pinned=False, sort_order=200
        )

        # Force the other member's row to sort first under the model's ``-created_at``
        # ordering, so an unscoped ``.first()`` would deterministically pick it.
        now = timezone.now()
        WorkspaceUserPreference.objects.filter(pk=own_pref.pk).update(created_at=now)
        WorkspaceUserPreference.objects.filter(pk=other_pref.pk).update(created_at=now + timedelta(minutes=1))

        url = reverse("workspace-user-preference", kwargs={"slug": workspace.slug})
        response = session_client.patch(
            url, [{"key": self.KEY, "is_pinned": True, "sort_order": 999}], format="json"
        )

        assert response.status_code == status.HTTP_200_OK

        own_pref.refresh_from_db()
        other_pref.refresh_from_db()

        # The requesting user's preference is updated...
        assert own_pref.is_pinned is True
        assert own_pref.sort_order == 999
        # ...and the other member's preference is left untouched.
        assert other_pref.is_pinned is False
        assert other_pref.sort_order == 200

    @pytest.mark.django_db
    def test_patch_updates_own_preference(self, session_client, create_user, workspace):
        """Baseline: a member's PATCH persists changes to their own preference row."""
        preference = WorkspaceUserPreference.objects.create(
            workspace=workspace, user=create_user, key=self.KEY, is_pinned=False, sort_order=100
        )

        url = reverse("workspace-user-preference", kwargs={"slug": workspace.slug})
        response = session_client.patch(
            url, [{"key": self.KEY, "is_pinned": True, "sort_order": 42}], format="json"
        )

        assert response.status_code == status.HTTP_200_OK

        preference.refresh_from_db()
        assert preference.is_pinned is True
        assert preference.sort_order == 42
