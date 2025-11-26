from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import BreathingSession, UserProgress, BreathPlan

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "firebase_uid", "phone_number"]
        read_only_fields = ["id", "username", "firebase_uid"]

class BreathPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = BreathPlan
        fields = "__all__"

class BreathingSessionSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = BreathingSession
        fields = ["id", "user", "plan", "duration_seconds", "inhale_seconds", "hold_seconds", "exhale_seconds", "device", "created_at"]
        read_only_fields = ["id", "user", "created_at"]

class UserProgressSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = UserProgress
        fields = ["user", "total_sessions", "total_minutes", "last_session"]