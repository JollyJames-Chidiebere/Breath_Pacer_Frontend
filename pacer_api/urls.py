from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BreathingSessionViewSet, UserProgressViewSet, BreathPlanViewSet

router = DefaultRouter()
router.register(r"plans", BreathPlanViewSet, basename="plans")
router.register(r"sessions", BreathingSessionViewSet, basename="sessions")
router.register(r"progress", UserProgressViewSet, basename="progress")

urlpatterns = [
    path("", include(router.urls)),
]
