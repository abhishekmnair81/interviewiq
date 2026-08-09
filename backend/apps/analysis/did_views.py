"""
D-ID Streaming Avatar Views
Proxies WebRTC signaling between the browser and D-ID API so Alex's face
streams live video synchronized with speech.
"""
from django.http import JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import json
import logging

from apps.analysis.did_service import (
    create_streaming_session,
    send_sdp_answer,
    send_ice_candidate,
    speak_text,
    close_stream,
)

logger = logging.getLogger(__name__)

@method_decorator(csrf_exempt, name='dispatch')
class DIDStreamView(View):
    """Create a new D-ID WebRTC streaming session."""

    def post(self, request):
        try:
            data = create_streaming_session()
            return JsonResponse(data, status=201)
        except ValueError as e:

            return JsonResponse({'error': str(e), 'code': 'NO_API_KEY'}, status=400)
        except Exception as e:
            logger.error(f"D-ID stream create error: {e}")
            return JsonResponse({'error': str(e)}, status=500)

@method_decorator(csrf_exempt, name='dispatch')
class DIDSdpView(View):
    """Send WebRTC SDP answer back to D-ID."""

    def post(self, request, stream_id):
        try:
            body = json.loads(request.body)
            result = send_sdp_answer(
                stream_id=stream_id,
                session_id=body['session_id'],
                answer=body['answer'],
            )
            return JsonResponse(result)
        except Exception as e:
            logger.error(f"D-ID SDP error: {e}")
            return JsonResponse({'error': str(e)}, status=500)

@method_decorator(csrf_exempt, name='dispatch')
class DIDIceView(View):
    """Send ICE candidate to D-ID."""

    def post(self, request, stream_id):
        try:
            body = json.loads(request.body)
            result = send_ice_candidate(
                stream_id=stream_id,
                session_id=body['session_id'],
                candidate=body['candidate'],
            )
            return JsonResponse(result)
        except Exception as e:
            logger.error(f"D-ID ICE error: {e}")
            return JsonResponse({'error': str(e)}, status=500)

@method_decorator(csrf_exempt, name='dispatch')
class DIDSpeakView(View):
    """Make Alex speak text through the live stream."""

    def post(self, request, stream_id):
        try:
            body = json.loads(request.body)
            result = speak_text(
                stream_id=stream_id,
                session_id=body['session_id'],
                text=body['text'],
                voice_id=body.get('voice_id', 'en-US-GuyNeural'),
            )
            return JsonResponse(result)
        except Exception as e:
            logger.error(f"D-ID speak error: {e}")
            return JsonResponse({'error': str(e)}, status=500)

@method_decorator(csrf_exempt, name='dispatch')
class DIDCloseView(View):
    """Close and clean up a D-ID stream."""

    def delete(self, request, stream_id):
        try:
            body = json.loads(request.body)
            ok = close_stream(stream_id=stream_id, session_id=body['session_id'])
            return JsonResponse({'ok': ok})
        except Exception as e:
            logger.error(f"D-ID close error: {e}")
            return JsonResponse({'error': str(e)}, status=500)
