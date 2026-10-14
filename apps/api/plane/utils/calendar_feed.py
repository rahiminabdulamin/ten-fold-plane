"""Snapshot-consistent publication with bounded database and transport memory."""

import hashlib
import logging
import re
import time
from dataclasses import dataclass
from datetime import timedelta
from datetime import datetime
from tempfile import SpooledTemporaryFile
from typing import BinaryIO
from uuid import UUID

from asgiref.sync import sync_to_async
from django.conf import settings
from django.db import connections, transaction
from django.db.models import Max, Q
from django.http import HttpResponse, HttpResponseNotModified, StreamingHttpResponse
from django.utils import timezone
from django.utils.http import http_date, parse_etags, parse_http_date_safe
from opentelemetry import metrics

from plane.db.models import CalendarFeed, CalendarFeedCancellation, Issue
from plane.utils.html_processor import strip_tags
from plane.utils.icalendar import calendar_footer, calendar_header, serialize_event

logger = logging.getLogger("plane.calendar_feed")
meter = metrics.get_meter("tenfold.calendar_feed")
requests_total = meter.create_counter("feed_requests_total")
generation_errors = meter.create_counter("feed_generation_errors")
cache_hits = meter.create_counter("feed_cache_hits")
cache_misses = meter.create_counter("feed_cache_misses")
generation_duration = meter.create_histogram("feed_generation_duration", unit="s")
TOKEN_PATTERN = re.compile(r"[A-Za-z0-9_-]{43}\Z")
CHUNK_SIZE = 64 * 1024


def _issues(project_id, workspace_id, cutoff):
    return Issue.all_objects.using("default").filter(
        project_id=project_id, workspace_id=workspace_id, deleted_at__isnull=True,
        archived_at__isnull=True, is_draft=False, target_date__isnull=False,
    ).exclude(ical_state_group="triage").filter(
        Q(ical_cancelled_at__isnull=True) | Q(ical_cancelled_at__gt=cutoff)
    )


def _not_modified(headers, etag, modified):
    if "If-None-Match" in headers:
        tags = parse_etags(headers["If-None-Match"])
        return "*" in tags or etag.removeprefix("W/") in [tag.removeprefix("W/") for tag in tags]
    since = parse_http_date_safe(headers.get("If-Modified-Since", ""))
    # Keep microseconds: truncating both sides can hide a newer same-second edit.
    return since is not None and modified.timestamp() <= since < time.time()


@dataclass
class FeedExport:
    feed_id: UUID
    project_id: UUID
    workspace_id: UUID
    generated_at: datetime
    cutoff: datetime
    etag: str
    modified: datetime
    event_count: int
    file: BinaryIO | None
    duration: float


def prepare_feed(token, headers):
    """Validate on primary, hash indexed metadata, and spool under one snapshot."""
    requests_total.add(1)
    started = time.monotonic()
    logger.info("feed requested")
    if not TOKEN_PATTERN.fullmatch(token):
        logger.info("token invalid")
        return None
    spool = None
    try:
        with transaction.atomic(using="default"):
            with connections["default"].cursor() as cursor:
                cursor.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
            now = timezone.now()
            feed = CalendarFeed.objects.using("default").select_related("project", "project__workspace").filter(
                token=token, enabled=True, project__deleted_at__isnull=True,
                project__archived_at__isnull=True, project__workspace__deleted_at__isnull=True,
            ).filter(Q(expires_at__isnull=True) | Q(expires_at__gt=now)).first()
            if feed is None:
                logger.info("token invalid")
                return None
            cutoff = now - timedelta(days=settings.CALENDAR_FEED_RETENTION_DAYS)
            issues = _issues(feed.project_id, feed.project.workspace_id, cutoff)
            cancellations = CalendarFeedCancellation.objects.using("default").filter(
                project_id=feed.project_id, cancelled_at__gt=cutoff,
            )
            header = calendar_header(feed.project.name)
            digest = hashlib.sha256(header)
            digest.update(f"v1:{settings.CALENDAR_FEED_RETENTION_DAYS}:{feed.updated_at.isoformat()}".encode())
            modified = max(feed.created_at, feed.updated_at, feed.project.updated_at)
            event_count = 0
            for query, fields in (
                (issues, ("ical_uid", "ical_sequence", "ical_changed_at")),
                (cancellations, ("uid", "sequence", "changed_at")),
            ):
                for uid, sequence, changed in query.order_by(fields[0]).values_list(*fields).iterator(chunk_size=1000):
                    digest.update(f"{uid}\0{sequence}\0{changed.isoformat()}\n".encode())
                    modified = max(modified, changed)
                    event_count += 1
            # Retention changes content without a write. Include removal time in Last-Modified.
            for expired, field in (
                (CalendarFeedCancellation.objects.using("default").filter(project_id=feed.project_id, cancelled_at__lte=cutoff), "cancelled_at"),
                (Issue.all_objects.using("default").filter(project_id=feed.project_id, ical_cancelled_at__lte=cutoff), "ical_cancelled_at"),
            ):
                last = expired.aggregate(last=Max(field))["last"]
                if last is not None:
                    modified = max(modified, last + timedelta(days=settings.CALENDAR_FEED_RETENTION_DAYS))
            etag = f'W/"{digest.hexdigest()}"'
            matched = _not_modified(headers, etag, modified)
            if matched:
                cache_hits.add(1)
            else:
                cache_misses.add(1)
                spool = SpooledTemporaryFile(max_size=1024 * 1024, mode="w+b")
                spool.write(header)
                for query, is_cancellation in ((issues, False), (cancellations, True)):
                    if is_cancellation:
                        fields = ("uid", "sequence", "title", "description_html", "start_date", "target_date", "created_at", "changed_at")
                    else:
                        fields = ("ical_uid", "ical_sequence", "name", "description_html", "start_date", "target_date", "created_at", "ical_changed_at", "ical_state_group")
                    for row in query.order_by(fields[0]).values_list(*fields).iterator(chunk_size=1000):
                        uid, sequence, title, description, start, due, created, changed = row[:8]
                        start = min(start or due, due)
                        spool.write(serialize_event(dict(
                            uid=uid, sequence=sequence, title=title, description=strip_tags(description or ""),
                            location="", start=start, end=due + timedelta(days=1),
                            created=created, modified=changed,
                            status="CANCELLED" if is_cancellation or row[8] == "cancelled" else "CONFIRMED",
                        )))
                spool.write(calendar_footer())
                spool.seek(0)
            result = FeedExport(feed.id, feed.project_id, feed.project.workspace_id, now, cutoff,
                                etag, modified, event_count, spool, time.monotonic() - started)
        # Access bookkeeping cannot invalidate the content or sequence.
        CalendarFeed.objects.using("default").filter(pk=result.feed_id).update(last_accessed_at=now)
        return result
    except Exception:
        if spool is not None:
            spool.close()
        generation_errors.add(1)
        logger.error("feed generation failed", extra={"duration": time.monotonic() - started})
        raise


def _published(export):
    query = _issues(export.project_id, export.workspace_id, export.cutoff).filter(
        ical_changed_at__lte=export.generated_at,
    )
    last_id = None
    published_at = timezone.now()
    while True:
        batch = query if last_id is None else query.filter(id__gt=last_id)
        ids = list(batch.order_by("id").values_list("id", flat=True)[:1000])
        if not ids:
            break
        query.filter(id__in=ids).update(last_published_at=published_at)
        last_id = ids[-1]


class FeedStream:
    """Owns the spool independently of Django's sync/async iterator adaptation."""

    def __init__(self, export):
        self.export = export
        self.closed = False

    def close(self):
        if not self.closed:
            self.closed = True
            self.export.file.close()

    def _finish(self):
        try:
            _published(self.export)
        except Exception:
            # The feed is already sent; bookkeeping failure must not corrupt delivery.
            generation_errors.add(1)
            logger.error("feed publication bookkeeping failed")
        generation_duration.record(self.export.duration)
        logger.info("feed generated", extra={"duration": self.export.duration, "event_count": self.export.event_count})

    def __iter__(self):
        try:
            while block := self.export.file.read(CHUNK_SIZE):
                yield block
            self._finish()
        except Exception:
            generation_errors.add(1)
            logger.error("feed streaming failed")
            raise
        finally:
            self.close()

    async def __aiter__(self):
        try:
            while block := await sync_to_async(self.export.file.read)(CHUNK_SIZE):
                yield block
            await sync_to_async(self._finish)()
        except Exception:
            generation_errors.add(1)
            logger.error("feed streaming failed")
            raise
        finally:
            self.close()


def feed_response(export, asynchronous=False):
    if export is None:
        response = HttpResponse(status=404)
    elif export.file is None:
        response = HttpResponseNotModified()
    else:
        stream = FeedStream(export)
        response = StreamingHttpResponse(
            stream.__aiter__() if asynchronous else stream,
            content_type="text/calendar; charset=utf-8",
        )
        response._resource_closers.append(stream.close)
        response["Content-Disposition"] = 'inline; filename="calendar.ics"'
    if export is not None:
        response["ETag"] = export.etag
        response["Last-Modified"] = http_date(export.modified.timestamp())
    response["Cache-Control"] = "private, no-cache, max-age=0, must-revalidate"
    response["Referrer-Policy"] = "no-referrer"
    response["X-Content-Type-Options"] = "nosniff"
    return response


def clean_expired_cancellations(batch_size=1000):
    cutoff = timezone.now() - timedelta(days=settings.CALENDAR_FEED_RETENTION_DAYS)
    query = CalendarFeedCancellation.objects.using("default").filter(cancelled_at__lte=cutoff)
    count = 0
    while ids := list(query.values_list("id", flat=True)[:batch_size]):
        deleted, _ = query.filter(id__in=ids).delete()
        count += deleted
    return count
