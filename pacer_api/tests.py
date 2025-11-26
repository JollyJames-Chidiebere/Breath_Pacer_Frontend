from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import BreathingSession

# Create your tests here.

class SimpleModelTest(TestCase):
    def test_create_user_and_session(self):
        User = get_user_model()
        u = User.objects.create(username="u1", firebase_uid="uid1", email="u1@example.com")
        s = BreathingSession.objects.create(user=u, duration_seconds=300, inhale_seconds=4, hold_seconds=2, exhale_seconds=6)
        self.assertEqual(s.user, u)


