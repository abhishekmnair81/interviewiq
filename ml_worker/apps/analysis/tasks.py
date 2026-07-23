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
    return 'ok'
