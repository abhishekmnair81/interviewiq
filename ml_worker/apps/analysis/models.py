import uuid
from django.db import models


class AnalysisPipelineLog(models.Model):

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        RUNNING = 'running', 'Running'
        DONE    = 'done',    'Done'
        FAILED  = 'failed',  'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        'interview_sessions.InterviewSession',
        on_delete=models.CASCADE,
        related_name='pipeline_logs'
    )
    pipeline_name = models.CharField(max_length=100)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True
    )
    error_message = models.TextField(blank=True, null=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'analysis_pipeline_logs'

    def __str__(self):
        return f'{self.pipeline_name} [{self.status}]'
