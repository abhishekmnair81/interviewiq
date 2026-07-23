import os
import uuid
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
    permission_classes = [permissions.IsAuthenticated, IsActiveUser, IsOwner]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        return InterviewSession.objects.filter(user=self.request.user).order_by('-created_at')

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

        session.video_url = video_url
        session.status = InterviewSession.Status.QUEUED
        session.save(update_fields=['video_url', 'status', 'updated_at'])

        logger.info(f"Video uploaded for session {session.id}. URL: {video_url}")

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
    permission_classes = [permissions.IsAuthenticated, IsActiveUser]

    def get(self, request):
        category = request.query_params.get('category', '').lower()
        queryset = Question.objects.all()

        if category in dict(Question.Category.choices):
            queryset = queryset.filter(category=category)

        question = queryset.order_by('?').first()

        if not question:
            # Fallback if DB is not seeded yet
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
