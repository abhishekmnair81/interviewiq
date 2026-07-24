from rest_framework import serializers
from .models import AnalysisReport


class AnalysisReportSerializer(serializers.ModelSerializer):
    session_question = serializers.CharField(source='session.question', read_only=True)
    session_category = serializers.CharField(source='session.question_category', read_only=True)
    session_created_at = serializers.DateTimeField(source='session.created_at', read_only=True)

    class Meta:
        model = AnalysisReport
        fields = [
            'id', 'session', 'session_question', 'session_category', 'session_created_at',
            'speech_score', 'face_score', 'answer_score', 'overall_score',
            'transcript', 'speech_metrics', 'face_metrics', 'answer_metrics',
            'contradictions', 'improvement_tips', 'is_partial', 'created_at',
        ]
        read_only_fields = ['id', 'session', 'created_at']
