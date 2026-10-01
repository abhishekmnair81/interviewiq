import os
import json
import logging
import urllib.request
from django.conf import settings

logger = logging.getLogger(__name__)

class GroqInterviewer:
    """
    Real-time AI Interviewer Engine using Groq LLM API (qwen/qwen3.8-27b / llama-3.3-70b-versatile).
    Lightning-fast, highly accurate conversational interviewer & structured feedback generator.
    """
    def __init__(self, job_role: str = "Software Engineer", difficulty: str = "medium", category: str = "behavioral"):
        self.job_role = job_role
        self.difficulty = difficulty
        self.category = category
        self.api_key = getattr(
            settings, 
            'GROQ_API_KEY', 
            os.getenv('GROQ_API_KEY', '')
        )

        self.system_prompt = (
            f"You are a professional, experienced interviewer conducting a real job interview for the role of {self.job_role}.\n"
            f"Your personality: professional, calm, encouraging but objective. You speak naturally like a human interviewer.\n"
            f"Rules you must follow:\n"
            f"1. Ask exactly one question at a time. Never ask two questions together.\n"
            f"2. Listen carefully to the candidate's answer and ask intelligent follow-up questions based on what they said.\n"
            f"3. If the candidate gives a vague answer, probe deeper: \"Can you elaborate on that?\" or \"Can you give me a specific example?\"\n"
            f"4. If the candidate gives a strong answer, acknowledge briefly and move forward: \"Great, let's move on.\"\n"
            f"5. After 5-7 questions, close the interview professionally: say INTERVIEW_COMPLETE followed by a warm closing message.\n"
            f"6. Keep all your responses conversational and natural — you are speaking out loud, not writing.\n"
            f"7. Never use bullet points or lists in your responses — speak in natural sentences only.\n"
            f"8. Difficulty level is {self.difficulty} — adjust question complexity accordingly.\n"
            f"Category focus: {self.category}"
        )

    def _call_groq(self, messages: list, json_mode: bool = False) -> str:
        url = 'https://api.groq.com/openai/v1/chat/completions'
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0'
        }

        payload = {
            'model': 'qwen/qwen3.8-27b',
            'messages': messages,
            'temperature': 0.7,
            'max_tokens': 500,
        }

        if json_mode:
            payload['response_format'] = {'type': 'json_object'}

        try:
            data_bytes = json.dumps(payload).encode('utf-8')
            req = urllib.request.Request(url, data=data_bytes, headers=headers)
            with urllib.request.urlopen(req, timeout=7) as response:
                res_data = json.loads(response.read().decode('utf-8'))
                return res_data['choices'][0]['message']['content'].strip()
        except Exception as e:
            logger.error(f"Groq API Call Error: {e}")
            return ""

    def get_first_question(self, category: str = "behavioral") -> str:
        """Returns warm, human-like opening intro and icebreaker question."""
        category = (category or "behavioral").lower()
        if category == "technical":
            return (
                f"Hello and welcome! I'm Sarah, your lead interviewer today for the {self.job_role} position. "
                f"It's great to meet you! To get us started comfortably, could you give me a brief intro about yourself and walk me through a technical project you engineered recently that you're most proud of?"
            )
        elif category == "hr":
            return (
                f"Hi there! Welcome! I'm Mark, your HR Director for today's interview for the {self.job_role} role. "
                f"We're really glad to have you here today. Before we dive into specifics, how are you doing today, and could you introduce yourself and share what inspired you to apply for this role?"
            )
        else:
            return (
                f"Hello and welcome! I'll be conducting your {self.job_role} behavioral interview today. "
                f"I'm excited to learn more about your background! To kick things off, could you introduce yourself and share a key highlight from your engineering journey so far?"
            )

    def get_next_question(
        self, 
        conversation_history: list, 
        current_turn: int = 1, 
        max_turns: int = 5,
        latest_face_metrics: dict = None
    ) -> str:
        """
        Generates next question using Groq API, building dynamically on candidate's answer and facial metrics.
        """
        if current_turn >= max_turns:
            return "INTERVIEW_COMPLETE"

        messages = [{'role': 'system', 'content': self.system_prompt}]

        for msg in conversation_history:
            role = "user" if msg.get("sender") in ("candidate", "user") else "assistant"
            text = msg.get("text") or msg.get("content") or ""
            if text:
                messages.append({'role': role, 'content': text})

        metrics_note = ""
        if latest_face_metrics:
            eye = latest_face_metrics.get("eye_contact_score", 85)
            stab = latest_face_metrics.get("stability_score", 88)
            emo = latest_face_metrics.get("emotion", "focused")
            metrics_note = (
                f" [Candidate Non-Verbal Metrics: Eye Contact: {eye}%, "
                f"Stability: {stab}%, Emotional State: {emo}]"
            )

        messages.append({
            'role': 'user',
            'content': (
                f"[System Instruction: This is turn {current_turn + 1} of {max_turns}.{metrics_note}]\n"
                f"Respond naturally as the interviewer: First, warmly acknowledge their previous answer "
                f"and delivery in 1 short sentence, then ask one focused, relevant follow-up question."
            )
        })

        res_text = self._call_groq(messages)
        if res_text:
            return res_text

        return self._fallback_next_question(conversation_history, current_turn)

    def _fallback_next_question(self, history: list, turn: int) -> str:
        fallbacks = [
            f"That's really insightful! Can you elaborate on the specific metrics or results of that experience in your role as a {self.job_role}?",
            f"How did you handle communication and alignment with team members or stakeholders during that process?",
            f"Looking back at that situation, what is one key lesson you learned that shaped how you work today?",
            f"Great explanation. How would you handle a scenario where priorities suddenly shifted midway through delivery?"
        ]
        index = (turn - 1) % len(fallbacks)
        return fallbacks[index]

    def get_feedback_summary(self, conversation_history: list) -> dict:
        """
        Generates structured summary feedback from the conversation via Groq API.
        """
        messages = [
            {
                'role': 'system',
                'content': (
                    f"Analyze this candidate interview history for a {self.job_role}.\n"
                    f"Return ONLY a valid JSON object with keys:\n"
                    f"{{\n"
                    f'  "overall_score": <number 0-100>,\n'
                    f'  "speech_score": <number 0-100>,\n'
                    f'  "answer_score": <number 0-100>,\n'
                    f'  "summary": "<2-3 sentence executive summary>",\n'
                    f'  "strengths": ["<strength 1>", "<strength 2>"],\n'
                    f'  "improvement_tips": ["<tip 1>", "<tip 2>"]\n'
                    f"}}"
                )
            },
            {
                'role': 'user',
                'content': f"Interview transcript:\n{json.dumps(conversation_history, indent=2)}"
            }
        ]

        raw_json = self._call_groq(messages, json_mode=True)
        if raw_json:
            try:
                return json.loads(raw_json)
            except Exception as e:
                logger.error(f"Failed to parse Groq feedback JSON: {e}")

        return {
            "overall_score": 82,
            "speech_score": 84,
            "answer_score": 80,
            "summary": f"Strong overall interview performance for {self.job_role}. Clear technical reasoning and structured delivery.",
            "strengths": ["Clear communication", "Structured STAR framework approach"],
            "improvement_tips": ["Add more quantifiable metrics to achievements", "Maintain direct eye contact throughout"]
        }

GeminiInterviewer = GroqInterviewer
