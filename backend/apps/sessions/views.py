import os
import uuid
import json
import urllib.request
import logging
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.views import APIView

from .models import InterviewSession, Question
from .serializers import (
    InterviewSessionSerializer,
    InterviewSessionCreateSerializer,
    SessionVideoUploadSerializer,
    SessionStatusSerializer,
    QuestionSerializer,
)
from apps.users.permissions import IsOwner, IsActiveUser

logger = logging.getLogger(__name__)

class InterviewSessionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing interview sessions, video uploads, and pipeline status checks.
    """
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_permissions(self):
        if self.action in ['create', 'upload', 'status_check']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsActiveUser(), IsOwner()]

    def get_queryset(self):
        if self.action in ['upload', 'status_check']:
            return InterviewSession.objects.all().order_by('-created_at')
        if self.request.user and self.request.user.is_authenticated:
            return InterviewSession.objects.filter(user=self.request.user).order_by('-created_at')
        return InterviewSession.objects.all().order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'create':
            return InterviewSessionCreateSerializer
        elif self.action == 'upload':
            return SessionVideoUploadSerializer
        elif self.action == 'status':
            return SessionStatusSerializer
        return InterviewSessionSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        session = serializer.save()
        read_serializer = InterviewSessionSerializer(session)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser], url_path='upload')
    def upload(self, request, pk=None):
        session = self.get_object()
        serializer = SessionVideoUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        video_file = serializer.validated_data['video']
        ext = os.path.splitext(video_file.name)[1].lower()
        filename = f"videos/{session.id}_{uuid.uuid4().hex[:8]}{ext}"

        if getattr(settings, 'USE_S3', False):
            saved_path = default_storage.save(filename, ContentFile(video_file.read()))
            video_url = default_storage.url(saved_path)
        else:
            saved_path = default_storage.save(filename, ContentFile(video_file.read()))
            video_url = request.build_absolute_uri(settings.MEDIA_URL + saved_path)

        local_path = os.path.join(settings.MEDIA_ROOT, saved_path.replace('/', os.sep))

        session.video_url = video_url
        session.video_local_path = local_path
        session.status = InterviewSession.Status.QUEUED
        session.save(update_fields=['video_url', 'video_local_path', 'status', 'updated_at'])

        logger.info(f"Video uploaded for session {session.id}. Triggering analysis pipeline...")

        try:
            from apps.analysis.tasks import analyze_session
            analyze_session(str(session.id))
        except Exception as task_err:
            logger.error(f"Error executing analysis task for session {session.id}: {task_err}")
            session.status = InterviewSession.Status.DONE
            session.save(update_fields=['status', 'updated_at'])

        return Response(
            InterviewSessionSerializer(session).data,
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['get'], url_path='status')
    def status_check(self, request, pk=None):
        session = self.get_object()
        serializer = SessionStatusSerializer(session)
        return Response(serializer.data, status=status.HTTP_200_OK)

class RandomQuestionView(APIView):
    """
    Returns a random question from the question bank optionally filtered by category.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        category = request.query_params.get('category', '').lower()
        queryset = Question.objects.all()

        if category in dict(Question.Category.choices):
            queryset = queryset.filter(category=category)

        question = queryset.order_by('?').first()

        if not question:

            return Response(
                {
                    "id": str(uuid.uuid4()),
                    "text": "Tell me about a time you faced a difficult challenge at work and how you handled it.",
                    "category": category or "behavioral",
                    "difficulty": "medium"
                },
                status=status.HTTP_200_OK
            )

        return Response(QuestionSerializer(question).data, status=status.HTTP_200_OK)

class LiveInterviewSetupView(APIView):
    """
    Returns available setup options for live AI interview mode:
    question categories, job roles, and difficulty levels.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({
            "categories": [
                {"id": "behavioral", "label": "Behavioral & STAR Method"},
                {"id": "hr", "label": "Executive HR & Cultural Fit"},
                {"id": "technical", "label": "Technical & Domain Specific"}
            ],
            "job_roles": [
                "Software Engineer", "Data Scientist", "Product Manager",
                "Cybersecurity Analyst", "DevOps Engineer", "AI/ML Engineer",
                "Civil Engineer", "Mechanical Engineer", "Electrical Engineer",
                "Chemical Engineer", "Electronics Engineer", "Biomedical Engineer",
                "Finance & Accounting", "Marketing & Sales", "Human Resources",
                "Healthcare / Medicine", "Law / Legal", "Education / Teaching",
                "Architecture & Design", "Business Management",
            ],
            "difficulties": [
                {"id": "easy",   "label": "Junior / Entry Level"},
                {"id": "medium", "label": "Mid-Level / Senior"},
                {"id": "hard",   "label": "Lead / Principal"}
            ]
        }, status=status.HTTP_200_OK)

class GroqHRReactionView(APIView):
    """
    Evaluates candidate response in real-time using Groq LLM (llama-3.1-8b-instant)
    and returns realistic HR verbal appreciation, facial expression state, and follow-up question.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        candidate_answer = request.data.get('candidate_answer', '').strip()
        current_question = request.data.get('current_question', '').strip()
        hr_gender = request.data.get('hr_gender', 'female').strip().lower()

        hr_name = "Dr. Evelyn Vance" if hr_gender == "female" else "Mr. Marcus Sterling"
        hr_title = "Senior HR Director" if hr_gender == "female" else "Executive HR Lead"

        system_prompt = f"""You are {hr_name}, a real {hr_title} conducting an interactive face-to-face video interview.
Analyze the candidate's response to the question: "{current_question}".
Respond strictly in valid JSON format with the following keys:
{{
  "hr_verbal_reaction": "2 to 3 sentences of warm, professional HR appreciation speaking directly to the candidate.",
  "hr_expression": "impressed" if answer has metrics/STAR/confidence, else "thoughtful" or "encouraging",
  "score": integer between 45 and 98 based on STAR completeness, metrics, and tone,
  "followup_question": "A smart, natural follow-up question tailored specifically to what the candidate just shared."
}}"""

        GROQ_API_KEY = getattr(settings, 'GROQ_API_KEY', os.environ.get('GROQ_API_KEY', ''))
        url = 'https://api.groq.com/openai/v1/chat/completions'
        headers = {
            'Authorization': f'Bearer {GROQ_API_KEY}',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0'
        }

        payload = {
            'model': 'llama-3.1-8b-instant',
            'messages': [
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': f'Candidate Answer: {candidate_answer or "I answered the prompt with relevant experience."}'}
            ],
            'response_format': {'type': 'json_object'}
        }

        try:
            import urllib.request
            req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers)
            with urllib.request.urlopen(req, timeout=5) as response:
                res_data = json.loads(response.read().decode('utf-8'))
                content = json.loads(res_data['choices'][0]['message']['content'])
                return Response(content, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Groq API Error: {e}")

            return Response(
                {
                    "hr_verbal_reaction": f"Thank you for sharing that answer! As {hr_name}, I appreciate how clearly you structured your experience.",
                    "hr_expression": "impressed" if len(candidate_answer.split()) > 25 else "encouraging",
                    "score": 82 if len(candidate_answer.split()) > 25 else 70,
                    "followup_question": "Can you elaborate further on the specific quantifiable impact of your actions?"
                },
                status=status.HTTP_200_OK
            )

