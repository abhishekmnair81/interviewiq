import uuid
from django.db import models

class AnalysisReport(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.OneToOneField(
        'interview_sessions.InterviewSession',
        on_delete=models.CASCADE,
        related_name='report'
    )
    speech_score = models.FloatField(null=True, blank=True)
    face_score = models.FloatField(null=True, blank=True)
    answer_score = models.FloatField(null=True, blank=True)
    overall_score = models.FloatField(null=True, blank=True)
    transcript = models.TextField(blank=True)
    speech_metrics = models.JSONField(default=dict, blank=True)
    face_metrics = models.JSONField(default=dict, blank=True)
    answer_metrics = models.JSONField(default=dict, blank=True)
    contradictions = models.JSONField(default=list, blank=True)
    improvement_tips = models.JSONField(default=list, blank=True)
    is_partial = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'analysis_reports'

    def __str__(self):
        return f'Report for Session {self.session_id}'
