"""Project-admin management and anonymous bearer-token publication."""

import asyncio
from urllib.parse import urlsplit

from asgiref.sync import sync_to_async
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from django.http import HttpResponse
from django.core.handlers.asgi import ASGIRequest
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import NotFound
from rest_framework.response import Response

from plane.app.permissions.project import ProjectAdminPermission
from plane.app.views.base import BaseAPIView
from plane.db.models import CalendarFeed, Project, WorkspaceMember
from plane.db.models.calendar_feed import feed_token
from plane.utils.calendar_feed import feed_response, prepare_feed


class FeedSettingsSerializer(serializers.Serializer):
    enabled = serializers.BooleanField(required=False)
    expires_at = serializers.DateTimeField(required=False, allow_null=True)

    def validate(self, attrs):
        if set(self.initial_data) - {"enabled", "expires_at"}:
            raise serializers.ValidationError("Only enabled and expires_at can be changed.")
        if attrs.get("expires_at") and attrs["expires_at"] <= timezone.now():
            raise serializers.ValidationError("Expiry must be in the future.")
        return attrs


def _details(feed):
    if feed is None:
        return None
    origin = settings.WEB_URL or ""
    parsed = urlsplit(origin)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ImproperlyConfigured("WEB_URL must be a public application URL")
    return dict(url=f"{origin.rstrip('/')}/ics/{feed.token}.ics", enabled=feed.enabled,
                expires_at=feed.expires_at, token_rotated_at=feed.token_rotated_at)


class ProjectCalendarFeedEndpoint(BaseAPIView):
    permission_classes = [ProjectAdminPermission]

    def _project(self):
        project = Project.objects.using("default").filter(
            pk=self.project_id, workspace__slug=self.workspace_slug, workspace__deleted_at__isnull=True,
        ).first()
        if project is None or not WorkspaceMember.objects.using("default").filter(
            workspace_id=project.workspace_id, member=self.request.user, is_active=True,
        ).exists():
            raise NotFound()
        return project

    def get(self, request, **kwargs):
        project = self._project()
        response = Response(_details(CalendarFeed.objects.using("default").filter(project=project).first()))
        response["Cache-Control"] = "no-store"
        return response

    def post(self, request, **kwargs):
        serializer = FeedSettingsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = self._project()
        with transaction.atomic(using="default"):
            Project.objects.using("default").select_for_update().get(pk=project.pk)
            feed, created = CalendarFeed.objects.using("default").get_or_create(
                project=project, defaults={"created_by": request.user, **serializer.validated_data},
            )
            if kwargs.get("rotate"):
                if created:
                    raise NotFound()
                feed.token = feed_token()
                feed.token_rotated_at = timezone.now()
                feed.save(using="default", update_fields=["token", "token_rotated_at", "updated_at"])
            response = Response(_details(feed), status=201 if created else 200)
            response["Cache-Control"] = "no-store"
            return response

    def patch(self, request, **kwargs):
        project = self._project()
        serializer = FeedSettingsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic(using="default"):
            Project.objects.using("default").select_for_update().get(pk=project.pk)
            feed = CalendarFeed.objects.using("default").filter(project=project).first()
            if feed is None:
                raise NotFound()
            for key, value in serializer.validated_data.items():
                setattr(feed, key, value)
            feed.save(using="default", update_fields=[*serializer.validated_data, "updated_at"])
            response = Response(_details(feed))
            response["Cache-Control"] = "no-store"
            return response

    def delete(self, request, **kwargs):
        project = self._project()
        with transaction.atomic(using="default"):
            Project.objects.using("default").select_for_update().get(pk=project.pk)
            CalendarFeed.objects.using("default").filter(project=project).delete()
        return Response(status=204)


def project_calendar_feed(request, token):
    if request.method != "GET":
        response = HttpResponse(status=405)
        response["Allow"] = "GET"
        return response
    return feed_response(prepare_feed(token, request.headers))


async def project_calendar_feed_async(request, token):
    if request.method != "GET":
        response = HttpResponse(status=405)
        response["Allow"] = "GET"
        return response
    preparation = asyncio.create_task(sync_to_async(prepare_feed)(token, request.headers))
    try:
        export = await asyncio.shield(preparation)
    except asyncio.CancelledError:
        # A DB worker cannot be cancelled mid-query. Own its eventual file even
        # after the network request disappears, rather than discarding the result.
        def discard(task):
            if not task.cancelled() and task.exception() is None:
                result = task.result()
                if result is not None and result.file is not None:
                    result.file.close()
        preparation.add_done_callback(discard)
        raise
    return feed_response(export, asynchronous=isinstance(request, ASGIRequest))
