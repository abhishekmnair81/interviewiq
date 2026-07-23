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
            name='AnalysisPipelineLog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('pipeline_name', models.CharField(max_length=100)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('running', 'Running'), ('done', 'Done'), ('failed', 'Failed')], db_index=True, default='pending', max_length=20)),
                ('error_message', models.TextField(blank=True, null=True)),
                ('started_at', models.DateTimeField(blank=True, null=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('session', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='pipeline_logs', to='interview_sessions.interviewsession')),
            ],
            options={
                'verbose_name': 'Analysis Pipeline Log',
                'verbose_name_plural': 'Analysis Pipeline Logs',
                'db_table': 'analysis_pipeline_logs',
                'ordering': ['-started_at'],
            },
        ),
    ]
