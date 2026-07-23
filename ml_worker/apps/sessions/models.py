import uuid
from django.db import models


class InterviewSession(models.Model):

    class Status(models.TextChoices):
        QUEUED     = 'queued',     'Queued'
        PROCESSING = 'processing', 'Processing'
        DONE       = 'done',       'Done'
        FAILED     = 'failed',     'Failed'

    class QuestionCategory(models.TextChoices):
        HR           = 'hr',           'HR'
        BEHAVIORAL   = 'behavioral',   'Behavioral'
        TECHNICAL    = 'technical',    'Technical'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='sessions'
    )
    question = models.TextField()
    question_category = models.CharField(
        max_length=20,
        choices=QuestionCategory.choices,
        default=QuestionCategory.BEHAVIORAL
    )
    video_url = models.URLField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.QUEUED,
        db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'interview_sessions'

    def __str__(self):
        return f'Session {self.id} [{self.status}]'
