from django.contrib import admin
from django.contrib.auth import get_user_model
from .models import BreathingSession, UserProgress, BreathPlan

# Register your models here.
User = get_user_model()

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("id", "username", "email", "firebase_uid")
    search_fields = ("username", "email", "firebase_uid")

@admin.register(BreathPlan)
class BreathPlanAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "inhale_ms", "hold_ms", "exhale_ms", "is_public")
    search_fields = ("name",)

@admin.register(BreathingSession)
class BreathingSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "plan", "duration_seconds", "created_at")
    list_filter = ("plan", "created_at")
    search_fields = ("user__username", "user__email")

@admin.register(UserProgress)
class UserProgressAdmin(admin.ModelAdmin):
    list_display = ("user", "total_sessions", "total_minutes", "last_session")
    search_fields = ("user__username", "user__email")
