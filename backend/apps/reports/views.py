import io
import textwrap
from django.http import HttpResponse
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import AnalysisReport
from .serializers import AnalysisReportSerializer

class AnalysisReportViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AnalysisReportSerializer

    def get_permissions(self):
        if self.action in ['by_session', 'export_pdf', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        if self.action in ['by_session', 'export_pdf', 'retrieve']:
            return AnalysisReport.objects.select_related('session').all().order_by('-created_at')
        if self.request.user and self.request.user.is_authenticated:
            return AnalysisReport.objects.filter(
                session__user=self.request.user
            ).select_related('session').order_by('-created_at')
        return AnalysisReport.objects.select_related('session').all().order_by('-created_at')

    @action(detail=False, methods=['get'], url_path='by-session/(?P<session_id>[^/.]+)')
    def by_session(self, request, session_id=None):
        try:
            report = AnalysisReport.objects.get(session__id=session_id)
            return Response(AnalysisReportSerializer(report).data)
        except AnalysisReport.DoesNotExist:
            return Response({'error': 'Report not found.'}, status=404)

    @action(detail=True, methods=['get'], url_path='pdf')
    def export_pdf(self, request, pk=None):
        report = self.get_object()
        session = report.session

        def score_bar(score, width=30):
            filled = int((score or 0) / 100 * width)
            return '█' * filled + '░' * (width - filled)

        tips_text = '\n'.join(
            f'  {i + 1}. {tip}' for i, tip in enumerate(report.improvement_tips or [])
        )
        contradictions_text = '\n'.join(
            f'  [{c["severity"].upper()}] {c["message"][:100]}...'
            for c in (report.contradictions or [])
        ) or '  None detected — consistent performance across all modalities.'

        wpm = (report.speech_metrics or {}).get('wpm', 'N/A')
        fillers = (report.speech_metrics or {}).get('filler_count', 'N/A')
        eye_contact = (report.face_metrics or {}).get('eye_contact_percentage', 'N/A')
        head_stability = (report.face_metrics or {}).get('head_stability', 'N/A')
        star_score = (report.answer_metrics or {}).get('star_score', 'N/A')
        relevance = (report.answer_metrics or {}).get('relevance_score', 'N/A')
        confidence = (report.answer_metrics or {}).get('confidence_score', 'N/A')

        transcript_preview = (report.transcript or 'Not available')[:500]
        if len(report.transcript or '') > 500:
            transcript_preview += '...'

        def compute_verdict(level_adjusted_score, level, red_flags):
            if red_flags:
                return "Reject — red flags detected"
            if level in ['senior', 'staff', 'principal']:
                if level_adjusted_score >= 80: return "Strong Hire"
                elif level_adjusted_score >= 65: return "Hire"
                elif level_adjusted_score >= 50: return "Borderline — would need 2nd round"
                else: return "Reject"
            elif level == 'mid':
                if level_adjusted_score >= 75: return "Strong Hire"
                elif level_adjusted_score >= 60: return "Hire"
                elif level_adjusted_score >= 45: return "Borderline"
                else: return "Reject"
            else:
                if level_adjusted_score >= 70: return "Strong Hire"
                elif level_adjusted_score >= 55: return "Hire"
                elif level_adjusted_score >= 40: return "Borderline — coachable"
                else: return "Reject"

        level = report.candidate_level or 'mid'
        level_score = report.level_adjusted_overall or report.overall_score
        verdict = report.verdict or compute_verdict(level_score, level, report.red_flags)
        
        # Save verdict back if not set
        if not report.verdict:
            report.verdict = verdict
            report.save(update_fields=['verdict'])

        red_flags_text = '\n'.join(f'  - {flag}' for flag in (report.red_flags or [])) or '  None detected'
        green_flags_text = '\n'.join(f'  - {flag}' for flag in (report.green_flags or [])) or '  None detected'
        
        evidence_text = []
        if isinstance(report.evidence_quotes, dict):
            for dim, data in report.evidence_quotes.items():
                score = data.get('score', 0)
                evidence = data.get('evidence', 'no evidence')
                evidence_text.append(f"  - {dim.title()} ({score}/100): \"{evidence}\"")
        evidence_str = '\n'.join(evidence_text) or '  No evidence quotes available.'

        content = textwrap.dedent(f"""
        ╔══════════════════════════════════════════════════════════════════╗
        ║              InterviewIQ — AI Interview Analysis Report          ║
        ╚══════════════════════════════════════════════════════════════════╝

        Candidate : {request.user.full_name or request.user.email}
        Email     : {request.user.email}
        Session ID: {session.id}
        Date      : {report.created_at.strftime('%B %d, %Y %H:%M UTC')}
        Category  : {session.question_category.upper()}
        Question  : {session.question[:120]}

        ──────────────────────────────────────────────────────────────────
        HIRING VERDICT (STRICT MODE)
        ──────────────────────────────────────────────────────────────────
        Detected Level : {level.upper()} (Confidence: {report.level_confidence}%)
        Verdict        : {verdict.upper()}

        Overall Score  : {report.overall_score or 0:.1f} / 100  {score_bar(report.overall_score or 0)}
        Level Adjusted : {level_score or 0:.1f} / 100  {score_bar(level_score or 0)}

        ──────────────────────────────────────────────────────────────────
        SCORE SUMMARY
        ──────────────────────────────────────────────────────────────────

        Answer Quality : {report.answer_score or 0:.1f} / 100  {score_bar(report.answer_score or 0)}
        Speech Delivery: {report.speech_score or 0:.1f} / 100  {score_bar(report.speech_score or 0)}
        Facial Presence: {report.face_score or 0:.1f} / 100  {score_bar(report.face_score or 0)}

        ──────────────────────────────────────────────────────────────────
        DETAILED METRICS
        ──────────────────────────────────────────────────────────────────

        Speech Metrics
          Words per Minute (WPM)    : {wpm}
          Filler Words Detected     : {fillers}

        Facial Metrics
          Eye Contact               : {eye_contact}%
          Head Stability            : {head_stability}

        Answer Quality Metrics
          Relevance Score           : {relevance}
          STAR Structure Score      : {star_score}
          Confidence / Clarity      : {confidence}

        ──────────────────────────────────────────────────────────────────
        EVIDENCE & FLAGS
        ──────────────────────────────────────────────────────────────────
        
        Red Flags:
        {red_flags_text}
        
        Green Flags:
        {green_flags_text}
        
        Evidence Quotes by Dimension:
        {evidence_str}

        ──────────────────────────────────────────────────────────────────
        CROSS-MODAL CONTRADICTIONS
        ──────────────────────────────────────────────────────────────────

        {contradictions_text}

        ──────────────────────────────────────────────────────────────────
        IMPROVEMENT TIPS
        ──────────────────────────────────────────────────────────────────

        {tips_text}

        ──────────────────────────────────────────────────────────────────
        TRANSCRIPT PREVIEW
        ──────────────────────────────────────────────────────────────────

        {transcript_preview}

        ══════════════════════════════════════════════════════════════════
        Generated by InterviewIQ AI Coaching Platform
        https://github.com/abhishekmnair81/interviewiq
        ══════════════════════════════════════════════════════════════════
        """).strip()

        buffer = io.BytesIO()
        buffer.write(content.encode('utf-8'))
        buffer.seek(0)

        filename = f"InterviewIQ_Report_{session.id}_{report.created_at.strftime('%Y%m%d')}.txt"
        response = HttpResponse(buffer.read(), content_type='text/plain; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
