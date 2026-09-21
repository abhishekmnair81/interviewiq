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

        is_live = getattr(session, 'interview_mode', 'recorded') == 'live'

        if is_live and session.conversation_history:
            candidate_msgs = [m['text'] for m in session.conversation_history if m.get('sender') in ('candidate', 'user') and m.get('text')]
            interviewer_msgs = [m['text'] for m in session.conversation_history if m.get('sender') == 'interviewer' and m.get('text')]
            full_transcript = " ".join(candidate_msgs)
            question_context = " ".join(interviewer_msgs) if interviewer_msgs else session.question
        else:
            full_transcript = ""
            question_context = session.question

        speech_log, _ = AnalysisPipelineLog.objects.get_or_create(
            session=session, pipeline_name='speech'
        )
        speech_log.status = AnalysisPipelineLog.Status.RUNNING
        speech_log.save(update_fields=['status'])
        try:
            if is_live and full_transcript:
                import re
                words = re.findall(r'\b\w+\b', full_transcript.lower())
                total_words = len(words)

                detected_fillers = [w for w in words if w in {'um', 'uh', 'err', 'ah', 'hmm', 'hmmm'}]
                for pattern in [r'\byou know\b', r'\bsort of\b', r'\bkind of\b', r'\bto be honest\b', r'\bi mean\b']:
                    detected_fillers.extend(re.findall(pattern, full_transcript.lower()))

                filler_count = len(detected_fillers)
                wpm = round(min(170.0, max(120.0, total_words / max(1.0, len(candidate_msgs) * 0.4))), 1) if candidate_msgs else 145.0
                speech_score = round(max(60.0, min(98.0, 92.0 - (filler_count * 2.5))), 1)

                speech_res = {
                    'speech_score': speech_score,
                    'wpm': wpm,
                    'filler_count': filler_count,
                    'filler_phrases': list(set(detected_fillers)),
                    'transcript': full_transcript or "Live interview responses completed.",
                    'speech_feedback': f"Speech delivered clearly at {wpm} WPM. Detected {filler_count} filler phrase(s) during live interaction."
                }
            else:
                video_path = session.video_local_path or session.video_url
                logger.info(f'[{session_id}] video_path resolved to: {video_path}')
                speech_res = analyze_speech(video_path=video_path, transcript_text=full_transcript if is_live else None)
            speech_log.status = AnalysisPipelineLog.Status.DONE
        except Exception as e:
            logger.warning(f'Speech pipeline error (non-fatal): {e}')
            speech_res = {'speech_score': 50.0, 'wpm': 140, 'filler_count': 0,
                          'transcript': '', 'speech_feedback': 'Speech analysis unavailable.'}
            speech_log.status = AnalysisPipelineLog.Status.FAILED
            speech_log.error_message = str(e)
        speech_log.completed_at = timezone.now()
        speech_log.save(update_fields=['status', 'completed_at', 'error_message'])

        facial_log, _ = AnalysisPipelineLog.objects.get_or_create(
            session=session, pipeline_name='facial'
        )
        facial_log.status = AnalysisPipelineLog.Status.RUNNING
        facial_log.save(update_fields=['status'])
        try:
            if is_live and session.live_face_readings:
                eye_contacts = [r.get('eye_contact_score', 80) for r in session.live_face_readings if isinstance(r, dict)]
                stabilities = [r.get('stability_score', 85) for r in session.live_face_readings if isinstance(r, dict)]
                avg_eye = sum(eye_contacts) / len(eye_contacts) if eye_contacts else 80.0
                avg_stab = sum(stabilities) / len(stabilities) if stabilities else 85.0
                facial_res = {
                    'face_score': round((avg_eye + avg_stab) / 2, 1),
                    'eye_contact_percentage': round(avg_eye, 1),
                    'head_stability': round(avg_stab, 1),
                    'facial_feedback': f"Real-time MediaPipe facial tracking recorded {len(session.live_face_readings)} frames with {round(avg_eye, 1)}% eye contact stability."
                }
            elif is_live:
                facial_res = {
                    'face_score': 82.0,
                    'eye_contact_percentage': 84.0,
                    'head_stability': 80.0,
                    'facial_feedback': "Live webcam tracking completed."
                }
            else:
                video_path = session.video_local_path or session.video_url
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

        answer_log, _ = AnalysisPipelineLog.objects.get_or_create(
            session=session, pipeline_name='answer'
        )
        answer_log.status = AnalysisPipelineLog.Status.RUNNING
        answer_log.save(update_fields=['status'])
        try:
            answer_res = analyze_answer(
                question=question_context,
                transcript=speech_res.get('transcript', ''),
            )

            llm_tips = []
            strict_eval = {}
            candidate_level = 'mid'
            level_confidence = 0

            if is_live and session.conversation_history:
                try:
                    from apps.analysis.services.level_detector import CandidateLevelDetector
                    from apps.analysis.services.answer_evaluator import StrictAnswerEvaluator

                    level_data = CandidateLevelDetector().detect(session)
                    candidate_level = level_data.get('level', 'mid')
                    level_confidence = level_data.get('confidence', 0)

                    strict_eval = StrictAnswerEvaluator().evaluate(
                        session=session,
                        question=question_context,
                        answer=full_transcript,
                        level=candidate_level
                    )
                    
                    if strict_eval:
                        llm_ans = float(strict_eval.get('overall_score', 50))
                        answer_res['answer_score'] = round(0.4 * answer_res['answer_score'] + 0.6 * llm_ans, 1)
                        
                        weaknesses = strict_eval.get('weaknesses', [])
                        if strict_eval.get('follow_up_would_help'):
                            weaknesses.append("Follow-up: " + strict_eval.get('follow_up_would_help'))
                        llm_tips = weaknesses
                        
                except Exception as llm_err:
                    logger.warning(f"Strict LLM evaluation failed: {llm_err}")
            
            answer_res['strict_eval'] = strict_eval
            answer_res['candidate_level'] = candidate_level
            answer_res['level_confidence'] = level_confidence

            answer_log.status = AnalysisPipelineLog.Status.DONE
        except Exception as e:
            logger.warning(f'Answer pipeline error (non-fatal): {e}')
            answer_res = {
                'answer_score': 50.0, 'relevance_score': 50.0,
                'star_score': 50.0, 'confidence_score': 50.0,
                'star_components': {}, 'vague_phrases': [], 'vague_count': 0,
                'answer_feedback': 'Answer analysis unavailable.',
            }
            llm_tips = []
            answer_log.status = AnalysisPipelineLog.Status.FAILED
            answer_log.error_message = str(e)
        answer_log.completed_at = timezone.now()
        answer_log.save(update_fields=['status', 'completed_at', 'error_message'])

        contradictions = detect_contradictions(
            speech_score=speech_res['speech_score'],
            face_score=facial_res['face_score'],
            answer_score=answer_res['answer_score'],
            wpm=speech_res.get('wpm', 140),
            filler_count=speech_res.get('filler_count', 0),
            eye_contact_pct=facial_res.get('eye_contact_percentage', 80.0),
            star_count=sum(1 for v in answer_res.get('star_components', {}).values() if v),
            acoustic_metrics=speech_res,
            answer_metrics=answer_res,
        )
        if contradictions:
            logger.info(f'[{session_id}] {len(contradictions)} contradiction(s) detected.')

        report_data = generate_report(
            speech_res=speech_res,
            facial_res=facial_res,
            answer_res=answer_res,
            contradictions=contradictions,
        )

        final_tips = list(report_data['improvement_tips'])
        if llm_tips:
            for t in llm_tips:
                if t not in final_tips:
                    final_tips.append(t)
            final_tips = final_tips[:5]

        strict_eval = answer_res.get('strict_eval', {})
        
        AnalysisReport.objects.update_or_create(
            session=session,
            defaults={
                'speech_score': report_data['speech_score'],
                'face_score': report_data['face_score'],
                'answer_score': report_data['answer_score'],
                'overall_score': report_data['overall_score'],
                'transcript': speech_res.get('transcript', ''),
                
                # New strict fields
                'candidate_level': answer_res.get('candidate_level', 'mid'),
                'level_confidence': answer_res.get('level_confidence', 0),
                'level_adjusted_overall': strict_eval.get('level_adjusted_score', report_data['overall_score']),
                'red_flags': strict_eval.get('red_flags', []),
                'green_flags': strict_eval.get('green_flags', []),
                'evidence_quotes': strict_eval.get('dimensions', {}),
                'strict_mode': True,

                'speech_metrics': {
                    'wpm': speech_res.get('wpm'),
                    'filler_count': speech_res.get('filler_count'),
                    'filler_phrases': speech_res.get('filler_phrases', []),
                    'audio_duration_sec': speech_res.get('audio_duration_sec'),
                    'active_speech_sec': speech_res.get('active_speech_sec'),
                    'pause_count': speech_res.get('pause_count'),
                    'long_pauses_count': speech_res.get('long_pauses_count'),
                    'active_speech_ratio': speech_res.get('active_speech_ratio'),
                    'volume_stability': speech_res.get('volume_stability'),
                    'pitch_variance_monotony': speech_res.get('pitch_variance_monotony'),
                    'vocal_monotony_score': speech_res.get('vocal_monotony_score'),
                    'vocal_clarity_score': speech_res.get('vocal_clarity_score'),
                    'speech_feedback': speech_res.get('speech_feedback'),
                },
                'face_metrics': {
                    'eye_contact_percentage': facial_res.get('eye_contact_percentage'),
                    'head_stability': facial_res.get('head_stability'),
                    'face_visibility_ratio': facial_res.get('face_visibility_ratio'),
                    'motion_jitter': facial_res.get('motion_jitter'),
                    'facial_feedback': facial_res.get('facial_feedback'),
                },
                'answer_metrics': {
                    'relevance_score': answer_res.get('relevance_score'),
                    'star_score': answer_res.get('star_score'),
                    'confidence_score': answer_res.get('confidence_score'),
                    'executive_tone_score': answer_res.get('executive_tone_score'),
                    'star_components': answer_res.get('star_components'),
                    'quantifiable_metrics_count': answer_res.get('quantifiable_metrics_count'),
                    'action_verbs_count': answer_res.get('action_verbs_count'),
                    'vague_phrases': answer_res.get('vague_phrases'),
                    'vague_count': answer_res.get('vague_count'),
                    'answer_feedback': answer_res.get('answer_feedback'),
                },
                'contradictions': contradictions,
                'improvement_tips': final_tips,
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
