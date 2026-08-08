import os
import json
import logging
import requests
import base64
from pathlib import Path

logger = logging.getLogger(__name__)

D_ID_API_KEY = os.environ.get('D_ID_API_KEY', '')
D_ID_BASE_URL = 'https://api.d-id.com'

# Alex's portrait hosted as base64 or a public URL
# We read the local file and encode it for D-ID if no public URL is set
ALEX_PUBLIC_IMAGE_URL = os.environ.get('ALEX_IMAGE_URL', '')


def _get_auth_headers():
    """Return D-ID Basic Auth headers."""
    encoded = base64.b64encode(f'{D_ID_API_KEY}:'.encode()).decode()
    return {
        'Authorization': f'Basic {encoded}',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }


def upload_alex_image() -> str:
    """
    Upload Alex's portrait to D-ID image storage and return the hosted URL.
    Only needed once — cache the result in env var ALEX_IMAGE_URL.
    """
    if ALEX_PUBLIC_IMAGE_URL:
        return ALEX_PUBLIC_IMAGE_URL

    # Read the local portrait file
    portrait_path = Path(__file__).parent.parent.parent / 'staticfiles' / 'alex_interviewer.png'
    if not portrait_path.exists():
        raise FileNotFoundError(f"Alex portrait not found at {portrait_path}")

    with open(portrait_path, 'rb') as f:
        image_data = f.read()

    # Upload to D-ID
    upload_url = f'{D_ID_BASE_URL}/images'
    encoded_image = base64.b64encode(image_data).decode()

    payload = {
        'image': f'data:image/png;base64,{encoded_image}',
        'name': 'alex_interviewer'
    }

    response = requests.post(
        upload_url,
        headers=_get_auth_headers(),
        json=payload,
        timeout=30
    )

    if response.status_code in (200, 201):
        url = response.json().get('url', '')
        logger.info(f"Alex portrait uploaded to D-ID: {url}")
        return url
    else:
        logger.error(f"D-ID image upload failed: {response.status_code} {response.text}")
        raise Exception(f"D-ID upload failed: {response.text}")


def create_streaming_session() -> dict:
    """
    Create a D-ID Streaming session (WebRTC).
    Returns: { id, offer (SDP), ice_servers }
    """
    if not D_ID_API_KEY:
        raise ValueError("D_ID_API_KEY is not set in environment variables")

    image_url = ALEX_PUBLIC_IMAGE_URL or upload_alex_image()

    payload = {
        'source_url': image_url,
        'driver_url': 'bank://lively/',   # D-ID's built-in natural motion driver
        'config': {
            'stitch': True,
            'fluent': True,
            'pad_audio': 0.0,
            'auto_match': True,
            'reduce_noise': True,
            'normalization_factor': 0.1,
        },
    }

    response = requests.post(
        f'{D_ID_BASE_URL}/talks/streams',
        headers=_get_auth_headers(),
        json=payload,
        timeout=30
    )

    if response.status_code in (200, 201):
        data = response.json()
        logger.info(f"D-ID streaming session created: {data.get('id')}")
        return data
    else:
        logger.error(f"D-ID streaming session creation failed: {response.status_code} {response.text}")
        raise Exception(f"D-ID streaming error: {response.text}")


def send_sdp_answer(stream_id: str, session_id: str, answer: dict) -> dict:
    """Send WebRTC SDP answer back to D-ID."""
    payload = {
        'answer': answer,
        'session_id': session_id,
    }
    response = requests.post(
        f'{D_ID_BASE_URL}/talks/streams/{stream_id}/sdp',
        headers=_get_auth_headers(),
        json=payload,
        timeout=15
    )
    if response.status_code == 200:
        return response.json()
    raise Exception(f"D-ID SDP answer failed: {response.text}")


def send_ice_candidate(stream_id: str, session_id: str, candidate: dict) -> dict:
    """Send ICE candidate to D-ID."""
    payload = {
        'candidate': candidate.get('candidate', ''),
        'sdpMid': candidate.get('sdpMid', '0'),
        'sdpMLineIndex': candidate.get('sdpMLineIndex', 0),
        'session_id': session_id,
    }
    response = requests.post(
        f'{D_ID_BASE_URL}/talks/streams/{stream_id}/ice',
        headers=_get_auth_headers(),
        json=payload,
        timeout=15
    )
    if response.status_code == 200:
        return response.json()
    raise Exception(f"D-ID ICE candidate failed: {response.text}")


def speak_text(stream_id: str, session_id: str, text: str, voice_id: str = 'en-US-GuyNeural') -> dict:
    """
    Make Alex speak the given text through the live stream.
    voice_id: Microsoft Neural TTS voice. GuyNeural = natural male professional voice.
    """
    payload = {
        'session_id': session_id,
        'script': {
            'type': 'text',
            'subtitles': False,
            'provider': {
                'type': 'microsoft',
                'voice_id': voice_id,
                'voice_config': {
                    'style': 'Hopeful',
                }
            },
            'input': text,
        },
        'config': {
            'fluent': True,
            'pad_audio': 0.0,
            'stitch': True,
        },
    }

    response = requests.post(
        f'{D_ID_BASE_URL}/talks/streams/{stream_id}',
        headers=_get_auth_headers(),
        json=payload,
        timeout=20
    )

    if response.status_code in (200, 201):
        return response.json()
    else:
        logger.error(f"D-ID speak failed: {response.status_code} {response.text}")
        raise Exception(f"D-ID speak error: {response.text}")


def close_stream(stream_id: str, session_id: str) -> bool:
    """Close and clean up the D-ID streaming session."""
    try:
        payload = {'session_id': session_id}
        response = requests.delete(
            f'{D_ID_BASE_URL}/talks/streams/{stream_id}',
            headers=_get_auth_headers(),
            json=payload,
            timeout=10
        )
        return response.status_code in (200, 204)
    except Exception as e:
        logger.warning(f"D-ID stream close error: {e}")
        return False
