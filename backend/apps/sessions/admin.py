from django.contrib import admin
from .models import InterviewSession


@admin.register(InterviewSession)
class InterviewSessionAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'question_category', 'status', 'created_at']
    list_filter = ['status', 'question_category']
    search_fields = ['user__email', 'question']
    ordering = ['-created_at']
    readonly_fields = ['id', 'created_at', 'updated_at']
