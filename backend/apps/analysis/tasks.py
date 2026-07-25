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
        from django.utils import timezone
        from apps.sessions.models import InterviewSession
        from apps.analysis.models import AnalysisPipelineLog
        from apps.reports.models import AnalysisReport
        from apps.analysis.pipeline import (
            analyze_speech,
            analyze_facial,
            analyze_answer,
            detect_contradictions,
            generate_report,
        )

        session = InterviewSession.objects.get(id=session_id)
        session.status = InterviewSession.Status.PROCESSING
        session.save(update_fields=['status', 'updated_at'])

        # Use physical disk path for analysis (more reliable than HTTP URL)
        video_path = session.video_local_path or session.video_url
        logger.info(f'[{session_id}] video_path resolved to: {video_path}')

        # ── 1. Speech Pipeline ───────────────────────────────────────────────
        speech_log, _ = AnalysisPipelineLog.objects.get_or_create(
            session=session, pipeline_name='speech'
        )
        speech_log.status = AnalysisPipelineLog.Status.RUNNING
        speech_log.save(update_fields=['status'])
        try:
            speech_res = analyze_speech(video_path=video_path)
            speech_log.status = AnalysisPipelineLog.Status.DONE
        except Exception as e:
            logger.warning(f'Speech pipeline error (non-fatal): {e}')
            speech_res = {'speech_score': 50.0, 'wpm': 140, 'filler_count': 0,
                          'transcript': '', 'speech_feedback': 'Speech analysis unavailable.'}
            speech_log.status = AnalysisPipelineLog.Status.FAILED
            speech_log.error_message = str(e)
        speech_log.completed_at = timezone.now()
        speech_log.save(update_fields=['status', 'completed_at', 'error_message'])


        # ── 2. Facial Pipeline ───────────────────────────────────────────────
        facial_log, _ = AnalysisPipelineLog.objects.get_or_create(
            session=session, pipeline_name='facial'
        )
        facial_log.status = AnalysisPipelineLog.Status.RUNNING
        facial_log.save(update_fields=['status'])
        try:
            facial_res = analyze_facial(video_path=video_path)
            facial_log.status = AnalysisPipelineLog.Status.DONE
        except Exception as e:
            logger.warning(f'Facial pipeline error (non-fatal): {e}')
            facial_res = {'face_score': 50.0, 'eye_contact_percentage': 70.0,
                          'head_stability': 70.0, 'facial_feedback': 'Facial analysis unavailable.'}
            facial_log.status = AnalysisPipelineLog.Status.FAILED
            facial_log.error_message = str(e)
        facial_log.completed_at = timezone.now()
        facial_log.save(update_fields=['status', 'completed_at', 'error_message'])

        # ── 3. Answer Quality Pipeline ───────────────────────────────────────
        answer_log, _ = AnalysisPipelineLog.objects.get_or_create(
            session=session, pipeline_name='answer'
        )
        answer_log.status = AnalysisPipelineLog.Status.RUNNING
        answer_log.save(update_fields=['status'])
        try:
            answer_res = analyze_answer(
                question=session.question,
                transcript=speech_res.get('transcript', ''),
            )
            answer_log.status = AnalysisPipelineLog.Status.DONE
        except Exception as e:
            logger.warning(f'Answer pipeline error (non-fatal): {e}')
            answer_res = {
                'answer_score': 50.0, 'relevance_score': 50.0,
                'star_score': 50.0, 'confidence_score': 50.0,
                'star_components': {}, 'vague_phrases': [], 'vague_count': 0,
                'answer_feedback': 'Answer analysis unavailable.',
            }
            answer_log.status = AnalysisPipelineLog.Status.FAILED
            answer_log.error_message = str(e)
        answer_log.completed_at = timezone.now()
        answer_log.save(update_fields=['status', 'completed_at', 'error_message'])

        # ── 4. Cross-Modal Contradiction Engine ──────────────────────────────
        contradictions = detect_contradictions(
            speech_score=speech_res['speech_score'],
            face_score=facial_res['face_score'],
            answer_score=answer_res['answer_score'],
            wpm=speech_res.get('wpm', 140),
            filler_count=speech_res.get('filler_count', 0),
            eye_contact_pct=facial_res.get('eye_contact_percentage', 80.0),
            star_count=sum(1 for v in answer_res.get('star_components', {}).values() if v),
        )
        if contradictions:
            logger.info(f'[{session_id}] {len(contradictions)} contradiction(s) detected.')

        # ── 5. Final Report ──────────────────────────────────────────────────
        report_data = generate_report(
            speech_res=speech_res,
            facial_res=facial_res,
            answer_res=answer_res,
            contradictions=contradictions,
        )

        AnalysisReport.objects.update_or_create(
            session=session,
            defaults={
                'speech_score': report_data['speech_score'],
                'face_score': report_data['face_score'],
                'answer_score': report_data['answer_score'],
                'overall_score': report_data['overall_score'],
                'transcript': speech_res.get('transcript', ''),
                'speech_metrics': {
                    'wpm': speech_res.get('wpm'),
                    'filler_count': speech_res.get('filler_count'),
                },
                'face_metrics': {
                    'eye_contact_percentage': facial_res.get('eye_contact_percentage'),
                    'head_stability': facial_res.get('head_stability'),
                },
                'answer_metrics': {
                    'relevance_score': answer_res.get('relevance_score'),
                    'star_score': answer_res.get('star_score'),
                    'confidence_score': answer_res.get('confidence_score'),
                    'star_components': answer_res.get('star_components'),
                    'vague_phrases': answer_res.get('vague_phrases'),
                },
                'contradictions': contradictions,
                'improvement_tips': report_data['improvement_tips'],
                'is_partial': any(
                    log.status == AnalysisPipelineLog.Status.FAILED
                    for log in [speech_log, facial_log, answer_log]
                ),
            }
        )

        session.status = InterviewSession.Status.DONE
        session.save(update_fields=['status', 'updated_at'])

        logger.info(
            f'Analysis COMPLETE [{session_id}] — '
            f'Overall: {report_data["overall_score"]} | '
            f'Speech: {report_data["speech_score"]} | '
            f'Face: {report_data["face_score"]} | '
            f'Answer: {report_data["answer_score"]} | '
            f'Contradictions: {len(contradictions)}'
        )
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
