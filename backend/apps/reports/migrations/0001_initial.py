import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('interview_sessions', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='AnalysisReport',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('speech_score', models.FloatField(blank=True, null=True)),
                ('face_score', models.FloatField(blank=True, null=True)),
                ('answer_score', models.FloatField(blank=True, null=True)),
                ('overall_score', models.FloatField(blank=True, null=True)),
                ('transcript', models.TextField(blank=True)),
                ('speech_metrics', models.JSONField(blank=True, default=dict)),
                ('face_metrics', models.JSONField(blank=True, default=dict)),
                ('answer_metrics', models.JSONField(blank=True, default=dict)),
                ('contradictions', models.JSONField(blank=True, default=list)),
                ('improvement_tips', models.JSONField(blank=True, default=list)),
                ('is_partial', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('session', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='report', to='interview_sessions.interviewsession')),
            ],
            options={
                'verbose_name': 'Analysis Report',
                'verbose_name_plural': 'Analysis Reports',
                'db_table': 'analysis_reports',
                'ordering': ['-created_at'],
            },
        ),
    ]
