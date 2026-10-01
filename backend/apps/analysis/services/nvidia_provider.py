import os
import logging
from django.conf import settings
from openai import OpenAI
import httpx
from apps.analysis.groq_service import AlexInterviewer

logger = logging.getLogger(__name__)

class NVIDIAProvider(AlexInterviewer):
    """
    Conversational AI Interviewer powered by NVIDIA NIM (nvidia/llama-3.1-nemotron-70b-instruct).
    Inherits from AlexInterviewer to maintain 100% compatibility with the existing
    engine state machine and methods.
    """
    
    def __init__(
        self,
        job_role: str = "Software Engineer",
        category: str = "behavioral",
        difficulty: str = "medium",
        user=None,
        session=None,
        question_count: int = 5,
    ):
        # Call superclass init to setup all state (job_role, session, etc.)
        super().__init__(
            job_role=job_role,
            category=category,
            difficulty=difficulty,
            user=user,
            session=session,
            question_count=question_count
        )
        
        # Override the OpenAI client with NVIDIA settings
        providers_config = getattr(settings, 'LLM_PROVIDERS', {})
        nvidia_config = providers_config.get('nvidia', {})
        
        api_key = nvidia_config.get('API_KEY') or getattr(settings, 'NVIDIA_API_KEY', os.environ.get('NVIDIA_API_KEY', ''))
        base_url = nvidia_config.get('BASE_URL') or getattr(settings, 'NVIDIA_BASE_URL', os.environ.get('NVIDIA_BASE_URL', 'https://integrate.api.nvidia.com/v1'))
        self.model = nvidia_config.get('MODEL') or getattr(settings, 'NVIDIA_MODEL', os.environ.get('NVIDIA_MODEL', 'nvidia/llama-3.1-nemotron-70b-instruct'))
        
        self.client = OpenAI(
            api_key=api_key,
            base_url=base_url,
            http_client=httpx.Client()
        )
        
        logger.info(
            "NVIDIAProvider initialized | model=%s | base_url=%s",
            self.model, base_url
        )

    def _call_groq(self, messages, temperature=0.75, max_tokens=120, response_format=None):
        """
        Override the internal LLM caller to use the NVIDIA configuration and handle NVIDIA specific fallbacks or errors.
        """
        base_kwargs = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        try:
            kwargs = dict(base_kwargs)
            if response_format:
                kwargs["response_format"] = response_format
            response = self.client.chat.completions.create(**kwargs)
            return response.choices[0].message.content
        except Exception as e:
            # Some NVIDIA NIM models reject the `response_format` param (or other
            # optional kwargs) with a 4xx. Retry once WITHOUT it before giving up,
            # so JSON-mode incompatibility doesn't silently break resume parsing.
            logger.error(f"NVIDIA NIM call failed (model={self.model}): {e}")
            if response_format:
                try:
                    logger.warning("Retrying NVIDIA call without response_format …")
                    response = self.client.chat.completions.create(**base_kwargs)
                    return response.choices[0].message.content
                except Exception as e2:
                    logger.error(f"NVIDIA NIM retry (no response_format) also failed: {e2}")
            return None
