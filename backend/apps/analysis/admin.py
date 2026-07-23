from django.contrib import admin
from .models import AnalysisPipelineLog


@admin.register(AnalysisPipelineLog)
class AnalysisPipelineLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'session', 'pipeline_name', 'status', 'started_at', 'completed_at']
    list_filter = ['status', 'pipeline_name']
    search_fields = ['session__id']
    ordering = ['-started_at']
    readonly_fields = ['id', 'started_at', 'completed_at']
