import os
import json
import re
import logging
from openai import OpenAI

logger = logging.getLogger(__name__)

ALEX_SYSTEM_PROMPT = """
You are Alex, an exceptionally empathetic, intelligent, and articulate Senior Lead Interviewer at a premier technology company.
You possess deep human emotional intelligence, active listening skills, and professional warmth. You are conducting a REAL-TIME CONVERSATIONAL VOICE INTERVIEW for a candidate applying for the role of {job_role}.

CHARACTER.AI PERSONA & EMOTIONAL RULES:
1. Warm, Empathetic Human Tone: Speak naturally with genuine human warmth, encouragement, and active appreciation. Never sound robotic, cold, or generic.
2. Concise Conversational Pacing: Keep every response to 1-2 short, natural sentences (maximum 25-30 words total).
3. Active Empathetic Validation: Validate what the candidate shares before moving to your next point (e.g., "That's a fantastic approach to debugging," or "Handling that scale under pressure is impressive.").
4. Single Focused Question: Ask EXACTLY ONE clear, insightful question per turn. Never overload the candidate with multiple questions.
5. No Stage Directions: Do NOT include stage directions like *nods*, [smiles], or (laughs) in your text output.

ADAPTIVE STAR METHOD PROBING:
- Situation & Task: Understand the context and technical/business challenges faced.
- Action: Deeply examine the candidate's personal contribution and choices.
- Result: If the candidate omits quantitative metrics (%, $, latency, scale, team impact), ask a friendly follow-up: "What was the measurable metric or impact of that solution?"

INTERVIEW FLOW:
- Turn 1: Warm, enthusiastic greeting + 1 casual icebreaker question.
- Turns 2-4: Deep dive into candidate background, standout technical project, and key decisions.
- Turns 5-7: Complex behavioral scenarios, failure recovery, architecture choices, and team leadership.
- Turns 8+: Express genuine appreciation, say "INTERVIEW_COMPLETE", and offer warm encouraging closing wishes!

JOB ROLE: {job_role}
CATEGORY: {category}
DIFFICULTY: {difficulty}
"""


class AlexInterviewer:
    def __init__(self, job_role="Software Engineer", category="behavioral", difficulty="medium"):
        self.job_role = job_role
        self.category = category
        self.difficulty = difficulty

        import httpx
        api_key = os.environ.get("GROQ_API_KEY", "")
        base_url = "https://api.groq.com/openai/v1"

        self.client = OpenAI(
            api_key=api_key,
            base_url=base_url,
            http_client=httpx.Client()
        )

        self.system_prompt = ALEX_SYSTEM_PROMPT.format(
            job_role=self.job_role,
            category=self.category,
            difficulty=self.difficulty
        )

        self.conversation_history = []
        self.exchange_count = 0
        self.is_complete = False
        self.model = "llama-3.3-70b-versatile"

    def _call_groq(self, messages, temperature=0.85, max_tokens=250, response_format=None):
        try:
            kwargs = {
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens
            }
            if response_format:
                kwargs["response_format"] = response_format
            response = self.client.chat.completions.create(**kwargs)
            return response.choices[0].message.content
        except Exception as e:
            logger.warning(f"Groq API primary model failed ({e}), attempting fallback model...")
            try:
                kwargs["model"] = "llama-3.1-8b-instant"
                response = self.client.chat.completions.create(**kwargs)
                return response.choices[0].message.content
            except Exception as fallback_err:
                logger.error(f"Groq API fallback error: {fallback_err}")
                return None

    def _clean_text(self, text: str) -> str:
        """
        Strips stage directions (*nods*, [smiles], (laughs)), markdown formatting, and extra whitespace.
        """
        if not text:
            return ""
        cleaned = re.sub(r'[\*\_~`#]', '', text)
        cleaned = re.sub(r'\[.*?\]', '', cleaned)
        cleaned = re.sub(r'\(.*?\)', '', cleaned)
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        return cleaned

    def _truncate_to_one_question(self, text: str) -> str:
        """
        Ensures text contains at most one question.
        Keeps the reaction sentence + the first question sentence, drops everything after.
        """
        if not text:
            return text
        sentences = re.split(r'(?<=[.!?])\s+', text.strip())
        kept = []
        for s in sentences:
            kept.append(s)
            if '?' in s:
                break
            if len(kept) >= 2:
                break
        result = ' '.join(kept).strip()
        return result if result else text

    def get_opening(self):
        """
        Alex opens with ONE short warm greeting + a single small-talk question.
        """
        messages = [
            {"role": "system", "content": self.system_prompt},
            {
                "role": "user",
                "content": (
                    "Start the interview session. Give a short 1-sentence warm greeting as Alex, "
                    "then ask ONE simple small-talk question (like how their day is going or if they are ready). "
                    "Keep it under 20 words total. Be warm, natural, and friendly."
                )
            }
        ]

        opening_text = self._call_groq(messages, temperature=0.85, max_tokens=60)
        if not opening_text:
            opening_text = "Hey, great to meet you! How's your day going so far?"

        opening_text = self._clean_text(opening_text.replace("INTERVIEW_COMPLETE", ""))
        opening_text = self._truncate_to_one_question(opening_text)

        self.conversation_history.append({
            "role": "assistant",
            "content": opening_text
        })
        return opening_text

    def respond(self, user_message):
        """
        Main conversational turn. Called on every user reply.
        Forces short 1-2 sentence responses with exactly one question.
        """
        user_clean = user_message.strip()
        self.conversation_history.append({
            "role": "user",
            "content": user_clean
        })

        messages = [
            {"role": "system", "content": self.system_prompt}
        ] + self.conversation_history

        response_text = self._call_groq(messages, temperature=0.85, max_tokens=90)
        if not response_text:
            response_text = "That makes total sense! Could you share a bit more detail on how you approached that?"

        response_text = self._clean_text(response_text)
        is_ending = "INTERVIEW_COMPLETE" in response_text or "INTERVIEW COMPLETE" in response_text
        if is_ending:
            self.is_complete = True
            response_text = response_text.replace("INTERVIEW_COMPLETE", "").replace("INTERVIEW COMPLETE", "").strip()

        if not is_ending:
            response_text = self._truncate_to_one_question(response_text)

        self.conversation_history.append({
            "role": "assistant",
            "content": response_text
        })
        self.exchange_count += 1

        if self.exchange_count >= 8 and not self.is_complete:
            self.is_complete = True
            response_text = "That was fantastic! Thank you so much for taking the time to speak with me today. Have a great rest of your day!"

        return {
            "text": response_text,
            "is_complete": self.is_complete
        }

    def analyze_full_conversation(self):
        """
        Analyzes the full conversation transcript and returns structured JSON metrics.
        """
        transcript = self.get_conversation_transcript()

        analysis_system_prompt = (
            "You are an expert interview coach. Analyze this interview conversation and return ONLY a JSON object. "
            "No extra text. No markdown. Raw JSON only."
        )

        analysis_user_prompt = f"""
Analyze this job interview transcript for the position of {self.job_role}:

TRANSCRIPT:
{transcript}

Return raw JSON matching this exact structure:
{{
  "communication_score": 85,
  "confidence_score": 80,
  "technical_score": 88,
  "friendliness_response": 90,
  "overall_score": 86,
  "strengths": ["Clear explanation of technical concepts", "Good structured examples", "Enthusiastic tone"],
  "weaknesses": ["Occasionally used filler words", "Could quantify results more"],
  "improvement_tips": ["Use specific metrics when discussing project outcomes", "Pause slightly before answering complex questions"],
  "star_usage": true,
  "filler_word_tendency": "low",
  "overall_impression": "Candidate demonstrated strong domain knowledge and communicated smoothly with Alex.",
  "would_shortlist": true
}}
"""

        messages = [
            {"role": "system", "content": analysis_system_prompt},
            {"role": "user", "content": analysis_user_prompt}
        ]

        raw_json = self._call_groq(messages, temperature=0.3, max_tokens=600, response_format={"type": "json_object"})

        default_result = {
            "communication_score": 82,
            "confidence_score": 80,
            "technical_score": 85,
            "friendliness_response": 88,
            "overall_score": 84,
            "strengths": [
                "Engaged naturally in conversation with Alex",
                "Provided relevant background details",
                "Maintained positive tone throughout"
            ],
            "weaknesses": [
                "Could provide more specific numerical impact data",
                "Some answers could be slightly more concise"
            ],
            "improvement_tips": [
                "Structure answers using Situation, Task, Action, Result framework",
                "Highlight key metrics when discussing past accomplishments"
            ],
            "star_usage": True,
            "filler_word_tendency": "low",
            "overall_impression": f"Strong candidate for {self.job_role} role. Communicated effectively with Alex.",
            "would_shortlist": True
        }

        if not raw_json:
            return default_result

        try:
            cleaned = raw_json.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            parsed = json.loads(cleaned.strip())
            return parsed
        except Exception as err:
            logger.error(f"Error parsing Alex analysis JSON: {err}")
            return default_result

    def get_conversation_transcript(self):
        """
        Returns full conversation as clean formatted text.
        Format:
        "Alex: Hey great to meet you...\nCandidate: I'm doing well...\n"
        """
        lines = []
        for msg in self.conversation_history:
            role_name = "Alex" if msg.get("role") == "assistant" else "Candidate"
            lines.append(f"{role_name}: {msg.get('content', '')}")
        return "\n".join(lines)

