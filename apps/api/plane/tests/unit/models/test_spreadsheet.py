# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only

import uuid

from plane.db.models import SpreadsheetDocument, SpreadsheetFormPublication


def test_spreadsheet_document_defaults_to_provisioning():
    document = SpreadsheetDocument(name="Budget")

    assert document.status == SpreadsheetDocument.Status.PROVISIONING
    assert document.grist_document_id is None


def test_form_publication_uses_opaque_id_and_defaults_to_public():
    publication = SpreadsheetFormPublication(view_section_id=7, share_key="secret-share-key")

    assert publication.access == SpreadsheetFormPublication.Access.PUBLIC
    assert isinstance(publication.id, uuid.UUID)
    assert publication.enabled is True
