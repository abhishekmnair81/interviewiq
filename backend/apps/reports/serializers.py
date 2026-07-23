from rest_framework import serializers
from .models import AnalysisReport


class AnalysisReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalysisReport
        fields = [
            'id', 'session', 'speech_score', 'face_score', 'answer_score',
            'overall_score', 'transcript', 'speech_metrics', 'face_metrics',
            'answer_metrics', 'contradictions', 'improvement_tips',
            'is_partial', 'created_at'
        ]
        read_only_fields = ['id', 'session', 'created_at']
