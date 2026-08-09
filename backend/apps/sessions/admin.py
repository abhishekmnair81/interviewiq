from django.contrib import admin
from django.utils.html import format_html
from .models import InterviewSession, QuestionBank, UserQuestionHistory

@admin.register(InterviewSession)
class InterviewSessionAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'question_category', 'status', 'created_at']
    list_filter = ['status', 'question_category']
    search_fields = ['user__email', 'question']
    ordering = ['-created_at']
    readonly_fields = ['id', 'created_at', 'updated_at']

@admin.register(QuestionBank)
class QuestionBankAdmin(admin.ModelAdmin):
    list_display = ['short_text', 'job_role', 'category', 'difficulty', 'topic_tag', 'times_served', 'is_active']
    list_filter = ['job_role', 'category', 'difficulty', 'is_active']
    search_fields = ['text', 'topic_tag', 'job_role']
    ordering = ['job_role', 'category', 'difficulty']
    list_editable = ['is_active']
    readonly_fields = ['id', 'times_served', 'created_at']

    @admin.display(description='Question')
    def short_text(self, obj):
        return obj.text[:80] + ('…' if len(obj.text) > 80 else '')

@admin.register(UserQuestionHistory)
class UserQuestionHistoryAdmin(admin.ModelAdmin):
    list_display = ['user', 'short_question', 'job_role', 'category', 'difficulty', 'served_at']
    list_filter = ['job_role', 'category', 'difficulty']
    search_fields = ['user__email', 'question_bank__text']
    ordering = ['-served_at']
    readonly_fields = ['id', 'served_at']

    actions = ['reset_history_for_user']

    @admin.display(description='Question')
    def short_question(self, obj):
        return obj.question_bank.text[:60] + '…'

    @admin.action(description='Reset selected history entries (allow re-serving these questions)')
    def reset_history_for_user(self, request, queryset):
        count = queryset.count()
        queryset.delete()
        self.message_user(request, f'{count} history entries deleted — questions can be re-served.')
