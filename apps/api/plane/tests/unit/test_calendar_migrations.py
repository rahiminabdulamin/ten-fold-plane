from uuid import uuid4

import pytest
from django.db import connection
from django.db.migrations.executor import MigrationExecutor

from plane.tests.unit.test_calendar_publication import calendar_project, calendar_publication_triggers  # noqa: F401


@pytest.mark.django_db(transaction=True)
def test_backfill_generates_distinct_uids_and_migrations_reverse(calendar_project):
    _, workspace, project, state, _, issue = calendar_project
    executor = MigrationExecutor(connection)
    latest = [("db", "0133_calendar_publication_indexes")]
    try:
        executor.migrate([("db", "0131_project_calendar_feeds")])
        old_apps = executor.loader.project_state([("db", "0131_project_calendar_feeds")]).apps
        OldIssue = old_apps.get_model("db", "Issue")
        older = OldIssue.objects.create(id=uuid4(), project_id=project.pk, workspace_id=workspace.pk,
                                       state_id=state.pk, name="Existing event")
        OldIssue.objects.filter(pk=issue.pk).update(ical_uid=None, ical_changed_at=None)
        before = OldIssue.objects.get(pk=issue.pk)
        executor = MigrationExecutor(connection)
        executor.migrate(latest)
        from plane.db.models import Issue
        records = list(Issue.all_objects.filter(pk__in=[issue.pk, older.pk]))
        assert len({record.ical_uid for record in records}) == 2
        assert all(record.ical_uid == f"event-{record.pk}@ten-fold.app" for record in records)
        migrated = Issue.all_objects.get(pk=issue.pk)
        assert migrated.updated_at == before.updated_at
        assert migrated.sequence_id == before.sequence_id
        Issue.all_objects.filter(pk=issue.pk).update(name="After migration")
        assert Issue.all_objects.get(pk=issue.pk).ical_sequence == before.ical_sequence + 1
        executor = MigrationExecutor(connection)
        executor.migrate([("db", "0130_soft_delete_archived_spreadsheets")])
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE 'tenfold_ical_%'")
            assert cursor.fetchone()[0] == 0
    finally:
        MigrationExecutor(connection).migrate(latest)
