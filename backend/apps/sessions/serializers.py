from rest_framework import serializers
from .models import InterviewSession


class InterviewSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewSession
        fields = [
            'id', 'user', 'question', 'question_category',
            'video_url', 'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'status', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class InterviewSessionDetailSerializer(InterviewSessionSerializer):
    class Meta(InterviewSessionSerializer.Meta):
        fields = InterviewSessionSerializer.Meta.fields + ['video_url']
