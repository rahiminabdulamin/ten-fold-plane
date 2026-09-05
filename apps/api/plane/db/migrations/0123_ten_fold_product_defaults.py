from django.db import migrations, models


def set_ten_fold_defaults(apps, schema_editor):
    User = apps.get_model("db", "User")
    Profile = apps.get_model("db", "Profile")
    WorkspaceUserProperties = apps.get_model("db", "WorkspaceUserProperties")

    User.objects.update(user_timezone="Asia/Singapore")
    for profile in Profile.objects.all().iterator():
        profile.theme = {**(profile.theme or {}), "theme": "light"}
        profile.start_of_the_week = 1
        profile.save(update_fields=["theme", "start_of_the_week"])
    WorkspaceUserProperties.objects.update(navigation_control_preference="TABBED")


class Migration(migrations.Migration):
    dependencies = [("db", "0122_alter_draftissue_assignees_alter_issue_assignees_and_more")]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="user_timezone",
            field=models.CharField(max_length=255, default="Asia/Singapore"),
        ),
        migrations.AlterField(
            model_name="profile",
            name="start_of_the_week",
            field=models.PositiveSmallIntegerField(default=1),
        ),
        migrations.AlterField(
            model_name="workspaceuserproperties",
            name="navigation_control_preference",
            field=models.CharField(max_length=25, default="TABBED"),
        ),
        migrations.RunPython(set_ten_fold_defaults, migrations.RunPython.noop),
    ]
