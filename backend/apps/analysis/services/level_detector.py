import os
import json
import logging
from django.conf import settings
from groq import Groq
import httpx

logger = logging.getLogger(__name__)

class CandidateLevelDetector:
    """Detects candidate's actual level from conversation, resume, and answer depth."""

    LEVELS = ['intern', 'junior', 'mid', 'senior', 'staff', 'principal']

    SYSTEM_PROMPT = """You are an experienced technical interviewer. Based on the candidate's self-description, resume, and their answers so far, classify them into one of these levels:

- intern: 0 years, still learning
- junior: 0-2 years, needs guidance
- mid: 2-5 years, works independently
- senior: 5-8 years, leads projects
- staff: 8-12 years, leads multiple teams
- principal: 12+ years, org-wide impact

Consider:
- Years of experience (if stated)
- Depth of technical explanations
- Whether they mention trade-offs, edge cases, scale
- Whether they discuss leadership, mentorship, architecture
- Specific metrics and outcomes they cite

If unclear, return 'mid' as the default. Also return a confidence score 0-100.

Return ONLY JSON: {"level": "mid", "confidence": 75, "reasoning": "..."}
"""

    def __init__(self):
        llm_providers = getattr(settings, 'LLM_PROVIDERS', {})
        api_key = os.environ.get('GROQ_API_KEY') or llm_providers.get('groq', {}).get('API_KEY')
        if not api_key:
            api_key = "test-api-key"
        self.client = Groq(api_key=api_key.strip("'\""), http_client=httpx.Client(verify=False))
        self.model = "qwen/qwen3.8-27b"

    def detect(self, session) -> dict:
        """Detects the candidate level from the session conversation history."""
        # We can extract the candidate's recent answers and any resume/job role info
        job_role = getattr(session, 'job_role', 'Unknown Role')
        history = session.conversation_history or []
        
        # Build a summarized transcript for the LLM
        transcript = f"Target Role: {job_role}\n\nConversation so far:\n"
        for msg in history:
            role = msg.get('role', 'unknown')
            content = msg.get('content', '')
            transcript += f"{role.capitalize()}: {content}\n"
            
        # Truncate to avoid too many tokens if history is long
        if len(transcript) > 4000:
            transcript = transcript[-4000:]
            
        if not history:
            return {"level": "mid", "confidence": 0, "reasoning": "No history available to detect level."}

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {"role": "user", "content": transcript},
                ],
                temperature=0.1,
                response_format={"type": "json_object"},
            )
            result = json.loads(response.choices[0].message.content.strip())
            
            level = result.get('level', 'mid').lower()
            if level not in self.LEVELS:
                level = 'mid'
                
            return {
                "level": level,
                "confidence": result.get("confidence", 50),
                "reasoning": result.get("reasoning", "Parsed from conversation.")
            }
        except Exception as e:
            logger.error(f"Error detecting level: {e}")
            return {"level": "mid", "confidence": 0, "reasoning": f"Error: {e}"}
