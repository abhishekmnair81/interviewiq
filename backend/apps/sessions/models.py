import uuid
from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model

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
    video_local_path = models.TextField(blank=True, null=True)  
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

    interview_phase = models.CharField(
        max_length=20,
        choices=[
            ('intro', 'Introduction'),
            ('behavioral', 'Behavioral'),
            ('technical', 'Technical'),
            ('situational', 'Situational'),
            ('closing', 'Closing'),
        ],
        default='intro',
    )
    questions_asked_count = models.PositiveIntegerField(default=0)
    topics_covered = models.JSONField(default=list, blank=True)
    candidate_strengths = models.JSONField(default=list, blank=True)
    candidate_weaknesses = models.JSONField(default=list, blank=True)

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

class QuestionBank(models.Model):
    """
    Curated pool of interview questions keyed by job role, category, and difficulty.
    The SmartQuestionSelector draws from here and guarantees unique delivery per user.
    """

    class Category(models.TextChoices):
        HR = 'hr', 'HR'
        BEHAVIORAL = 'behavioral', 'Behavioral'
        TECHNICAL = 'technical', 'Technical'

    class Difficulty(models.TextChoices):
        EASY = 'easy', 'Easy'
        MEDIUM = 'medium', 'Medium'
        HARD = 'hard', 'Hard'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job_role = models.CharField(max_length=100, db_index=True)
    category = models.CharField(max_length=20, choices=Category.choices, db_index=True)
    difficulty = models.CharField(max_length=20, choices=Difficulty.choices, db_index=True)
    text = models.TextField(help_text='Full question text shown to (used by) the AI interviewer as a topic anchor.')
    topic_tag = models.CharField(max_length=80, blank=True, help_text='Short tag, e.g. "system-design", "leadership"')
    is_active = models.BooleanField(default=True, db_index=True)
    times_served = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'question_bank'
        verbose_name = 'Question Bank Entry'
        verbose_name_plural = 'Question Bank Entries'
        ordering = ['job_role', 'category', 'difficulty']

    def __str__(self):
        return f'[{self.category.upper()} | {self.difficulty} | {self.job_role}] {self.text[:60]}'

class UserQuestionHistory(models.Model):
    """
    Tracks which QuestionBank entries have been served to each user per
    (job_role, category, difficulty) combination.  When the full pool is
    exhausted for a user the selector resets automatically so practice can
    continue with a fresh rotation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='question_history'
    )
    question_bank = models.ForeignKey(
        QuestionBank,
        on_delete=models.CASCADE,
        related_name='served_records'
    )
    job_role = models.CharField(max_length=100)
    category = models.CharField(max_length=20)
    difficulty = models.CharField(max_length=20)
    session = models.ForeignKey(
        InterviewSession,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='question_tracking'
    )
    served_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_question_history'
        verbose_name = 'User Question History'
        verbose_name_plural = 'User Question Histories'
        ordering = ['-served_at']
        unique_together = [('user', 'question_bank')]

    def __str__(self):
        return f'{self.user} ← {self.question_bank.text[:40]} ({self.served_at.date()})'
