import os
from openai import AsyncOpenAI
from django.conf import settings

class QwenOmniProvider:
    """Qwen2.5-Omni provider for real-time multimodal interviews."""
    
    def __init__(self, job_role="Software Engineer", category="behavioral", difficulty="medium", user=None, session=None, question_count=5):
        self.client = AsyncOpenAI(
            api_key=settings.QWEN_API_KEY,
            base_url=settings.QWEN_BASE_URL,
        )
        self.model = settings.QWEN_OMNI_MODEL
        self.voice = settings.QWEN_VOICE
        self.exchange_count = 0
        
        from apps.analysis.groq_service import ALEX_SYSTEM_PROMPT
        self.system_prompt = ALEX_SYSTEM_PROMPT.format(
            job_role=job_role,
            category=category,
            difficulty=difficulty
        )
        self.conversation_history = []
        self.is_complete = False

    async def get_opening(self):
        messages = [
            {"role": "system", "content": self.system_prompt},
            {
                "role": "system",
                "content": (
                    "[DIRECTOR — OPENING]: Give a 1-sentence warm welcome as Alex, "
                    "then ask ONE simple opening question like 'How are you doing today?' or 'Ready to get started?'. "
                    "Under 18 words total. Do NOT ask any interview question yet."
                ),
            },
        ]
        return await self.generate_with_audio(messages)
        
    async def respond(self, user_message: str):
        user_clean = user_message.strip()
        if not user_clean:
            return {"text": "Sorry, I didn't catch that. Could you say that again?", "is_complete": False}

        self.conversation_history.append({"role": "user", "content": user_clean})
        self.exchange_count += 1
        
        messages = [{"role": "system", "content": self.system_prompt}] + self.conversation_history
        return await self.generate_with_audio(messages)

    async def generate_response(self, messages, stream=True, output_audio=False):
        modalities = ["text", "audio"] if output_audio else ["text"]
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            modalities=modalities,
            audio={"voice": self.voice, "format": "wav"} if output_audio else None,
            stream=stream,
            stream_options={"include_usage": True},
        )
        return response
    
    async def generate_with_audio(self, messages):
        return await self.generate_response(messages, stream=True, output_audio=True)
