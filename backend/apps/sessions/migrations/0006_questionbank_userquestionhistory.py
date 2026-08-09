"""
Migration: Add QuestionBank and UserQuestionHistory models.
These models power the smart question deduplication system — ensuring
different users get different questions and repeat users never see
the same question twice until the full pool has been exhausted.
"""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('interview_sessions', '0005_interviewsession_conversation_history_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='QuestionBank',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('job_role', models.CharField(db_index=True, max_length=100)),
                ('category', models.CharField(
                    choices=[('hr', 'HR'), ('behavioral', 'Behavioral'), ('technical', 'Technical')],
                    db_index=True,
                    max_length=20,
                )),
                ('difficulty', models.CharField(
                    choices=[('easy', 'Easy'), ('medium', 'Medium'), ('hard', 'Hard')],
                    db_index=True,
                    max_length=20,
                )),
                ('text', models.TextField()),
                ('topic_tag', models.CharField(blank=True, max_length=80)),
                ('is_active', models.BooleanField(default=True, db_index=True)),
                ('times_served', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'question_bank',
                'verbose_name': 'Question Bank Entry',
                'verbose_name_plural': 'Question Bank Entries',
                'ordering': ['job_role', 'category', 'difficulty'],
            },
        ),
        migrations.CreateModel(
            name='UserQuestionHistory',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='question_history',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('question_bank', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='served_records',
                    to='interview_sessions.questionbank',
                )),
                ('job_role', models.CharField(max_length=100)),
                ('category', models.CharField(max_length=20)),
                ('difficulty', models.CharField(max_length=20)),
                ('session', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='question_tracking',
                    to='interview_sessions.interviewsession',
                )),
                ('served_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'user_question_history',
                'verbose_name': 'User Question History',
                'verbose_name_plural': 'User Question Histories',
                'ordering': ['-served_at'],
                'unique_together': {('user', 'question_bank')},
            },
        ),
    ]
