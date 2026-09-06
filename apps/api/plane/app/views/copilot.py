from datetime import timedelta

import jwt
from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response

from plane.app.views.base import BaseAPIView


class CopilotIdentityEndpoint(BaseAPIView):
    def get(self, request):
        secret = getattr(settings, "COPILOT_IDENTITY_TOKEN_SECRET", "")
        if not secret:
            return Response({"error": "CopilotKit is not configured"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        issued_at = timezone.now()
        expires_at = issued_at + timedelta(minutes=5)
        name = request.user.display_name or request.user.first_name or request.user.username or "Plane user"
        token = jwt.encode(
            {
                "sub": str(request.user.id),
                "name": name,
                "iss": "plane",
                "aud": "copilotkit",
                "iat": issued_at,
                "exp": expires_at,
            },
            secret,
            algorithm="HS256",
        )
        return Response({"token": token, "expires_at": expires_at.isoformat()}, status=status.HTTP_200_OK)
