from plane.api.serializers import SpreadsheetDocumentSerializer
from plane.db.models import SpreadsheetDocument, SpreadsheetFormPublication


def test_sheet_serializes_without_a_publication():
    document = SpreadsheetDocument(name="Budget", document_type=SpreadsheetDocument.DocumentType.SHEET)
    document.active_form_publications = []

    assert SpreadsheetDocumentSerializer(document).data["publication"] is None


def test_form_serializes_its_default_publication_summary():
    document = SpreadsheetDocument(
        name="Survey",
        document_type=SpreadsheetDocument.DocumentType.FORM,
        grist_form_view_section_id=7,
    )
    publication = SpreadsheetFormPublication(
        spreadsheet=document,
        view_section_id=7,
        share_key="secure-share-key",
        access=SpreadsheetFormPublication.Access.AUTHENTICATED,
    )
    document.active_form_publications = [publication]

    assert SpreadsheetDocumentSerializer(document).data["publication"] == {
        "id": str(publication.id),
        "view_section_id": 7,
        "access": "authenticated",
        "enabled": True,
        "public_url": f"/forms/{publication.id}",
        "created_at": None,
        "updated_at": None,
    }
