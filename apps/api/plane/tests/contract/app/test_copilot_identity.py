import jwt
import pytest
from django.test import override_settings
from django.urls import reverse
from rest_framework import status


@pytest.mark.contract
@pytest.mark.django_db
class TestCopilotIdentityEndpoint:
    @override_settings(COPILOT_IDENTITY_TOKEN_SECRET="test-secret")
    def test_issues_a_short_lived_token_for_the_authenticated_user(self, session_client, create_user):
        session_client.force_authenticate(user=create_user)

        response = session_client.get(reverse("copilot-identity"))

        assert response.status_code == status.HTTP_200_OK
        claims = jwt.decode(
            response.data["token"],
            "test-secret",
            algorithms=["HS256"],
            audience="copilotkit",
            issuer="plane",
        )
        assert claims["sub"] == str(create_user.id)
        assert claims["exp"] > claims["iat"]

    def test_rejects_anonymous_requests(self, api_client):
        assert api_client.get(reverse("copilot-identity")).status_code == status.HTTP_401_UNAUTHORIZED
