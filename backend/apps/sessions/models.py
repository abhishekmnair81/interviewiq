import uuid
from django.db import models
from django.conf import settings


class Question(models.Model):
    class Category(models.TextChoices):
        HR = 'hr', 'HR'
        BEHAVIORAL = 'behavioral', 'Behavioral'
        TECHNICAL = 'technical', 'Technical'

    class Difficulty(models.TextChoices):
        EASY = 'easy', 'Easy'
        MEDIUM = 'medium', 'Medium'
        HARD = 'hard', 'Hard'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    text = models.TextField()
    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        default=Category.BEHAVIORAL
    )
    difficulty = models.CharField(
        max_length=20,
        choices=Difficulty.choices,
        default=Difficulty.MEDIUM
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'questions'
        verbose_name = 'Question'
        verbose_name_plural = 'Questions'
        ordering = ['-created_at']

    def __str__(self):
        return f'[{self.category.upper()}] {self.text[:50]}'


class InterviewSession(models.Model):

    class Status(models.TextChoices):
        QUEUED = 'queued', 'Queued'
        PROCESSING = 'processing', 'Processing'
        DONE = 'done', 'Done'
        FAILED = 'failed', 'Failed'

    class QuestionCategory(models.TextChoices):
        HR = 'hr', 'HR'
        BEHAVIORAL = 'behavioral', 'Behavioral'
        TECHNICAL = 'technical', 'Technical'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sessions'
    )
    question_ref = models.ForeignKey(
        Question,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sessions'
    )
    question = models.TextField()
    question_category = models.CharField(
        max_length=20,
        choices=QuestionCategory.choices,
        default=QuestionCategory.BEHAVIORAL
    )
    video_url = models.URLField(blank=True, null=True)
    video_local_path = models.TextField(blank=True, null=True)  # Physical disk path for Whisper analysis
    class InterviewMode(models.TextChoices):
        RECORDED = 'recorded', 'Recorded'
        LIVE = 'live', 'Live'

    interview_mode = models.CharField(
        max_length=20,
        choices=InterviewMode.choices,
        default=InterviewMode.RECORDED
    )
    conversation_history = models.JSONField(default=list, blank=True)
    live_face_readings = models.JSONField(default=list, blank=True)
    job_role = models.CharField(max_length=100, default='Software Engineer', blank=True)
    difficulty = models.CharField(max_length=20, default='medium', blank=True)

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
