import json
import logging
from django.http import HttpResponse, JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import AnalysisPipelineLog
from .serializers import AnalysisPipelineLogSerializer
from .tts_service import synthesize_neural_audio
from .services.code_runner import OneCompilerRunner

logger = logging.getLogger(__name__)

class AnalysisPipelineLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AnalysisPipelineLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return AnalysisPipelineLog.objects.filter(session__user=self.request.user)

@method_decorator(csrf_exempt, name='dispatch')
class NeuralTTSView(View):
    """
    Synthesize lifelike neural speech audio (Edge Neural TTS / OpenAI TTS).
    Returns audio/mpeg stream.
    """
    def post(self, request):
        try:
            body = json.loads(request.body.decode('utf-8'))
        except Exception:
            body = request.POST

        text = body.get('text', '').strip()
        voice = body.get('voice', 'en-US-GuyNeural')
        provider = body.get('provider', 'edge')

        if not text:
            return JsonResponse({'error': 'text parameter is required'}, status=400)

        try:
            audio_data = synthesize_neural_audio(text, voice=voice, provider=provider)
            if not audio_data:
                return JsonResponse({'error': 'Speech synthesis returned empty audio'}, status=500)

            response = HttpResponse(audio_data, content_type='audio/mpeg')
            response['Content-Length'] = len(audio_data)
            response['Cache-Control'] = 'public, max-age=86400'
            return response
        except Exception as e:
            logger.error(f"TTS synthesis error: {e}")
            return JsonResponse({'error': str(e)}, status=500)

    def get(self, request):
        text = request.GET.get('text', '').strip()
        voice = request.GET.get('voice', 'en-US-GuyNeural')
        provider = request.GET.get('provider', 'edge')

        if not text:
            return JsonResponse({'error': 'text parameter is required'}, status=400)

        try:
            audio_data = synthesize_neural_audio(text, voice=voice, provider=provider)
            if not audio_data:
                return JsonResponse({'error': 'Speech synthesis returned empty audio'}, status=500)

            response = HttpResponse(audio_data, content_type='audio/mpeg')
            response['Content-Length'] = len(audio_data)
            response['Cache-Control'] = 'public, max-age=86400'
            return response
        except Exception as e:
            logger.error(f"TTS synthesis error: {e}")
            return JsonResponse({'error': str(e)}, status=500)

class CodeRunView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        source_code = request.data.get('source_code')
        language = request.data.get('language')
        stdin = request.data.get('stdin', '')

        if not source_code or not language:
            return Response({'error': 'source_code and language are required'}, status=400)

        runner = OneCompilerRunner()
        result = runner.run_code(source_code, language, stdin)
        return Response(result)
