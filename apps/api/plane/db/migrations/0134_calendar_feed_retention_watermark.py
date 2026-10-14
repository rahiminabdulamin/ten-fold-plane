from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("db", "0133_calendar_publication_indexes")]
    operations = [
        migrations.AddField("calendarfeed", "last_removed_at", models.DateTimeField(null=True, editable=False)),
    ]
