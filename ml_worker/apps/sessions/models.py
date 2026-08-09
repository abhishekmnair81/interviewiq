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
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.BEHAVIORAL)
    difficulty = models.CharField(max_length=20, choices=Difficulty.choices, default=Difficulty.MEDIUM)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'questions'

class InterviewSession(models.Model):
    class Status(models.TextChoices):
        QUEUED = 'queued', 'Queued'
        PROCESSING = 'processing', 'Processing'
        DONE = 'done', 'Done'
        FAILED = 'failed', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    question_ref = models.ForeignKey(Question, on_delete=models.SET_NULL, null=True, blank=True)
    question = models.TextField()
    question_category = models.CharField(max_length=20, default='behavioral')
    video_url = models.URLField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.QUEUED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'interview_sessions'
