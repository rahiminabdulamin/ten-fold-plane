from django.urls import path

from plane.api.views.spreadsheet import (
    GristForwardAuthEndpoint,
    GristFormBrandingEndpoint,
    GristPublicFormAuthEndpoint,
    SpreadsheetAgentEndpoint,
    SpreadsheetDetailEndpoint,
    SpreadsheetDuplicateEndpoint,
    SpreadsheetFormDetailEndpoint,
    SpreadsheetFormsEndpoint,
    SpreadsheetLaunchEndpoint,
    SpreadsheetListCreateEndpoint,
)

base = "workspaces/<str:slug>/projects/<uuid:project_id>/spreadsheets"
urlpatterns = [
    path("internal/grist/authorize/", GristForwardAuthEndpoint.as_view(), name="grist-forward-auth"),
    path("internal/grist/authorize-form/", GristPublicFormAuthEndpoint.as_view(), name="grist-form-forward-auth"),
    path("internal/grist/form-branding/", GristFormBrandingEndpoint.as_view(), name="grist-form-branding"),
    path(f"{base}/", SpreadsheetListCreateEndpoint.as_view(), name="spreadsheets"),
    path(f"{base}/<uuid:pk>/", SpreadsheetDetailEndpoint.as_view(), name="spreadsheet-detail"),
    path(f"{base}/<uuid:pk>/launch/", SpreadsheetLaunchEndpoint.as_view(), name="spreadsheet-launch"),
    path(f"{base}/<uuid:pk>/duplicate/", SpreadsheetDuplicateEndpoint.as_view(), name="spreadsheet-duplicate"),
    path(f"{base}/<uuid:pk>/forms/", SpreadsheetFormsEndpoint.as_view(), name="spreadsheet-forms"),
    path(
        f"{base}/<uuid:pk>/forms/<uuid:publication_id>/",
        SpreadsheetFormDetailEndpoint.as_view(),
        name="spreadsheet-form-detail",
    ),
    path(f"{base}/<uuid:pk>/agent/<str:action>/", SpreadsheetAgentEndpoint.as_view(), name="spreadsheet-agent"),
]
