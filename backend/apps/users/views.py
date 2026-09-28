import logging
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserProfileSerializer,
)
from .permissions import IsActiveUser

logger = logging.getLogger(__name__)

class RegisterView(APIView):
    """
    Registers a new user account and returns JWT tokens immediately.
    """
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response(
                {
                    "user": UserProfileSerializer(user).data,
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    """
    Authenticates user credentials and returns access and refresh JWT tokens.
    """
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        serializer = UserLoginSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
            return Response(
                {
                    "user": UserProfileSerializer(user).data,
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
                status=status.HTTP_200_OK
            )

        raw_email = request.data.get('email', 'unknown')
        logger.warning(f"Failed login attempt for email: {raw_email}")
        return Response(
            {"error": "Invalid email or password"},
            status=status.HTTP_401_UNAUTHORIZED
        )

class LogoutView(APIView):
    """
    Blacklists the user's refresh token on logout.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {"error": "Refresh token is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                {"message": "Successfully logged out"},
                status=status.HTTP_200_OK
            )
        except TokenError as e:
            return Response(
                {"error": "Token is invalid or expired"},
                status=status.HTTP_400_BAD_REQUEST
            )

class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    Retrieves or updates the authenticated user's profile information.
    """
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated, IsActiveUser]

    def get_object(self):
        return self.request.user

from django.utils import timezone
from apps.analysis.services.resume_parser import extract_text, build_highlights

class ResumeUploadView(APIView):
    """
    Handles upload, parsing, and deletion of user resumes.
    """
    permission_classes = [IsAuthenticated, IsActiveUser]

    def post(self, request):
        file_obj = request.FILES.get('resume')
        if not file_obj:
            return Response({"error": "No resume file provided."}, status=status.HTTP_400_BAD_REQUEST)

        if file_obj.size > 5 * 1024 * 1024:
            return Response({"error": "File size exceeds 5MB limit."}, status=status.HTTP_400_BAD_REQUEST)

        filename = file_obj.name.lower()
        ext = filename.split('.')[-1] if '.' in filename else ''
        if ext not in ['pdf', 'docx', 'txt']:
            return Response({"error": "Invalid file type. Only PDF, DOCX, or TXT allowed."}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        user.resume_file = file_obj
        user.resume_uploaded_at = timezone.now()
        
        # Parse
        file_obj.seek(0)
        text = extract_text(file_obj, filename)
        user.resume_text = text
        user.resume_highlights = build_highlights(text)
        
        user.save()
        return Response(UserProfileSerializer(user).data, status=status.HTTP_200_OK)

    def delete(self, request):
        user = request.user
        if user.resume_file:
            user.resume_file.delete()
        user.resume_text = None
        user.resume_highlights = None
        user.resume_uploaded_at = None
        user.save()
        return Response(UserProfileSerializer(user).data, status=status.HTTP_200_OK)
