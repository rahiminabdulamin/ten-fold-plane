# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only

from rest_framework import serializers

from plane.db.models import SpreadsheetDocument, SpreadsheetFormPublication
from .base import BaseSerializer


class SpreadsheetDocumentSerializer(BaseSerializer):
    class Meta:
        model = SpreadsheetDocument
        fields = ["id", "name", "document_type", "status", "last_error_code", "created_at", "updated_at", "created_by"]
        read_only_fields = ["id", "status", "last_error_code", "created_at", "updated_at", "created_by"]

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("A spreadsheet name is required.")
        return value


class SpreadsheetFormPublicationSerializer(BaseSerializer):
    public_url = serializers.SerializerMethodField()

    class Meta:
        model = SpreadsheetFormPublication
        fields = ["id", "view_section_id", "access", "enabled", "public_url", "created_at", "updated_at"]
        read_only_fields = ["id", "public_url", "created_at", "updated_at"]

    def get_public_url(self, obj):
        return f"/forms/{obj.id}"
