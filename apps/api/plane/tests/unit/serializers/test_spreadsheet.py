from plane.api.serializers import SpreadsheetDocumentSerializer
import pytest

from plane.db.models import Project, SpreadsheetDocument, SpreadsheetFormPublication


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


@pytest.mark.django_db
def test_sheet_name_error_explains_that_the_name_is_already_used(workspace, create_user):
    project = Project.objects.create(name="Sheets", identifier="SH", workspace=workspace, created_by=create_user)
    SpreadsheetDocument.objects.create(workspace=workspace, project=project, name="Budget", created_by=create_user)

    serializer = SpreadsheetDocumentSerializer(data={"name": "Budget"}, context={"project_id": project.id})

    assert not serializer.is_valid()
    assert serializer.errors["name"] == ["A sheet named \u201cBudget\u201d already exists in this project."]
