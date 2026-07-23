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
    default_retry_delay=10,
    queue='analysis',
)
def analyze_session(self, session_id: str) -> str:
    logger.info(f'Starting multimodal analysis for session_id: {session_id}')

    try:
        from apps.sessions.models import InterviewSession
        from apps.analysis.models import AnalysisPipelineLog
        from apps.reports.models import AnalysisReport
        from apps.analysis.pipeline import analyze_speech, analyze_facial
        from django.utils import timezone

        session = InterviewSession.objects.get(id=session_id)
        session.status = InterviewSession.Status.PROCESSING
        session.save(update_fields=['status', 'updated_at'])

        # 1. Speech Pipeline
        speech_log, _ = AnalysisPipelineLog.objects.get_or_create(session=session, pipeline_name='speech')
        speech_log.status = AnalysisPipelineLog.Status.RUNNING
        speech_log.save(update_fields=['status'])

        speech_res = analyze_speech(video_path=session.video_url)
        speech_log.status = AnalysisPipelineLog.Status.DONE
        speech_log.completed_at = timezone.now()
        speech_log.save(update_fields=['status', 'completed_at'])

        # 2. Facial Pipeline
        facial_log, _ = AnalysisPipelineLog.objects.get_or_create(session=session, pipeline_name='facial')
        facial_log.status = AnalysisPipelineLog.Status.RUNNING
        facial_log.save(update_fields=['status'])

        facial_res = analyze_facial(video_path=session.video_url)
        facial_log.status = AnalysisPipelineLog.Status.DONE
        facial_log.completed_at = timezone.now()
        facial_log.save(update_fields=['status', 'completed_at'])

        # 3. Overall Score & Report Creation
        overall_score = round(0.50 * speech_res['speech_score'] + 0.50 * facial_res['face_score'], 1)

        tips = [
            speech_res['speech_feedback'],
            facial_res['facial_feedback'],
        ]

        AnalysisReport.objects.update_or_create(
            session=session,
            defaults={
                'speech_score': speech_res['speech_score'],
                'face_score': facial_res['face_score'],
                'overall_score': overall_score,
                'transcript': speech_res['transcript'],
                'speech_metrics': {
                    'wpm': speech_res['wpm'],
                    'filler_count': speech_res['filler_count'],
                },
                'face_metrics': {
                    'eye_contact_percentage': facial_res['eye_contact_percentage'],
                    'head_stability': facial_res['head_stability'],
                },
                'improvement_tips': tips,
            }
        )

        session.status = InterviewSession.Status.DONE
        session.save(update_fields=['status', 'updated_at'])

        logger.info(f'Multimodal analysis COMPLETE for session {session_id}. Overall Score: {overall_score}')
        return 'ok'

    except Exception as exc:
        logger.error(f'analyze_session FAILED for {session_id}: {exc}', exc_info=True)
        try:
            session = InterviewSession.objects.get(id=session_id)
            session.status = InterviewSession.Status.FAILED
            session.save(update_fields=['status', 'updated_at'])
        except Exception:
            pass
        raise self.retry(exc=exc)
