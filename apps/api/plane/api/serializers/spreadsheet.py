# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only

from rest_framework import serializers

from plane.db.models import SpreadsheetDocument, SpreadsheetFormPublication
from .base import BaseSerializer


class SpreadsheetDocumentSerializer(BaseSerializer):
    publication = serializers.SerializerMethodField()

    class Meta:
        model = SpreadsheetDocument
        fields = [
            "id",
            "name",
            "document_type",
            "status",
            "last_error_code",
            "created_at",
            "updated_at",
            "created_by",
            "publication",
        ]
        read_only_fields = ["id", "status", "last_error_code", "created_at", "updated_at", "created_by"]

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("A spreadsheet name is required.")
        return value

    def get_publication(self, obj):
        publications = getattr(obj, "active_form_publications", None)
        if publications is None:
            publications = obj.form_publications.filter(deleted_at__isnull=True)
        publication = next(
            (item for item in publications if item.view_section_id == obj.grist_form_view_section_id),
            None,
        )
        return SpreadsheetFormPublicationSerializer(publication).data if publication else None


class SpreadsheetFormPublicationSerializer(BaseSerializer):
    public_url = serializers.SerializerMethodField()

    class Meta:
        model = SpreadsheetFormPublication
        fields = ["id", "view_section_id", "access", "enabled", "public_url", "created_at", "updated_at"]
        read_only_fields = ["id", "public_url", "created_at", "updated_at"]

    def get_public_url(self, obj):
        return f"/forms/{obj.id}"
