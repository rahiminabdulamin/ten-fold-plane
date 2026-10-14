"""Publication invariants at the database boundary, including bulk writes."""

from django.db import migrations, models
import django.utils.timezone
import plane.db.models.calendar_feed


def backfill(apps, schema_editor):
    # Keyset batches avoid materializing millions of IDs or generating one shared UID.
    connection = schema_editor.connection
    last_id = "00000000-0000-0000-0000-000000000000"
    with connection.cursor() as cursor:
        while True:
            cursor.execute("SELECT id FROM issues WHERE id > %s ORDER BY id LIMIT 2000", [last_id])
            ids = [row[0] for row in cursor.fetchall()]
            if not ids:
                break
            cursor.execute("""
                UPDATE issues i SET
                    ical_uid = 'event-' || i.id::text || '@ten-fold.app',
                    ical_changed_at = i.updated_at,
                    ical_state_group = COALESCE((SELECT s."group" FROM states s WHERE s.id = i.state_id), ''),
                    ical_cancelled_at = CASE WHEN (SELECT s."group" FROM states s WHERE s.id = i.state_id) = 'cancelled'
                        THEN i.updated_at ELSE NULL END
                WHERE i.id = ANY(%s::uuid[])
            """, [ids])
            last_id = ids[-1]


FORWARD_SQL = """
CREATE FUNCTION tenfold_ical_issue_tracking() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    old_visible boolean := false;
    new_visible boolean := false;
    visible_changed boolean := false;
    change_time timestamptz := clock_timestamp();
BEGIN
    IF TG_OP <> 'INSERT' THEN
        old_visible := OLD.target_date IS NOT NULL AND OLD.deleted_at IS NULL
            AND OLD.archived_at IS NULL AND NOT OLD.is_draft AND OLD.ical_state_group <> 'triage';
    END IF;
    IF TG_OP <> 'DELETE' THEN
        IF TG_OP = 'INSERT' THEN
            NEW.ical_uid := COALESCE(NEW.ical_uid, 'event-' || NEW.id::text || '@ten-fold.app');
            NEW.ical_sequence := 0;
            NEW.ical_changed_at := NEW.created_at;
        ELSE
            IF NEW.ical_uid IS DISTINCT FROM OLD.ical_uid THEN
                RAISE EXCEPTION 'iCalendar UID is immutable';
            END IF;
            NEW.ical_sequence := OLD.ical_sequence;
            NEW.ical_changed_at := OLD.ical_changed_at;
            NEW.ical_cancelled_at := OLD.ical_cancelled_at;
        END IF;
        IF TG_OP = 'INSERT' OR NEW.state_id IS DISTINCT FROM OLD.state_id
           OR (pg_trigger_depth() > 1 AND NEW.ical_state_group IS DISTINCT FROM OLD.ical_state_group) THEN
            -- Hold the state stable until membership commits. Otherwise a group
            -- edit can scan before this new/moved issue becomes visible and miss it.
            NEW.ical_state_group := COALESCE((SELECT "group" FROM states WHERE id = NEW.state_id FOR SHARE), '');
        ELSE
            -- A stale model instance can carry old derived metadata. Only a
            -- nested state trigger may change it without changing membership.
            NEW.ical_state_group := OLD.ical_state_group;
        END IF;
        new_visible := NEW.target_date IS NOT NULL AND NEW.deleted_at IS NULL
            AND NEW.archived_at IS NULL AND NOT NEW.is_draft AND NEW.ical_state_group <> 'triage';
        IF TG_OP = 'UPDATE' THEN
            visible_changed := ROW(NEW.name, COALESCE(NEW.description_html, ''), NEW.start_date, NEW.target_date,
                NEW.ical_state_group = 'cancelled', NEW.ical_state_group = 'triage',
                NEW.deleted_at IS NULL, NEW.archived_at IS NULL, NEW.is_draft, NEW.project_id, NEW.workspace_id)
                IS DISTINCT FROM
                ROW(OLD.name, COALESCE(OLD.description_html, ''), OLD.start_date, OLD.target_date,
                OLD.ical_state_group = 'cancelled', OLD.ical_state_group = 'triage',
                OLD.deleted_at IS NULL, OLD.archived_at IS NULL, OLD.is_draft, OLD.project_id, OLD.workspace_id);
            IF visible_changed THEN
                NEW.ical_sequence := OLD.ical_sequence + 1;
                NEW.ical_changed_at := change_time;
            END IF;
        END IF;
        IF NEW.ical_state_group = 'cancelled' THEN
            NEW.ical_cancelled_at := COALESCE(NEW.ical_cancelled_at, change_time);
        ELSE
            NEW.ical_cancelled_at := NULL;
        END IF;
    END IF;
    IF old_visible AND (TG_OP = 'DELETE' OR NOT new_visible OR NEW.project_id IS DISTINCT FROM OLD.project_id)
        AND EXISTS (SELECT 1 FROM calendar_feeds WHERE project_id = OLD.project_id) THEN
        INSERT INTO calendar_feed_cancellations
            (id, project_id, issue_id, uid, sequence, title, description_html,
             start_date, target_date, created_at, changed_at, cancelled_at)
        VALUES (gen_random_uuid(), OLD.project_id, OLD.id, OLD.ical_uid, OLD.ical_sequence + 1,
            OLD.name, COALESCE(OLD.description_html, ''), OLD.start_date, OLD.target_date,
            OLD.created_at, change_time, COALESCE(OLD.ical_cancelled_at, change_time))
        ON CONFLICT (project_id, uid) DO UPDATE SET
            sequence = EXCLUDED.sequence, title = EXCLUDED.title,
            description_html = EXCLUDED.description_html, start_date = EXCLUDED.start_date,
            target_date = EXCLUDED.target_date, changed_at = EXCLUDED.changed_at,
            cancelled_at = EXCLUDED.cancelled_at;
    END IF;
    IF new_visible THEN
        DELETE FROM calendar_feed_cancellations WHERE project_id = NEW.project_id AND uid = NEW.ical_uid;
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER tenfold_ical_issue_tracking BEFORE INSERT OR UPDATE OR DELETE ON issues
    FOR EACH ROW EXECUTE FUNCTION tenfold_ical_issue_tracking();

CREATE FUNCTION tenfold_ical_state_tracking() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW."group" IS DISTINCT FROM OLD."group" THEN
        UPDATE issues SET ical_state_group = NEW."group" WHERE state_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER tenfold_ical_state_tracking AFTER UPDATE OF "group" ON states
    FOR EACH ROW EXECUTE FUNCTION tenfold_ical_state_tracking();
"""

REVERSE_SQL = """
DROP TRIGGER IF EXISTS tenfold_ical_state_tracking ON states;
DROP FUNCTION IF EXISTS tenfold_ical_state_tracking();
DROP TRIGGER IF EXISTS tenfold_ical_issue_tracking ON issues;
DROP FUNCTION IF EXISTS tenfold_ical_issue_tracking();
"""


class Migration(migrations.Migration):
    # Backfill commits each bounded batch rather than holding row locks for the whole table.
    atomic = False
    dependencies = [("db", "0131_project_calendar_feeds")]
    operations = [
        migrations.RunPython(backfill, migrations.RunPython.noop),
        migrations.AlterField("issue", "ical_uid", models.CharField(
            max_length=255, unique=True, default=plane.db.models.calendar_feed.event_uid, editable=False)),
        migrations.AlterField("issue", "ical_changed_at", models.DateTimeField(
            default=django.utils.timezone.now, editable=False, db_index=True)),
        migrations.RunSQL(FORWARD_SQL, REVERSE_SQL),
    ]
