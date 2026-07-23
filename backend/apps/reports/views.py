from rest_framework import viewsets, permissions
from .models import AnalysisReport
from .serializers import AnalysisReportSerializer


class AnalysisReportViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AnalysisReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return AnalysisReport.objects.filter(session__user=self.request.user)
