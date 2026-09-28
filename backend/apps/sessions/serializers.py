import os
from rest_framework import serializers
from .models import InterviewSession, Question

ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi']
MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024  

class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ('id', 'text', 'category', 'difficulty', 'created_at')
        read_only_fields = ('id', 'created_at')

class InterviewSessionCreateSerializer(serializers.ModelSerializer):
    question_id = serializers.UUIDField(required=False, write_only=True)
    question = serializers.CharField(required=False, allow_blank=True, default='')
    used_resume = serializers.BooleanField(required=False, write_only=True, default=False)

    class Meta:
        model = InterviewSession
        fields = ('id', 'question', 'question_category', 'question_id', 'status', 'created_at', 'used_resume')
        read_only_fields = ('id', 'status', 'created_at')

    def create(self, validated_data):
        question_id = validated_data.pop('question_id', None)
        req_used_resume = validated_data.pop('used_resume', False)
        user = self.context['request'].user

        if question_id:
            try:
                q_obj = Question.objects.get(id=question_id)
                validated_data['question_ref'] = q_obj
                if not validated_data.get('question'):
                    validated_data['question'] = q_obj.text
                if not validated_data.get('question_category'):
                    validated_data['question_category'] = q_obj.category
            except Question.DoesNotExist:
                pass

        if not validated_data.get('question'):
            q_obj = Question.objects.order_by('?').first()
            if q_obj:
                validated_data['question_ref'] = q_obj
                validated_data['question'] = q_obj.text
                validated_data['question_category'] = q_obj.category
            else:
                validated_data['question'] = "Tell me about yourself and your professional background."
                validated_data['question_category'] = 'behavioral'

        if not (user and user.is_authenticated):
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user = User.objects.first()

        validated_data['user'] = user

        if req_used_resume and user and user.is_authenticated and user.resume_text:
            validated_data['used_resume'] = True
            validated_data['resume_text'] = user.resume_text
            validated_data['resume_highlights'] = user.resume_highlights

        return super().create(validated_data)

class InterviewSessionSerializer(serializers.ModelSerializer):
    question_detail = QuestionSerializer(source='question_ref', read_only=True)

    class Meta:
        model = InterviewSession
        fields = (
            'id', 'question', 'question_category', 'question_detail',
            'video_url', 'status', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'user', 'status', 'created_at', 'updated_at')

class SessionVideoUploadSerializer(serializers.Serializer):
    video = serializers.FileField(required=True)

    def validate_video(self, value):
        ext = os.path.splitext(value.name)[1].lower()
        if ext not in ALLOWED_VIDEO_EXTENSIONS:
            raise serializers.ValidationError(
                f"Unsupported file extension '{ext}'. Allowed extensions are: {', '.join(ALLOWED_VIDEO_EXTENSIONS)}"
            )

        if value.size > MAX_VIDEO_SIZE_BYTES:
            raise serializers.ValidationError("File size exceeds maximum limit of 100MB.")

        return value

class SessionStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewSession
        fields = ('id', 'status', 'updated_at')
        read_only_fields = ('id', 'status', 'updated_at')
