import logging
import threading
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


@receiver(post_save, sender='interview_sessions.InterviewSession')
def trigger_analysis_on_queue(sender, instance, created, **kwargs):
    update_fields = kwargs.get('update_fields')
    should_dispatch = False

    if created and instance.status == 'queued' and instance.video_url:
        should_dispatch = True
    elif update_fields and ('status' in update_fields or 'video_url' in update_fields):
        if instance.status == 'queued' and instance.video_url:
            should_dispatch = True

    if should_dispatch:
        from apps.analysis.tasks import analyze_session
        logger.info(f'[Signal] Session {instance.id} queued with video_url — starting analysis worker thread')

        # Run analysis in background thread so HTTP response is instant & analysis completes immediately
        t = threading.Thread(target=analyze_session, args=(str(instance.id),), daemon=True)
        t.start()

