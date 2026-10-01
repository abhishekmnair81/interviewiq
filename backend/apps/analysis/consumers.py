import json
import asyncio
import base64
import os
import logging
import uuid
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from channels.db import database_sync_to_async
import json
import logging
import random
from django.contrib.auth import get_user_model
from apps.sessions.models import InterviewSession, QuestionBank, ProctoringEvent
from .services.question_generator import InterviewQuestionGenerator
from .services.level_detector import CandidateLevelDetector
from .services.answer_evaluator import StrictAnswerEvaluator
from .data.coding_questions import CODING_QUESTIONS
from apps.analysis.services.level_detector import CandidateLevelDetector
from apps.analysis.services.code_runner import OneCompilerRunner

logger = logging.getLogger(__name__)
User = get_user_model()

class InterviewConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for Alex — Live Conversational AI Interviewer.
    Uses InterviewQuestionGenerator for dynamic questions based on context,
    and AnswerEvaluator to assess user answers.
    """

    async def connect(self):
        await self.accept()

        self.session_id = self.scope['url_route']['kwargs'].get('session_id')
        query_string = self.scope.get('query_string', b'').decode('utf-8')

        token = None
        for param in query_string.split('&'):
            if param.startswith('token='):
                token = param.split('=', 1)[1]
                break

        self.user = await self.authenticate_user(token)
        self.session = await self.get_or_create_session(self.session_id, self.user)

        if not self.session:
            await self.send_json({'type': 'error', 'message': 'Could not initialize session.'})
            await self.close(code=4001)
            return

        self.generator = InterviewQuestionGenerator()
        self.evaluator = StrictAnswerEvaluator()
        self.level_detector = CandidateLevelDetector()

    @database_sync_to_async
    def authenticate_user(self, token_str):
        if not token_str:
            return User.objects.first()
        try:
            access_token = AccessToken(token_str)
            user_id = access_token['user_id']
            return User.objects.get(id=user_id)
        except Exception as e:
            logger.warning(f"WebSocket auth failed: {e}")
            return User.objects.first()

    @database_sync_to_async
    def get_or_create_session(self, session_id, user):
        try:
            user_inst = user or User.objects.first()
            if session_id and session_id != 'new':
                try:
                    valid_uuid = uuid.UUID(str(session_id))
                    existing = InterviewSession.objects.filter(id=valid_uuid).first()
                    if existing:
                        return existing
                    return InterviewSession.objects.create(
                        id=valid_uuid,
                        user=user_inst,
                        question="Alex Conversational AI Interview Session",
                        question_category="behavioral",
                        interview_mode="live",
                        status=InterviewSession.Status.PROCESSING
                    )
                except ValueError:
                    pass

            return InterviewSession.objects.create(
                user=user_inst,
                question="Alex Conversational AI Interview Session",
                question_category="behavioral",
                interview_mode="live",
                status=InterviewSession.Status.PROCESSING
            )
        except Exception as e:
            logger.error(f"Error fetching/creating session: {e}")
            return None

    @database_sync_to_async
    def append_face_reading(self, data):
        if self.session:
            readings = self.session.live_face_readings or []
            readings.append(data)
            self.session.live_face_readings = readings
            self.session.save(update_fields=['live_face_readings', 'updated_at'])

    async def receive_json(self, content):
        msg_type = content.get('type') or content.get('action')

        if msg_type in ['user_ready', 'start']:
            if not getattr(self.session, 'used_resume', False) or not getattr(self.session, 'resume_highlights', None):
                await self.send_json({
                    'type': 'error',
                    'reason': 'resume_required',
                    'message': 'Upload your resume to start a personalized interview.'
                })
                await self.close(code=4000)
                return

            try:
                question = await database_sync_to_async(self.generator.generate_next_question)(
                    session=self.session
                )
            except ValueError as e:
                if str(e) == "resume_required":
                    await self.send_json({
                        'type': 'error',
                        'reason': 'resume_required',
                        'message': 'Upload your resume to start a personalized interview.'
                    })
                    await self.close(code=4000)
                    return
                raise
            except Exception as e:
                logger.warning(f"LLM generation failed for first question: {e}. Falling back to QuestionBank.")
                question = await database_sync_to_async(self._pick_from_question_bank)()

            await self._save_question(question)
            
            await self.send_json({
                'type': 'alex_speaking',
                'text': question,
                'is_complete': False,
                'exchange_count': self.session.questions_asked_count,
                'expression': 'encouraging',
            })

        elif msg_type in ['user_spoke', 'answer']:
            transcript = (content.get('transcript') or content.get('data', {}).get('transcript') or '').strip()

            if not transcript:
                await self.send_json({
                    'type': 'error',
                    'message': "I didn't catch that, could you say that again?"
                })
                return

            # 1. Save answer
            await self._save_answer(transcript)

            # 2. Detect Level
            level_data = await database_sync_to_async(self.level_detector.detect)(self.session)
            candidate_level = level_data.get('level', 'mid')

            # 3. Get last question
            history = self.session.conversation_history or []
            last_q = "Please tell me more."
            for msg in reversed(history):
                if msg.get('role') == 'assistant' and msg.get('content') != transcript:
                    last_q = msg.get('content')
                    break

            # 4. Evaluate answer strictly
            evaluation = await database_sync_to_async(self.evaluator.evaluate)(
                session=self.session,
                question=last_q,
                answer=transcript,
                level=candidate_level
            )
            await self._update_session_metadata(evaluation)

            # 3. Check if interview is over (10 questions)
            is_done = self.session.questions_asked_count >= 10

            if is_done:
                # 4a. Generate closing remark and finish
                next_question = "Thank you so much for your time today. I have all the information I need. I'm compiling your interview report now!"
                emotion = 'impressed'
                await self.trigger_session_analysis()
            else:
                # 4b. Generate next question
                if self.session.questions_asked_count == 6:
                    # Inject coding challenge — resume-grounded whenever possible.
                    import random

                    selected_qs = []

                    if getattr(self.session, 'used_resume', False) and getattr(self.session, 'resume_highlights', None):
                        from apps.analysis.services.coding_question_generator import CodingQuestionGenerator
                        generator = CodingQuestionGenerator()
                        level_data = await database_sync_to_async(self.level_detector.detect)(self.session)
                        candidate_level = level_data.get('level', 'mid')

                        try:
                            selected_qs = await database_sync_to_async(generator.generate_challenge_set)(
                                self.session.resume_highlights, candidate_level, 2
                            )
                        except Exception as e:
                            logger.error(f"Failed to generate coding challenges from resume: {e}")

                    if not selected_qs:
                        # Last-resort fallback only when no resume-based question
                        # could be produced (e.g. non-technical resume / LLM down).
                        logger.warning("Using static CODING_QUESTIONS fallback — no resume-grounded challenge available.")
                        lang = random.choice(['Python', 'C', 'Java'])
                        selected_qs = random.sample(CODING_QUESTIONS[lang], min(4, len(CODING_QUESTIONS[lang])))
                        
                    self.session.coding_questions_asked = selected_qs
                    self.session.coding_current_index = 0
                    await database_sync_to_async(self.session.save)()
                    
                    q = selected_qs[0]
                    
                    # 1. Spoken introduction (voice only, brief)
                    await self.send_json({
                        'type': 'alex_speaking',
                        'text': "Let's move to the coding section. You'll see the first problem on the right side of your screen. Take your time.",
                        'is_complete': False,
                        'expression': 'encouraging',
                        'exchange_count': self.session.questions_asked_count
                    })

                    # 2. Structured coding challenge payload (drives the editor panel)
                    await asyncio.sleep(1.0)
                    await self.send_json({
                        'type': 'coding_challenge',
                        'challenge': {
                            'id': q['id'],
                            'index': 1,
                            'total': len(selected_qs),
                            'title': q['title'],
                            'difficulty': q['difficulty'],
                            'language': q['language'],
                            'description': q['description'],
                            'examples': q.get('test_cases', q.get('examples', [])),
                            'starter_code': q.get('starter_code', ''),
                            'time_limit_seconds': 300
                        }
                    })
                    return

                else:
                    try:
                        next_question = await database_sync_to_async(self.generator.generate_next_question)(
                            session=self.session,
                            last_answer=transcript
                        )
                    except ValueError as e:
                        if str(e) == "resume_required":
                            await self.send_json({'type': 'error', 'reason': 'resume_required', 'message': 'Upload your resume to start a personalized interview.'})
                            await self.close(code=4000)
                            return
                        raise
                    except Exception as e:
                        logger.warning(f"LLM generation failed: {e}. Falling back to QuestionBank.")
                        next_question = await database_sync_to_async(self._pick_from_question_bank)()

                    await self._save_question(next_question)
                    emotion = self._pick_emotion(evaluation)

            # 5. Send output
            await self.send_json({
                'type': 'alex_speaking',
                'text': next_question,
                'is_complete': is_done,
                'expression': emotion,
                'exchange_count': self.session.questions_asked_count
            })

        elif msg_type in ['face_reading', 'facial_metrics']:
            face_data = content.get('data') or content.get('metrics') or content
            await self.append_face_reading(face_data)

        elif msg_type in ['end_session', 'finish']:
            await self.trigger_session_analysis()
            await self.send_json({
                'type': 'alex_speaking',
                'text': "It was really great talking with you today! I'm compiling your interview report now...",
                'is_complete': True,
                'exchange_count': self.session.questions_asked_count
            })

        elif msg_type == 'tab_switch_detected':
            await self._handle_proctoring_event('tab_switch')
            if self.session.tab_switch_count >= 2:
                await self.send_json({
                    'type': 'interview_terminated',
                    'reason': 'tab_switching'
                })

        elif msg_type == 'copy_paste_detected':
            await self._handle_proctoring_event('paste')

        elif msg_type == 'submit_code':
            code = content.get('code', '')
            language = content.get('language', '')
            question_id = content.get('question_id', '')
            
            # Append test_case for generated questions if applicable
            code_to_run = code
            qs = self.session.coding_questions_asked or []
            challenge = next((q for q in qs if q.get('id') == question_id), None)
            if challenge and challenge.get('test_case'):
                # For languages like Java/C, appending at the end might be invalid if it contains class/main outside. 
                # But we will trust the LLM to format the test_case properly or have put tests in starter_code.
                code_to_run = code + "\n\n" + challenge['test_case']
            
            # Run code against OneCompiler
            runner = OneCompilerRunner()
            run_result = await database_sync_to_async(runner.run_code)(
                source_code=code_to_run,
                language=language,
                stdin=""
            )
            passed = run_result.get('status') == 'success'
            stdout = run_result.get('stdout', '') or ''
            stderr = run_result.get('stderr', '') or run_result.get('compile_output', '') or ''
            
            # Simple prompt to LLM to evaluate code
            prompt = f"""Evaluate this {language} code for question {question_id}.
Code:
{code}
Stdout:
{stdout}
Stderr:
{stderr}
Give short, spoken feedback as an interviewer (2-3 sentences max)."""
            try:
                feedback = await database_sync_to_async(self.generator.generate_feedback)(
                    prompt=prompt,
                    system_prompt="You are Alex, an AI technical interviewer. Give concise spoken feedback."
                )
            except Exception as e:
                logger.warning(f"Feedback generation failed: {e}")
                feedback = "Good effort! Let's move on."
            
            # Save the submission
            await self._save_coding_submission(question_id, code, language, feedback)
            
            idx = self.session.coding_current_index
            qs = self.session.coding_questions_asked
            
            next_challenge = None
            if idx + 1 < len(qs):
                self.session.coding_current_index += 1
                await database_sync_to_async(self.session.save)()
                
                next_q = qs[self.session.coding_current_index]
                next_challenge = {
                    'id': next_q['id'],
                    'index': self.session.coding_current_index + 1,
                    'total': len(qs),
                    'title': next_q['title'],
                    'difficulty': next_q['difficulty'],
                    'language': next_q['language'],
                    'description': next_q['description'],
                    'examples': next_q.get('test_cases', next_q.get('examples', [])),
                    'starter_code': next_q['starter_code'],
                    'time_limit_seconds': 300
                }
            else:
                self.session.questions_asked_count += 1
                await database_sync_to_async(self.session.save)()
                
                # Pick a normal conversational question since coding is done
                try:
                    next_question = await database_sync_to_async(self.generator.generate_next_question)(
                        session=self.session,
                        last_answer=f"I have completed the coding challenge. The result was: {passed}"
                    )
                except Exception as e:
                    logger.warning(f"LLM generation failed: {e}. Falling back to QuestionBank.")
                    next_question = await database_sync_to_async(self._pick_from_question_bank)()

                await self._save_question(next_question)
                
                # We need to send this to the frontend so Alex continues the interview
                # Note: We send it slightly delayed to let the submission_result modal show up
                async def send_delayed_next_q():
                    await asyncio.sleep(2.0)
                    await self.send_json({
                        'type': 'alex_speaking',
                        'text': next_question,
                        'is_complete': False,
                        'expression': 'impressed',
                        'exchange_count': self.session.questions_asked_count
                    })
                
                asyncio.create_task(send_delayed_next_q())
                
            await self.send_json({
                'type': 'submission_result',
                'passed': passed,
                'feedback': feedback,
                'next_challenge': next_challenge
            })

    def _pick_emotion(self, evaluation):
        score = evaluation.get('score', 0)
        if score >= 85:
            return 'impressed'
        elif score >= 70:
            return 'encouraging'
        elif score >= 50:
            return 'thinking'
        else:
            return 'curious'

    @database_sync_to_async
    def _save_question(self, question_text):
        history = self.session.conversation_history or []
        history.append({"role": "assistant", "content": question_text})
        self.session.conversation_history = history
        self.session.questions_asked_count += 1
        self._advance_phase(self.session)
        self.session.save(update_fields=['conversation_history', 'questions_asked_count', 'interview_phase', 'updated_at'])

    @database_sync_to_async
    def _save_answer(self, answer_text):
        history = self.session.conversation_history or []
        history.append({"role": "user", "content": answer_text})
        self.session.conversation_history = history
        self.session.save(update_fields=['conversation_history', 'updated_at'])

    @database_sync_to_async
    def _update_session_metadata(self, evaluation):
        topics = self.session.topics_covered or []
        for t in evaluation.get("topics", []):
            if t not in topics:
                topics.append(t)
        self.session.topics_covered = topics

        strengths = self.session.candidate_strengths or []
        for s in evaluation.get("strengths", []):
            if s not in strengths:
                strengths.append(s)
        self.session.candidate_strengths = strengths

        weaknesses = self.session.candidate_weaknesses or []
        for w in evaluation.get("weaknesses", []):
            if w not in weaknesses:
                weaknesses.append(w)
        self.session.candidate_weaknesses = weaknesses

        self.session.save(update_fields=['topics_covered', 'candidate_strengths', 'candidate_weaknesses', 'updated_at'])

    def _advance_phase(self, session):
        count = session.questions_asked_count
        if count < 2:
            session.interview_phase = 'intro'
        elif count < 5:
            session.interview_phase = 'behavioral'
        elif count < 7:
            session.interview_phase = 'technical'
        elif count < 9:
            session.interview_phase = 'coding'
        elif count < 10:
            session.interview_phase = 'situational'
        else:
            session.interview_phase = 'closing'

    def _pick_from_question_bank(self):
        # Fallback when the LLM is unavailable. Prefer a resume-grounded question
        # so Alex NEVER asks something unrelated to the candidate's resume; only
        # drop to the generic QuestionBank if there is no resume to draw from.
        resume_q = self._resume_fallback_question()
        if resume_q:
            return resume_q
        qb = QuestionBank.objects.filter(is_active=True).order_by('?').first()
        if qb:
            return qb.text
        return "Could you tell me more about your previous experience?"

    def _resume_fallback_question(self):
        """Build a warm, resume-specific question deterministically (no LLM).

        Walks the parsed resume highlights and skips any item that has already
        been ASKED about (matched against the text of prior questions in the
        conversation history) — not just evaluator-derived topics. This is what
        prevents Alex from repeating the same question when the LLM is down and
        the evaluator therefore never populates topics_covered.
        Returns None if there is no usable resume data.
        """
        highlights = getattr(self.session, 'resume_highlights', None)
        if not highlights or not isinstance(highlights, dict):
            return None

        # Everything Alex has already asked, lower-cased, joined into one blob so
        # we can cheaply check whether a resume label was already referenced.
        asked_blob = " ".join(
            str(m.get('content', '')).lower()
            for m in (self.session.conversation_history or [])
            if m.get('role') == 'assistant'
        )
        covered = [str(t).lower() for t in (self.session.topics_covered or [])]

        def is_new(label):
            if not label:
                return False
            low = str(label).lower()
            if low in covered:
                return False
            # Skip if this exact item was already named in a prior question.
            if low in asked_blob:
                return False
            return True

        # 1) Projects — reference the concrete tech stack when we have it.
        for proj in (highlights.get('projects') or []):
            if isinstance(proj, dict):
                name = proj.get('name')
                if is_new(name):
                    techs = proj.get('technologies') or []
                    tech_note = (f" I see you used {', '.join(techs[:3])} on it —"
                                 if techs else "")
                    return (f"I'd love to hear more about your project \"{name}\".{tech_note} "
                            f"What was your specific role, and what part are you most proud of?")
            elif is_new(proj):
                return (f"I'd love to hear more about your project \"{proj}\". "
                        f"What was your specific role, and what part are you most proud of?")

        # 2) Experience / roles
        for exp in (highlights.get('experience') or []):
            if isinstance(exp, dict):
                role = exp.get('role') or ''
                company = exp.get('company') or ''
                label = (role or company)
                if is_new(label):
                    where = f" at {company}" if company else ""
                    return (f"Tell me about your time as {role}{where}. "
                            f"What was a challenge you worked through there?")
            elif is_new(exp):
                return f"Can you walk me through your experience with {exp}?"

        # 3) Skills
        for skill in (highlights.get('skills') or []):
            if is_new(skill):
                return (f"I see {skill} on your resume. Can you describe a time you "
                        f"used it to solve a real problem?")

        # 4) Certifications (may be dicts {name, issuer, year}) and keywords.
        for cert in (highlights.get('certifications') or []):
            name = cert.get('name') if isinstance(cert, dict) else cert
            if is_new(name):
                issuer = cert.get('issuer') if isinstance(cert, dict) else ''
                from_note = f" from {issuer}" if issuer else ""
                return (f"You earned the {name} certification{from_note} — what motivated "
                        f"you to pursue it, and how have you applied it?")
        for item in (highlights.get('notable_keywords') or []):
            if is_new(item):
                return f"Your resume mentions {item} — could you tell me more about that?"

        # Everything has been asked about — rotate through a few distinct
        # reflective prompts so we still don't repeat verbatim.
        reflective = [
            "Looking back over the experience on your resume, which accomplishment are you most proud of, and why?",
            "Of everything on your resume, which project taught you the most, and what did you take away from it?",
            "If you could deep-dive into one thing from your resume with our team, what would it be and what makes it exciting to you?",
        ]
        asked_count = sum(1 for m in (self.session.conversation_history or []) if m.get('role') == 'assistant')
        return reflective[asked_count % len(reflective)]

    async def trigger_session_analysis(self):
        await database_sync_to_async(self.run_analysis_pipeline)()

    def run_analysis_pipeline(self):
        try:
            from apps.analysis.tasks import analyze_session
            analyze_session(str(self.session.id))
        except Exception as e:
            logger.error(f"Error triggering analysis task for session {self.session.id}: {e}")

    async def disconnect(self, close_code):
        logger.info(f"WebSocket closed for session {self.session_id} with code {close_code}")

    async def _stream_elevenlabs(self, text, voice_id, api_key, expression):
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream"
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": api_key
        }
        payload = {
            "text": text,
            "model_id": "eleven_flash_v2_5",
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}
        }
        
        await self.send_json({
            'type': 'alex_speaking',
            'text': text,
            'is_complete': False,
            'expression': expression,
            'exchange_count': self.session.questions_asked_count
        })
        
        async with httpx.AsyncClient() as client:
            try:
                async with client.stream('POST', url, json=payload, headers=headers) as response:
                    response.raise_for_status()
                    async for chunk in response.aiter_bytes(chunk_size=4096):
                        if chunk:
                            await self.send_json({
                                'type': 'alex_speaking',
                                'audio_chunk': base64.b64encode(chunk).decode('utf-8'),
                                'text': '', 
                                'is_complete': False,
                                'expression': expression,
                                'exchange_count': self.session.questions_asked_count
                            })
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"ElevenLabs TTS error: {e}")
                
        await self.send_json({
            'type': 'alex_speaking',
            'text': '',
            'is_complete': True,
            'expression': expression,
            'exchange_count': self.session.questions_asked_count
        })

    @database_sync_to_async
    def _handle_proctoring_event(self, event_type):
        ProctoringEvent.objects.create(
            session=self.session,
            event_type=event_type
        )
        if event_type == 'tab_switch':
            self.session.tab_switch_count += 1
            if self.session.tab_switch_count >= 2:
                self.session.status = InterviewSession.Status.DISQUALIFIED
            self.session.save(update_fields=['tab_switch_count', 'status', 'updated_at'])

    @database_sync_to_async
    def _save_coding_submission(self, question_id, code, language, feedback):
        subs = self.session.coding_submissions or []
        subs.append({
            'question_id': question_id,
            'code': code,
            'language': language,
            'feedback': feedback
        })
        self.session.coding_submissions = subs
        self.session.save(update_fields=['coding_submissions', 'updated_at'])
