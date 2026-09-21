import logging
from django.conf import settings
from apps.analysis.groq_service import AlexInterviewer
from .nvidia_provider import NVIDIAProvider

logger = logging.getLogger(__name__)

from .qwen_omni_provider import QwenOmniProvider

def get_llm_provider(
    job_role: str = "Software Engineer",
    category: str = "behavioral",
    difficulty: str = "medium",
    user=None,
    session=None,
    question_count: int = 5,
):
    """
    Factory function to return the correct LLM provider engine based on settings.DEFAULT_LLM_PROVIDER.
    """
    provider_name = getattr(settings, 'DEFAULT_LLM_PROVIDER', 'groq').lower()
    
    if provider_name == 'qwen_omni':
        logger.info(f"Using QwenOmniProvider for LLM engine (role={job_role})")
        return QwenOmniProvider(
            job_role=job_role,
            category=category,
            difficulty=difficulty,
            user=user,
            session=session,
            question_count=question_count
        )

    if provider_name == 'nvidia':
        logger.info(f"Using NVIDIAProvider for LLM engine (role={job_role})")
        return NVIDIAProvider(
            job_role=job_role,
            category=category,
            difficulty=difficulty,
            user=user,
            session=session,
            question_count=question_count
        )
    
    # Default to Groq / AlexInterviewer
    logger.info(f"Using AlexInterviewer (Groq) for LLM engine (role={job_role})")
    return AlexInterviewer(
        job_role=job_role,
        category=category,
        difficulty=difficulty,
        user=user,
        session=session,
        question_count=question_count
    )
