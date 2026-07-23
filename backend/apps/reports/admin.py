from django.contrib import admin
from .models import AnalysisReport


@admin.register(AnalysisReport)
class AnalysisReportAdmin(admin.ModelAdmin):
    list_display = ['id', 'session', 'overall_score', 'speech_score', 'face_score', 'answer_score', 'is_partial', 'created_at']
    list_filter = ['is_partial']
    search_fields = ['session__id', 'session__user__email']
    ordering = ['-created_at']
    readonly_fields = ['id', 'created_at']
