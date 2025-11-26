from typing import Optional, Tuple
from django.contrib.auth import get_user_model
from rest_framework.authentication import BaseAuthentication
from rest_framework import exceptions
from django.conf import settings

import os
import firebase_admin
from firebase_admin import auth as firebase_auth, credentials

# Initialize Firebase once ()
if not firebase_admin._apps:
    path = os.getenv("FIREBASE_CERT_PATH")
    try:
        if path and os.path.exists(path):
            cred = credentials.Certificate(path)
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app()
    except Exception:
        # don't crash on dev
        pass

class FirebaseAuthentication(BaseAuthentication):
    """
    Authorization: Bearer <Firebase ID token>
    Maps uid->Django user (by firebase_uid) and fills email when present.
    """

    def authenticate(self, request) -> Optional[Tuple[object, None]]:
        header = request.META.get("HTTP_AUTHORIZATION", "")
        if not header:
            return None
        parts = header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise exceptions.AuthenticationFailed("Invalid Authorization header. Use 'Bearer <token>'.")

        token = parts[1]
        try:
            decoded = firebase_auth.verify_id_token(token)
        except Exception as e:
            raise exceptions.AuthenticationFailed("Invalid or expired Firebase ID token.") from e

        uid = decoded.get("uid")
        if not uid:
            raise exceptions.AuthenticationFailed("Token missing uid.")

        email = decoded.get("email", None)
        User = get_user_model()

        user, created = User.objects.get_or_create(firebase_uid=uid, defaults={
            "username": email or uid,
            "email": email,
        })
        if created:
            user.set_unusable_password()
            user.save()
        # Note, attach claims for downstream use
        user.firebase_claims = decoded
        return (user, None)