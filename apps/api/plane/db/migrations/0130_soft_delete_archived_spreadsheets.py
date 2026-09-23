# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only

from django.db import migrations
from django.utils import timezone


def soft_delete_archived_spreadsheets(apps, schema_editor):
    SpreadsheetDocument = apps.get_model("db", "SpreadsheetDocument")
    SpreadsheetDocument.objects.filter(status="archived", deleted_at__isnull=True).update(deleted_at=timezone.now())


class Migration(migrations.Migration):
    dependencies = [("db", "0129_reset_personal_sidebar_pins")]

    operations = [migrations.RunPython(soft_delete_archived_spreadsheets, migrations.RunPython.noop)]
