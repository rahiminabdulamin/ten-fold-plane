"""Opt-in project calendar feeds and retained withdrawal records."""

import secrets
import uuid

from django.conf import settings
from django.db import models


def feed_token():
    return secrets.token_urlsafe(32)


def event_uid():
    # A fixed namespace keeps identity stable across renames and deployment moves.
    return f"event-{uuid.uuid4()}@ten-fold.app"


class CalendarFeed(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.OneToOneField("db.Project", on_delete=models.CASCADE, related_name="calendar_feed")
    token = models.CharField(max_length=64, unique=True, default=feed_token, editable=False)
    enabled = models.BooleanField(default=True, db_index=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_accessed_at = models.DateTimeField(null=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    token_rotated_at = models.DateTimeField(null=True)

    class Meta:
        db_table = "calendar_feeds"


class CalendarFeedCancellation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey("db.Project", on_delete=models.CASCADE)
    issue_id = models.UUIDField(db_index=True)
    uid = models.CharField(max_length=255)
    sequence = models.PositiveIntegerField()
    title = models.CharField(max_length=255)
    description_html = models.TextField(blank=True)
    start_date = models.DateField(null=True)
    target_date = models.DateField()
    created_at = models.DateTimeField()
    changed_at = models.DateTimeField()
    cancelled_at = models.DateTimeField(db_index=True)

    class Meta:
        db_table = "calendar_feed_cancellations"
        constraints = [models.UniqueConstraint(fields=["project", "uid"], name="calendar_cancel_project_uid")]
        indexes = [models.Index(fields=["project", "cancelled_at"], name="calendar_cancel_retention")]
