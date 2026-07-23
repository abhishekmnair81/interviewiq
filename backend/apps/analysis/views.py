from rest_framework import viewsets, permissions
from .models import AnalysisPipelineLog
from .serializers import AnalysisPipelineLogSerializer


class AnalysisPipelineLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AnalysisPipelineLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return AnalysisPipelineLog.objects.filter(session__user=self.request.user)
