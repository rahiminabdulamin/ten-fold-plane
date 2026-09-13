# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import pytest

from plane.bgtasks.workspace_seed_task import workspace_seed
from plane.db.models import Issue, Project


@pytest.mark.django_db
def test_workspace_seed_creates_an_empty_untitled_workspace(workspace):
    """New teams receive one blank workspace instead of tutorial content."""
    workspace_seed(workspace.id)

    project = Project.objects.get(workspace=workspace)
    assert project.name == "Untitled"
    assert Issue.objects.filter(workspace=workspace).count() == 0
