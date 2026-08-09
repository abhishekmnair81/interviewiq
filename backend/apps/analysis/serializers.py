from rest_framework import serializers
from .models import AnalysisPipelineLog

class AnalysisPipelineLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalysisPipelineLog
        fields = [
            'id', 'session', 'pipeline_name', 'status',
            'error_message', 'started_at', 'completed_at'
        ]
        read_only_fields = ['id', 'session', 'started_at', 'completed_at']
