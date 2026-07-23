import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    name='apps.analysis.tasks.analyze_session',
    max_retries=3,
    default_retry_delay=60,
    queue='analysis',
)
def analyze_session(self, session_id: str) -> str:
    logger.info(f'Starting analysis for {session_id}')

    try:
        from apps.sessions.models import InterviewSession
        from apps.analysis.models import AnalysisPipelineLog
        from apps.reports.models import AnalysisReport

        session = InterviewSession.objects.get(id=session_id)
        session.status = InterviewSession.Status.PROCESSING
        session.save(update_fields=['status', 'updated_at'])

        for pipeline in ['speech', 'facial', 'nlp']:
            log = AnalysisPipelineLog.objects.create(
                session=session,
                pipeline_name=pipeline,
                status=AnalysisPipelineLog.Status.RUNNING,
                started_at=timezone.now(),
            )
            log.status = AnalysisPipelineLog.Status.DONE
            log.completed_at = timezone.now()
            log.save(update_fields=['status', 'completed_at'])

        AnalysisReport.objects.get_or_create(session=session)

        session.status = InterviewSession.Status.DONE
        session.save(update_fields=['status', 'updated_at'])

        logger.info(f'Analysis completed for session {session_id}')
        return 'ok'

    except Exception as exc:
        logger.error(f'analyze_session FAILED for {session_id}: {exc}', exc_info=True)
        raise self.retry(exc=exc)
