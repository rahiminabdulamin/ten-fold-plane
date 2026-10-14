from django.contrib.postgres.operations import AddIndexConcurrently
from django.db import migrations, models


class Migration(migrations.Migration):
    atomic = False
    dependencies = [("db", "0132_calendar_publication_tracking")]
    operations = [
        AddIndexConcurrently("issue", models.Index(fields=["project", "ical_uid"], name="issue_calendar_identity")),
        AddIndexConcurrently("issue", models.Index(fields=["updated_at"], name="issue_calendar_updated")),
        AddIndexConcurrently("issue", models.Index(fields=["deleted_at"], name="issue_calendar_deleted")),
    ]
