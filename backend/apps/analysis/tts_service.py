import os
import io
import hashlib
import logging
import asyncio
from pathlib import Path
from django.conf import settings

logger = logging.getLogger(__name__)

CACHE_DIR = Path(getattr(settings, 'BASE_DIR', Path(__file__).resolve().parent.parent.parent)) / 'media' / 'tts_cache'
CACHE_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_VOICE = "en-US-GuyNeural"  # Professional natural human male interviewer voice

async def _synthesize_edge_tts(text: str, voice: str = DEFAULT_VOICE, rate: str = "+0%", pitch: str = "+0Hz") -> bytes:
    """Synthesize speech using Microsoft Edge Neural TTS (zero API key required, realistic human audio)."""
    import edge_tts
    communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
    audio_buffer = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_buffer.write(chunk["data"])
    return audio_buffer.getvalue()

def _synthesize_openai_tts(text: str, voice: str = "onyx") -> bytes:
    """Synthesize speech using OpenAI TTS if OPENAI_API_KEY is configured."""
    from openai import OpenAI
    api_key = getattr(settings, 'OPENAI_API_KEY', os.getenv('OPENAI_API_KEY', ''))
    if not api_key:
        raise ValueError("OPENAI_API_KEY is not set")
    client = OpenAI(api_key=api_key)
    response = client.audio.speech.create(
        model="tts-1",
        voice=voice,
        input=text,
    )
    return response.content

def synthesize_neural_audio(text: str, voice: str = DEFAULT_VOICE, provider: str = "edge") -> bytes:
    """
    Main entrypoint for generating lifelike neural speech.
    Caches audio to disk by md5 hash of (text, voice, provider).
    """
    cleaned_text = (
        text.replace('*', '')
            .replace('_', '')
            .replace('`', '')
            .replace('#', '')
            .strip()
    )
    if not cleaned_text:
        return b""

    cache_key = hashlib.md5(f"{provider}:{voice}:{cleaned_text}".encode('utf-8')).hexdigest()
    cache_file = CACHE_DIR / f"{cache_key}.mp3"

    if cache_file.exists():
        try:
            with open(cache_file, "rb") as f:
                return f.read()
        except Exception as e:
            logger.warning(f"Failed to read TTS cache: {e}")

    audio_bytes = b""
    if provider == "openai":
        try:
            audio_bytes = _synthesize_openai_tts(cleaned_text, voice=voice if voice in ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] else "onyx")
        except Exception as e:
            logger.warning(f"OpenAI TTS failed ({e}), falling back to Edge Neural TTS")
            provider = "edge"

    if not audio_bytes and provider == "edge":
        try:
            audio_bytes = asyncio.run(_synthesize_edge_tts(cleaned_text, voice=voice))
        except Exception as e:
            logger.error(f"Edge Neural TTS generation error: {e}")

    if audio_bytes:
        try:
            with open(cache_file, "wb") as f:
                f.write(audio_bytes)
        except Exception as e:
            logger.warning(f"Could not write TTS cache: {e}")

    return audio_bytes
