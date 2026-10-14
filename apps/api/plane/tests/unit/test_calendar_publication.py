from datetime import date
from uuid import uuid4

import pytest
from django.db import DatabaseError, transaction

pytestmark = pytest.mark.django_db(transaction=True)


@pytest.fixture(scope="session")
def calendar_publication_triggers(django_db_setup, django_db_blocker):
    # The repository's default --nomigrations builds tables but omits RunSQL.
    # Exercise the actual migration SQL even in that mode; full migration tests
    # separately cover the existing-row backfill and rollback.
    import importlib
    from django.db import connection
    with django_db_blocker.unblock(), connection.cursor() as cursor:
        cursor.execute("SELECT 1 FROM pg_trigger WHERE tgname = 'tenfold_ical_issue_tracking'")
        if cursor.fetchone() is None:
            migration = importlib.import_module("plane.db.migrations.0132_calendar_publication_tracking")
            cursor.execute(migration.FORWARD_SQL)


@pytest.fixture
def calendar_project(calendar_publication_triggers):
    from plane.db.models import CalendarFeed, Issue, Project, ProjectMember, State, User, Workspace, WorkspaceMember

    user = User.objects.create(email=f"ical-{uuid4()}@example.com", username=str(uuid4()))
    workspace = Workspace.objects.create(name="Calendar tests", slug=str(uuid4()), owner=user)
    WorkspaceMember.objects.create(workspace=workspace, member=user, role=20)
    project = Project.objects.create(name="Marketing", identifier="MKT", workspace=workspace)
    ProjectMember.objects.create(project=project, workspace=workspace, member=user, role=20)
    state = State.objects.create(project=project, workspace=workspace, name="Todo", group="unstarted", default=True)
    feed = CalendarFeed.objects.create(project=project, created_by=user)
    issue = Issue.objects.create(project=project, workspace=workspace, state=state,
                                 name="Planning", target_date=date(2026, 11, 1))
    issue.refresh_from_db()
    return user, workspace, project, state, feed, issue


def test_bulk_visible_changes_advance_sequence_but_metadata_does_not(calendar_project):
    from plane.db.models import Issue
    issue = calendar_project[-1]
    uid, seq, changed = issue.ical_uid, issue.ical_sequence, issue.ical_changed_at
    Issue.objects.filter(pk=issue.pk).update(sort_order=99)
    issue.refresh_from_db()
    assert (issue.ical_sequence, issue.ical_changed_at) == (seq, changed)
    Issue.objects.filter(pk=issue.pk).update(name="New title")
    issue.refresh_from_db()
    assert issue.ical_sequence == seq + 1
    assert issue.ical_uid == uid
    issue.target_date = date(2026, 12, 1)
    Issue.objects.bulk_update([issue], ["target_date"])
    issue.refresh_from_db()
    assert issue.ical_sequence == seq + 2


def test_uid_is_immutable_even_for_queryset_update(calendar_project):
    from plane.db.models import Issue
    issue = calendar_project[-1]
    with pytest.raises(DatabaseError), transaction.atomic():
        Issue.objects.filter(pk=issue.pk).update(ical_uid="replaced@example.com")


@pytest.mark.parametrize("withdrawal", ["deleted", "undated", "archived", "draft", "triage", "hard_deleted"])
def test_withdrawals_preserve_cancellation_snapshot(calendar_project, withdrawal):
    from django.utils import timezone
    from plane.db.models import CalendarFeedCancellation, Issue, State
    issue = calendar_project[-1]
    original_seq = issue.ical_sequence
    query = Issue.all_objects.filter(pk=issue.pk)
    if withdrawal == "deleted":
        Issue.objects.filter(pk=issue.pk).delete()
    elif withdrawal == "undated":
        query.update(target_date=None)
    elif withdrawal == "archived":
        query.update(archived_at=date(2026, 10, 14))
    elif withdrawal == "draft":
        query.update(is_draft=True)
    elif withdrawal == "triage":
        State.all_objects.filter(pk=calendar_project[3].pk).update(group="triage")
    else:
        query.delete()
    snapshot = CalendarFeedCancellation.objects.get(project=issue.project, uid=issue.ical_uid)
    assert snapshot.title == "Planning"
    assert snapshot.target_date == date(2026, 11, 1)
    assert snapshot.sequence == original_seq + 1
    assert snapshot.cancelled_at <= timezone.now()


def test_restore_removes_snapshot_and_advances_sequence(calendar_project):
    from plane.db.models import CalendarFeedCancellation, Issue
    issue = calendar_project[-1]
    seq = issue.ical_sequence
    Issue.all_objects.filter(pk=issue.pk).update(target_date=None)
    Issue.all_objects.filter(pk=issue.pk).update(target_date=date(2026, 11, 1))
    issue.refresh_from_db()
    assert issue.ical_sequence == seq + 2
    assert not CalendarFeedCancellation.objects.filter(uid=issue.ical_uid).exists()


def test_state_group_bulk_edit_cancels_and_restores(calendar_project):
    from plane.db.models import State
    state, issue = calendar_project[3], calendar_project[-1]
    seq = issue.ical_sequence
    State.all_objects.filter(pk=state.pk).update(group="cancelled")
    issue.refresh_from_db()
    assert issue.ical_state_group == "cancelled"
    assert issue.ical_cancelled_at is not None
    assert issue.ical_sequence == seq + 1
    cancelled_at = issue.ical_cancelled_at
    issue.name = "Still cancelled"
    issue.save()
    issue.refresh_from_db()
    assert issue.ical_cancelled_at == cancelled_at
    State.all_objects.filter(pk=state.pk).update(group="completed")
    issue.refresh_from_db()
    assert issue.ical_cancelled_at is None
    assert issue.ical_sequence == seq + 3


def test_update_fields_and_existing_issue_identifier_are_preserved(calendar_project):
    issue = calendar_project[-1]
    seq, number = issue.ical_sequence, issue.sequence_id
    issue.name = "Unsaved title"
    issue.sort_order = 101
    issue.save(update_fields=["sort_order"])
    issue.refresh_from_db()
    assert issue.name == "Planning"
    assert issue.ical_sequence == seq
    assert issue.sequence_id == number


def test_project_move_cancels_old_calendar_with_same_uid(calendar_project):
    from plane.db.models import CalendarFeed, CalendarFeedCancellation, Issue, Project, State
    user, workspace, project, state, feed, issue = calendar_project
    destination = Project.objects.create(name="Destination", identifier="DST", workspace=workspace)
    new_state = State.objects.create(project=destination, workspace=workspace, name="Todo", group="unstarted")
    CalendarFeed.objects.create(project=destination, created_by=user)
    Issue.all_objects.filter(pk=issue.pk).update(project=destination, state=new_state)
    snapshot = CalendarFeedCancellation.objects.get(project=project, uid=issue.ical_uid)
    issue.refresh_from_db()
    assert issue.ical_uid == snapshot.uid
    assert issue.ical_sequence == snapshot.sequence
    Issue.all_objects.filter(pk=issue.pk).update(project=project, state=state)
    assert not CalendarFeedCancellation.objects.filter(project=project, uid=issue.ical_uid).exists()
    assert CalendarFeedCancellation.objects.filter(project=destination, uid=issue.ical_uid).exists()


def test_concurrent_writes_cannot_lose_sequence_increments(calendar_project):
    from concurrent.futures import ThreadPoolExecutor
    from django.db import connections
    from plane.db.models import Issue
    issue = calendar_project[-1]
    def edit(index):
        try:
            Issue.all_objects.filter(pk=issue.pk).update(name=f"Concurrent title {index}")
        finally:
            connections.close_all()
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(edit, range(8)))
    seq = issue.ical_sequence
    issue.refresh_from_db()
    assert issue.ical_sequence == seq + 8
