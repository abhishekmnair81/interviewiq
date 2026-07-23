import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='InterviewSession',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('question', models.TextField()),
                ('question_category', models.CharField(choices=[('hr', 'HR'), ('behavioral', 'Behavioral'), ('technical', 'Technical')], default='behavioral', max_length=20)),
                ('video_url', models.URLField(blank=True, null=True)),
                ('status', models.CharField(choices=[('queued', 'Queued'), ('processing', 'Processing'), ('done', 'Done'), ('failed', 'Failed')], db_index=True, default='queued', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sessions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Interview Session',
                'verbose_name_plural': 'Interview Sessions',
                'db_table': 'interview_sessions',
                'ordering': ['-created_at'],
            },
        ),
    ]
