import os
import httpx
from django.conf import settings
from groq import Groq

class InterviewQuestionGenerator:
    """Generates the next interview question based on full conversation context."""

    SYSTEM_PROMPT = """You are Alex, a professional job interviewer conducting a live interview for a {job_role} position at {experience_level} level.

Your personality:
- Warm but structured — you make the candidate feel comfortable but keep things professional
- You listen carefully and reference specific things the candidate said
- You ask one question at a time, never stack multiple questions
- You adapt difficulty based on the candidate's performance

{resume_context}

Current interview state:
- Phase: {phase} (intro/behavioral/technical/situational/closing)
- Questions asked so far: {count}
- Topics already covered: {topics}
- Candidate strengths observed: {strengths}
- Candidate weaknesses observed: {weaknesses}

Conversation history:
{history}

The candidate's most recent answer:
{last_answer}

Your task: Generate ONLY the next question to ask. No preamble, no commentary, no "great answer" — just the question itself.

Rules:
1. If this is the opening question (phase=intro, count=0), start with a warm role-specific opener.
2. If the candidate mentioned a specific technology, project, or experience in their last answer, ask a follow-up question about it. Be specific — mention the exact thing they said.
3. If the candidate gave a vague answer, ask for a concrete example.
4. If the candidate gave an excellent answer, move to the next topic at a slightly higher difficulty.
5. Move phases based on count: 0-1 intro, 2-4 behavioral, 5-7 technical, 8-9 situational, 10 closing.
6. Never repeat a topic already covered.
7. Keep questions under 40 words. No multi-part questions.
"""

    def __init__(self):
        llm_providers = getattr(settings, 'LLM_PROVIDERS', {})
        api_key = os.environ.get('GROQ_API_KEY') or llm_providers.get('groq', {}).get('API_KEY')
        if not api_key:
            api_key = "test-api-key"
        self.client = Groq(api_key=api_key.strip("'\""), http_client=httpx.Client(verify=False))
        self.model = "qwen/qwen3.8-27b"

    def generate_next_question(self, session, last_answer=None):
        history = self._format_history(session.conversation_history or [])

        resume_context = ""
        if getattr(session, 'used_resume', False) and getattr(session, 'resume_highlights', None):
            import json
            highlights_str = json.dumps(session.resume_highlights, indent=2)
            resume_context = (
                "Candidate's Resume Highlights:\n"
                f"{highlights_str}\n\n"
                "CRITICAL INSTRUCTION: EVERY question you ask MUST directly reference a specific item from the candidate's resume above (a named project, a listed skill/technology, a specific past employer/role, or a gap).\n"
                "Do NOT ask generic role-default behavioral questions. Any behavioral angle MUST be tied to a specific resume item.\n"
                "Even for the very first opening question, reference a specific project or role from their resume to welcome them."
            )

        prompt = self.SYSTEM_PROMPT.format(
            job_role=session.job_role or "Software Engineer",
            experience_level=session.difficulty or "mid-level",
            resume_context=resume_context,
            phase=session.interview_phase,
            count=session.questions_asked_count,
            topics=", ".join(session.topics_covered) if session.topics_covered else "none yet",
            strengths=", ".join(session.candidate_strengths) if session.candidate_strengths else "none yet",
            weaknesses=", ".join(session.candidate_weaknesses) if session.candidate_weaknesses else "none yet",
            history=history,
            last_answer=last_answer or "This is the opening question — no answer yet.",
        )

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": "Generate the next question."},
            ],
            temperature=0.7,
            max_tokens=100,
        )

        return response.choices[0].message.content.strip()

    def _format_history(self, history):
        if not history:
            return "No previous questions yet."
        
        # In history, roles are typically 'assistant' and 'user'.
        # We need to map them to 'Q' and 'A'.
        formatted = []
        for i in range(0, len(history), 2):
            q_msg = history[i] if i < len(history) else {}
            a_msg = history[i+1] if i+1 < len(history) else {}
            q_text = q_msg.get('content', q_msg.get('text', ''))
            a_text = a_msg.get('content', a_msg.get('text', 'No answer yet'))
            formatted.append(f"Q: {q_text}\nA: {a_text}")
        
        return "\n".join(formatted[-3:]) # Last 3 Q&A pairs (6 exchanges)
