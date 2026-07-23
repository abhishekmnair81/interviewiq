import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


@receiver(post_save, sender='interview_sessions.InterviewSession')
def trigger_analysis_on_queue(sender, instance, created, **kwargs):
    if created and instance.status == 'queued':
        from apps.analysis.tasks import analyze_session
        logger.info(f'[Signal] New session {instance.id} queued — dispatching analyze_session task')
        analyze_session.delay(str(instance.id))
