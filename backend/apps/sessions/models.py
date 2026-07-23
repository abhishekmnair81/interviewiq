import uuid
from django.db import models
from django.conf import settings


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
        settings.AUTH_USER_MODEL,
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
        verbose_name = 'Interview Session'
        verbose_name_plural = 'Interview Sessions'
        ordering = ['-created_at']

    def __str__(self):
        return f'Session {self.id} [{self.status}] — {self.user.email}'
