import json
import asyncio
import base64
import os
import httpx
import logging
import uuid
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from apps.sessions.models import InterviewSession
from apps.analysis.services.question_generator import InterviewQuestionGenerator
from apps.analysis.services.answer_evaluator import StrictAnswerEvaluator
from apps.analysis.services.level_detector import CandidateLevelDetector

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
            question = await database_sync_to_async(self.generator.generate_next_question)(
                session=self.session
            )
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
                try:
                    next_question = await database_sync_to_async(self.generator.generate_next_question)(
                        session=self.session,
                        last_answer=transcript
                    )
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
        elif count < 8:
            session.interview_phase = 'technical'
        elif count < 10:
            session.interview_phase = 'situational'
        else:
            session.interview_phase = 'closing'

    def _pick_from_question_bank(self):
        # Fallback to a static question from the database
        qb = QuestionBank.objects.filter(is_active=True).order_by('?').first()
        if qb:
            return qb.text
        return "Could you tell me more about your previous experience?"

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
