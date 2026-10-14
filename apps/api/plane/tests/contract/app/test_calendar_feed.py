from datetime import date, timedelta
from uuid import uuid4

import pytest
from django.test import RequestFactory, override_settings
from django.utils import timezone
from icalendar import Calendar
from rest_framework.test import APIClient

from plane.tests.unit.test_calendar_publication import calendar_project, calendar_publication_triggers  # noqa: F401

pytestmark = pytest.mark.django_db(transaction=True)


def management_path(workspace, project):
    return f"/api/workspaces/{workspace.slug}/projects/{project.id}/calendar-feed/"


def public_path(feed):
    return f"/ics/{feed.token}.ics"


def content(response):
    return b"".join(response.streaming_content)


@override_settings(WEB_URL="https://tenfold.example")
def test_admin_can_find_and_manage_secret_url(calendar_project):
    user, workspace, project, state, feed, issue = calendar_project
    client = APIClient()
    client.force_authenticate(user)
    path = management_path(workspace, project)
    response = client.get(path)
    assert response.status_code == 200
    assert response.data["url"] == "https://tenfold.example" + public_path(feed)
    assert client.patch(path, {"enabled": False}, format="json").status_code == 200
    assert client.get(public_path(feed)).status_code == 404
    assert client.patch(path, {"enabled": True}, format="json").status_code == 200
    old_path = public_path(feed)
    rotated = client.post(path + "rotate/")
    assert rotated.status_code == 200
    assert rotated.data["url"] != response.data["url"]
    assert client.get(old_path, HTTP_IF_NONE_MATCH="*").status_code == 404
    assert client.delete(path).status_code == 204
    assert client.get(path).data is None
    created = client.post(path)
    assert created.status_code == 201
    assert created.data["url"] != rotated.data["url"]


def test_non_admin_and_cross_workspace_cannot_read_or_mutate(calendar_project):
    from plane.db.models import ProjectMember, Workspace
    user, workspace, project, state, feed, issue = calendar_project
    client = APIClient()
    client.force_authenticate(user)
    path = management_path(workspace, project)
    ProjectMember.objects.filter(project=project, member=user).update(role=15)
    for method in [client.get, client.post, client.patch, client.delete]:
        assert method(path).status_code == 403
    assert client.post(path + "rotate/").status_code == 403
    ProjectMember.objects.filter(project=project, member=user).update(role=20)
    other = Workspace.objects.create(name="Other", slug=str(uuid4()), owner=user)
    assert client.get(management_path(other, project)).status_code in (403, 404)


def test_public_feed_round_trips_and_metadata_does_not_invalidate(calendar_project):
    from plane.db.models import Issue
    feed, issue = calendar_project[-2:]
    client = APIClient()
    response = client.get(public_path(feed))
    assert response.status_code == 200
    assert response["Content-Type"] == "text/calendar; charset=utf-8"
    assert "private" in response["Cache-Control"]
    raw = content(response)
    event = Calendar.from_ical(raw).walk("VEVENT")[0]
    assert event.decoded("dtstart") == date(2026, 11, 1)
    assert event.decoded("dtend") == date(2026, 11, 2)
    assert str(event["uid"]) == issue.ical_uid
    issue.refresh_from_db()
    assert issue.last_published_at is not None
    etag = response["ETag"]
    assert client.get(public_path(feed), HTTP_IF_NONE_MATCH=etag).status_code == 304
    Issue.objects.filter(pk=issue.pk).update(sort_order=123)
    assert client.get(public_path(feed), HTTP_IF_NONE_MATCH=etag).status_code == 304
    Issue.objects.filter(pk=issue.pk).update(name="Changed")
    changed = client.get(public_path(feed), HTTP_IF_NONE_MATCH=etag)
    assert changed.status_code == 200
    changed.close()


def test_etag_list_wildcard_and_precedence(calendar_project):
    feed = calendar_project[-2]
    client = APIClient()
    first = client.get(public_path(feed))
    tag = first["ETag"]
    first.close()
    assert client.get(public_path(feed), HTTP_IF_NONE_MATCH=f'"different", {tag}').status_code == 304
    assert client.get(public_path(feed), HTTP_IF_NONE_MATCH="*").status_code == 304
    response = client.get(public_path(feed), HTTP_IF_NONE_MATCH='"different"',
                          HTTP_IF_MODIFIED_SINCE="Wed, 01 Jan 2031 00:00:00 GMT")
    assert response.status_code == 200
    response.close()


def test_cancellations_and_retention_invalidate_cache(calendar_project):
    from plane.db.models import CalendarFeedCancellation, Issue
    feed, issue = calendar_project[-2:]
    client = APIClient()
    Issue.objects.filter(pk=issue.pk).delete()
    response = client.get(public_path(feed))
    event = Calendar.from_ical(content(response)).walk("VEVENT")[0]
    assert str(event["status"]) == "CANCELLED"
    assert int(event["sequence"]) == issue.ical_sequence + 1
    tag = response["ETag"]
    CalendarFeedCancellation.objects.filter(uid=issue.ical_uid).update(cancelled_at=timezone.now() - timedelta(days=31))
    expired = client.get(public_path(feed), HTTP_IF_NONE_MATCH=tag)
    assert expired.status_code == 200
    assert not Calendar.from_ical(content(expired)).walk("VEVENT")


@pytest.mark.parametrize("unavailable", ["expiry", "project_deleted", "project_archived", "workspace_deleted"])
def test_unavailable_feed_rejects_even_conditional_requests(calendar_project, unavailable):
    user, workspace, project, state, feed, issue = calendar_project
    if unavailable == "expiry":
        feed.expires_at = timezone.now() - timedelta(seconds=1)
        feed.save()
    elif unavailable == "workspace_deleted":
        workspace.deleted_at = timezone.now()
        workspace.save()
    else:
        setattr(project, "deleted_at" if unavailable == "project_deleted" else "archived_at", timezone.now())
        project.save()
    assert APIClient().get(public_path(feed), HTTP_IF_NONE_MATCH="*").status_code == 404


def test_invalid_token_and_validation_errors(calendar_project):
    user, workspace, project, state, feed, issue = calendar_project
    client = APIClient()
    client.force_authenticate(user)
    for token in ["short", "A" * 43, "A" * 100]:
        assert client.get(f"/ics/{token}.ics").status_code == 404
    path = management_path(workspace, project)
    assert client.patch(path, {"enabled": "maybe"}, format="json").status_code == 400
    assert client.patch(path, {"expires_at": "nonsense"}, format="json").status_code == 400
    assert client.patch(path, {"token": "chosen-token"}, format="json").status_code == 400


def test_disconnect_closes_file_without_marking_published(calendar_project, caplog):
    import logging
    feed, issue = calendar_project[-2:]
    with caplog.at_level(logging.INFO, logger="plane.api.calendar_feed"):
        response = APIClient().get(public_path(feed))
        response.close()
    issue.refresh_from_db()
    assert issue.last_published_at is None
    assert "feed disconnected" in caplog.text


def test_feed_paths_never_appear_in_logs(calendar_project, caplog):
    import logging
    feed = calendar_project[-2]
    with caplog.at_level(logging.INFO):
        response = APIClient().get(public_path(feed))
        content(response)
        APIClient().get("/ics/" + "A" * 43 + ".ics")
    assert feed.token not in caplog.text
    assert "A" * 43 not in caplog.text


def test_last_modified_and_same_second_changes_are_conservative(calendar_project):
    from django.utils.http import http_date
    from plane.db.models import CalendarFeed, Issue, Project
    feed, issue = calendar_project[-2:]
    client = APIClient()
    old = timezone.now().replace(microsecond=0) - timedelta(seconds=10)
    CalendarFeed.objects.filter(pk=feed.pk).update(created_at=old, updated_at=old)
    Project.objects.filter(pk=feed.project_id).update(updated_at=old)
    # Timestamp fixture is written with triggers disabled only for this controlled
    # representation; real visible updates below must still use the trigger.
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("ALTER TABLE issues DISABLE TRIGGER tenfold_ical_issue_tracking")
        try:
            Issue.all_objects.filter(pk=issue.pk).update(ical_changed_at=old)
        finally:
            cursor.execute("ALTER TABLE issues ENABLE TRIGGER tenfold_ical_issue_tracking")
    assert client.get(public_path(feed), HTTP_IF_MODIFIED_SINCE=http_date(old.timestamp())).status_code == 304
    Issue.objects.filter(pk=issue.pk).update(name="New same-second title")
    response = client.get(public_path(feed), HTTP_IF_MODIFIED_SINCE=http_date(timezone.now().timestamp()))
    assert response.status_code == 200
    response.close()


def test_async_stream_is_native_and_closes_on_disconnect(calendar_project):
    import asyncio
    from plane.utils.calendar_feed import feed_response, prepare_feed
    feed, issue = calendar_project[-2:]
    export = prepare_feed(feed.token, {})
    response = feed_response(export, asynchronous=True)
    assert response.is_async
    async def disconnect():
        iterator = response.streaming_content.__aiter__()
        assert await anext(iterator)
        await iterator.aclose()
    asyncio.run(disconnect())
    response.close()
    assert export.file.closed
    issue.refresh_from_db()
    assert issue.last_published_at is None


def test_real_asgi_request_streams_without_sync_buffering(calendar_project):
    import asyncio
    import warnings
    from django.test import AsyncClient
    feed = calendar_project[-2]
    async def request():
        response = await AsyncClient().get(public_path(feed))
        assert response.is_async
        blocks = []
        async for block in response.streaming_content:
            blocks.append(block)
        response.close()
        return b"".join(blocks)
    with warnings.catch_warnings(record=True) as captured:
        raw = asyncio.run(request())
    assert Calendar.from_ical(raw).walk("VEVENT")
    assert not any("synchronous iterators" in str(item.message) for item in captured)


def test_cancelled_asgi_preparation_releases_completed_spool(calendar_project, monkeypatch):
    import asyncio
    import threading
    from plane.app.views.project import calendar_feed as view
    feed = calendar_project[-2]
    ready, released = threading.Event(), threading.Event()
    exports = []
    original = view.prepare_feed
    def delayed(token, headers):
        export = original(token, headers)
        exports.append(export)
        ready.set()
        released.wait(timeout=5)
        return export
    monkeypatch.setattr(view, "prepare_feed", delayed)
    async def disconnect():
        task = asyncio.create_task(view.project_calendar_feed_async(RequestFactory().get(public_path(feed)), feed.token))
        for _ in range(100):
            if ready.is_set():
                break
            await asyncio.sleep(0.01)
        assert ready.is_set()
        task.cancel()
        released.set()
        with pytest.raises(asyncio.CancelledError):
            await task
        for _ in range(100):
            if exports[0].file.closed:
                break
            await asyncio.sleep(0.01)
        assert exports[0].file.closed
    asyncio.run(disconnect())


def test_serializer_failure_closes_spool_and_records_error(calendar_project, monkeypatch):
    from plane.utils import calendar_feed
    feed = calendar_project[-2]
    files = []
    original = calendar_feed.SpooledTemporaryFile
    def spool(**kwargs):
        result = original(**kwargs)
        files.append(result)
        return result
    def fail(event):
        raise ValueError("Broken event")
    monkeypatch.setattr(calendar_feed, "SpooledTemporaryFile", spool)
    monkeypatch.setattr(calendar_feed, "serialize_event", fail)
    with pytest.raises(ValueError, match="Broken event"):
        calendar_feed.prepare_feed(feed.token, {})
    assert files[0].closed


def test_cleanup_cannot_make_last_modified_move_backwards(calendar_project, monkeypatch):
    from plane.db.models import CalendarFeed, Issue, Project
    from plane.utils import calendar_feed
    feed, issue = calendar_project[-2:]
    now = timezone.now()
    old = now - timedelta(days=2)
    CalendarFeed.objects.filter(pk=feed.pk).update(created_at=old, updated_at=old)
    Project.objects.filter(pk=feed.project_id).update(updated_at=old)
    Issue.objects.filter(pk=issue.pk).delete()
    client = APIClient()
    previous = client.get(public_path(feed))
    assert Calendar.from_ical(content(previous)).walk("VEVENT")
    previous_modified = previous["Last-Modified"]
    monkeypatch.setattr(calendar_feed.timezone, "now", lambda: now + timedelta(days=31))
    assert calendar_feed.clean_expired_cancellations() == 1
    response = client.get(public_path(feed), HTTP_IF_MODIFIED_SINCE=previous_modified)
    assert response.status_code == 200
    assert not Calendar.from_ical(content(response)).walk("VEVENT")


def test_observability_emits_request_cache_error_and_duration_metrics(calendar_project, monkeypatch):
    from opentelemetry import metrics
    from opentelemetry.sdk.metrics import MeterProvider
    from opentelemetry.sdk.metrics.export import InMemoryMetricReader
    from plane.utils import calendar_feed
    reader = InMemoryMetricReader()
    metrics.set_meter_provider(MeterProvider(metric_readers=[reader]))
    feed = calendar_project[-2]
    export = calendar_feed.prepare_feed(feed.token, {})
    export.file.close()
    assert calendar_feed.prepare_feed(feed.token, {"If-None-Match": export.etag}).file is None
    def disk_full(**kwargs):
        raise OSError("No space left")
    monkeypatch.setattr(calendar_feed, "SpooledTemporaryFile", disk_full)
    with pytest.raises(OSError, match="No space"):
        calendar_feed.prepare_feed(feed.token, {})
    data = reader.get_metrics_data()
    emitted = {metric.name: metric for resource in data.resource_metrics
               for scope in resource.scope_metrics for metric in scope.metrics}
    assert {"feed_requests_total", "feed_generation_duration", "feed_generation_errors",
            "feed_cache_hits", "feed_cache_misses"} <= emitted.keys()
    assert sum(point.value for point in emitted["feed_requests_total"].data.data_points) >= 3
    assert sum(point.value for point in emitted["feed_cache_hits"].data.data_points) >= 1
    assert sum(point.value for point in emitted["feed_generation_errors"].data.data_points) >= 1
    assert sum(point.count for point in emitted["feed_generation_duration"].data.data_points) >= 2
    assert all("token" not in dict(point.attributes) for metric in emitted.values() for point in metric.data.data_points)


@pytest.mark.slow
def test_100k_events_use_bounded_generation_memory(calendar_project):
    import tracemalloc
    from plane.db.models import Issue
    from plane.utils.calendar_feed import prepare_feed
    user, workspace, project, state, feed, issue = calendar_project
    for batch in range(100):
        Issue.all_objects.bulk_create([
            Issue(project=project, workspace=workspace, state=state, name=f"Entry {batch}-{index}",
                  target_date=date(2026, 11, 1)) for index in range(1000)
        ], batch_size=1000)
    tracemalloc.start()
    try:
        export = prepare_feed(feed.token, {})
        _, peak = tracemalloc.get_traced_memory()
    finally:
        tracemalloc.stop()
    try:
        assert export.event_count == 100001
        assert export.file._rolled
        assert peak < 20 * 1024 * 1024
        assert export.file.read(15) == b"BEGIN:VCALENDAR"
    finally:
        export.file.close()
