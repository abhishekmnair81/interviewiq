import json
import logging
import uuid
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from apps.sessions.models import InterviewSession
from apps.analysis.groq_service import AlexInterviewer

logger = logging.getLogger(__name__)
User = get_user_model()


class InterviewConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for Alex — Live Conversational AI Interviewer using Groq.
    Handles user authentication, small talk openings, dynamic turn responses,
    real-time face reading metrics, and automated post-interview report generation.
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

        job_role = getattr(self.session, 'job_role', 'Software Engineer') or 'Software Engineer'
        category = getattr(self.session, 'question_category', 'behavioral') or 'behavioral'
        difficulty = getattr(self.session, 'difficulty', 'medium') or 'medium'

        # Initialize Alex Interviewer instance
        self.interviewer = AlexInterviewer(
            job_role=job_role,
            category=category,
            difficulty=difficulty
        )

        # Restore existing conversation history if reconnecting
        if self.session.conversation_history:
            self.interviewer.conversation_history = self.session.conversation_history
            assistant_turns = [m for m in self.session.conversation_history if m.get('role') == 'assistant']
            self.interviewer.exchange_count = len(assistant_turns)

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
    def save_session_state(self):
        if self.session:
            self.session.conversation_history = self.interviewer.conversation_history
            self.session.interview_mode = "live"
            self.session.save(update_fields=['conversation_history', 'interview_mode', 'updated_at'])

    @database_sync_to_async
    def append_face_reading(self, data):
        if self.session:
            readings = self.session.live_face_readings or []
            readings.append(data)
            self.session.live_face_readings = readings
            self.session.save(update_fields=['live_face_readings', 'updated_at'])

    async def receive_json(self, content):
        msg_type = content.get('type') or content.get('action')

        # ── 1. USER READY (Session Opening) ──────────────────────────────────
        if msg_type in ['user_ready', 'start']:
            opening_text = await database_sync_to_async(self.interviewer.get_opening)()
            await self.save_session_state()

            await self.send_json({
                'type': 'alex_speaking',
                'text': opening_text,
                'is_complete': False,
                'exchange_count': 0
            })

        # ── 2. USER SPOKE (Main Conversation Turn) ─────────────────────────
        elif msg_type in ['user_spoke', 'answer']:
            transcript = (content.get('transcript') or content.get('data', {}).get('transcript') or '').strip()

            if not transcript:
                await self.send_json({
                    'type': 'error',
                    'message': "I didn't catch that, could you say that again?"
                })
                return

            res = await database_sync_to_async(self.interviewer.respond)(transcript)
            await self.save_session_state()

            await self.send_json({
                'type': 'alex_speaking',
                'text': res['text'],
                'is_complete': res['is_complete'],
                'exchange_count': self.interviewer.exchange_count
            })

            if res['is_complete']:
                await self.trigger_session_analysis()

        # ── 3. FACE READING METRICS ──────────────────────────────────────────
        elif msg_type in ['face_reading', 'facial_metrics']:
            face_data = content.get('data') or content.get('metrics') or content
            await self.append_face_reading(face_data)

        # ── 4. END SESSION EARLY ─────────────────────────────────────────────
        elif msg_type in ['end_session', 'finish']:
            self.interviewer.is_complete = True
            await self.save_session_state()
            await self.trigger_session_analysis()

            await self.send_json({
                'type': 'alex_speaking',
                'text': "It was really great talking with you today! I'm compiling your interview report now...",
                'is_complete': True,
                'exchange_count': self.interviewer.exchange_count
            })

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
        await self.save_session_state()
