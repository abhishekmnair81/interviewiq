import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name='apps.analysis.tasks.add_numbers')
def add_numbers(x: int, y: int) -> int:
    logger.info(f"Executing add_numbers task: {x} + {y}")
    return x + y


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

        session = InterviewSession.objects.get(id=session_id)
        session.status = InterviewSession.Status.PROCESSING
        session.save(update_fields=['status', 'updated_at'])

        for pipeline in ['speech', 'facial', 'nlp']:
            AnalysisPipelineLog.objects.create(
                session=session,
                pipeline_name=pipeline,
                status=AnalysisPipelineLog.Status.PENDING,
            )

        logger.info(f'Analysis scaffolded for session {session_id} — ML implementation pending')
        return 'ok'

    except Exception as exc:
        logger.error(f'analyze_session FAILED for {session_id}: {exc}', exc_info=True)
        raise self.retry(exc=exc)
