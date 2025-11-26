from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from django.utils.timezone import now
from django.db.models import Sum

from .models import BreathingSession, UserProgress, BreathPlan
from .serializers import (
    BreathingSessionSerializer, UserProgressSerializer, BreathPlanSerializer
)
from .permissions import IsOwnerOrReadOnly

class BreathPlanViewSet(viewsets.ModelViewSet):
    queryset = BreathPlan.objects.all()
    serializer_class = BreathPlanSerializer
    permission_classes = [IsAuthenticated]

class BreathingSessionViewSet(viewsets.ModelViewSet):
    serializer_class = BreathingSessionSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]

    def get_queryset(self):
        return BreathingSession.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        session = serializer.save(user=self.request.user)
        # update progress
        progress, _ = UserProgress.objects.get_or_create(user=self.request.user)
        progress.total_sessions += 1
        progress.total_minutes += session.duration_seconds // 60
        progress.last_session = session.created_at
        progress.save()

class UserProgressViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserProgressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserProgress.objects.filter(user=self.request.user)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        qs = BreathingSession.objects.filter(user=request.user)
        total_time = qs.aggregate(total=Sum("duration_seconds"))["total"] or 0
        return Response({
            "total_sessions": qs.count(),
            "total_minutes": total_time // 60,
        })