import os
import json
import logging
from django.conf import settings
from groq import Groq
import httpx

logger = logging.getLogger(__name__)

class StrictAnswerEvaluator:
    """Strict, level-aware evaluation of interview answers."""

    SYSTEM_PROMPT = """You are a STRICT senior technical interviewer evaluating an interview answer. Your job is to give honest, accurate, evidence-based scores — not to flatter the candidate.

CONTEXT:
- Job role: {job_role}
- Candidate level: {candidate_level} (junior/mid/senior/etc)
- Question category: {category}
- Question: {question}
- Candidate's answer: {answer}

SCORING RULES (STRICT):
1. A score of 50 = average. Only give 70+ if the answer is clearly above expectations FOR THE CANDIDATE'S LEVEL.
2. A junior giving a junior-level answer = 70-80. A senior giving a junior-level answer = 30-40.
3. Deduct 10-20 points if the candidate:
   - Doesn't mention specific technologies, tools, or metrics
   - Uses vague phrases like "improved performance", "worked well", "handled it" without specifics
   - Cannot articulate trade-offs or why they chose an approach
   - Blames external factors without describing their own actions
4. Add 10-20 points if the candidate:
   - Cites specific numbers (latency reduced 40%, served 10K QPS, reduced cost by $50K)
   - Discusses trade-offs (chose X over Y because...)
   - Mentions edge cases or failure modes
   - Explains the impact on the team/business

STAR METHOD SCORING (0-25 each):
- Situation: Did they set clear context?
- Task: Was their specific responsibility clear?
- Action: Did they explain WHAT THEY did (not "we")?
- Result: Was the outcome quantified?

DIMENSIONS TO SCORE (each 0-100):
- relevance: Does the answer actually address the question?
- depth: Technical/experiential depth appropriate to level
- structure: Logical flow, STAR or equivalent
- specificity: Concrete details vs vague generalities
- impact: Measurable outcomes and business value
- self_awareness: Do they acknowledge limitations/trade-offs?

EVIDENCE REQUIREMENT:
For every score, quote the EXACT phrase from the answer that justified it. If the answer lacks evidence for a dimension, score it low and note "no evidence provided".

OUTPUT (strict JSON only, no prose before/after):
{{
  "star": {{"situation": 18, "task": 15, "action": 20, "result": 12, "total": 65}},
  "dimensions": {{
    "relevance": {{"score": 75, "evidence": "directly answered..."}},
    "depth": {{"score": 55, "evidence": "mentioned Kafka but no partition strategy..."}},
    "structure": {{"score": 65, "evidence": "..."}},
    "specificity": {{"score": 45, "evidence": "no metrics cited..."}},
    "impact": {{"score": 40, "evidence": "said 'improved performance' without numbers..."}},
    "self_awareness": {{"score": 60, "evidence": "acknowledged trade-off..."}}
  }},
  "overall_score": 58,
  "strengths": ["concrete example of Kafka usage", "clear situation setup"],
  "weaknesses": ["no quantified results", "vague on debugging approach", "couldn't explain why Kafka over RabbitMQ"],
  "red_flags": ["claimed 5 years experience but explained basics incorrectly"],
  "green_flags": ["mentioned edge case handling unprompted"],
  "follow_up_would_help": "Ask them to walk through the specific metric they used to measure impact.",
  "topics": ["Kafka", "System Design"]
}}
"""

    def __init__(self):
        from .llm_client import build_chat_client
        self.client, self.model = build_chat_client()

    def _sanitize_input(self, answer: str) -> str:
        # Truncate to avoid overwhelming context
        if len(answer) > 3000:
            answer = answer[:3000] + "... [truncated]"
        # Strip any instruction-injection attempts
        for pattern in ['ignore previous', 'you are now', 'system:', 'assistant:']:
            answer = answer.replace(pattern, '[redacted]')
        return answer

    def _verify_evidence(self, evaluation: dict, original_answer: str) -> dict:
        """Verify that quoted evidence actually appears in the answer."""
        if not getattr(settings, 'EVIDENCE_VERIFICATION', True):
            return evaluation
            
        for name, dim in evaluation.get('dimensions', {}).items():
            quote = dim.get('evidence', '')
            # Check if quote is actually in the answer (fuzzy match by looking for subsets of words)
            if quote and len(quote) > 10:
                # Remove punctuation and lowercase for fuzzy check
                clean_quote = ''.join(e for e in quote.lower() if e.isalnum() or e.isspace())
                clean_ans = ''.join(e for e in original_answer.lower() if e.isalnum() or e.isspace())
                
                # Check for significant chunks of the quote
                words = clean_quote.split()
                if len(words) >= 3:
                    chunk = " ".join(words[:3])
                    if chunk not in clean_ans and "no evidence provided" not in quote.lower():
                        dim['evidence'] = '[unverified quote — removed]'
                        dim['score'] = min(dim['score'], 40)
                        evaluation['hallucination_detected'] = True
        return evaluation

    def _validate_scores(self, evaluation: dict, level: str) -> dict:
        """Detect and correct inflated scores."""
        overall = evaluation.get('overall_score', 0)
        dims = evaluation.get('dimensions', {})

        if getattr(settings, 'INFLATION_GUARD', True):
            # Rule 1: If overall > 85 but specificity < 60 → suspicious, lower overall
            if overall > 85 and dims.get('specificity', {}).get('score', 0) < 60:
                evaluation['overall_score'] = 70
                evaluation['inflation_corrected'] = True

            # Rule 2: If any dimension has no evidence quote → cap at 50
            for name, dim in dims.items():
                evidence = dim.get('evidence', '').lower()
                if not evidence or len(evidence) < 10 or "no evidence" in evidence or "unverified" in evidence:
                    dim['score'] = min(dim['score'], 50)

        # Rule 3: Level-adjusted score
        multiplier = {
            'intern': 1.15,    # easier bar
            'junior': 1.10,
            'mid': 1.00,
            'senior': 0.90,
            'staff': 0.85,
            'principal': 0.80,
        }.get(level, 1.0)

        evaluation['candidate_level'] = level
        evaluation['level_adjusted_score'] = min(100, int(evaluation.get('overall_score', 0) * multiplier))
        return evaluation

    def evaluate(self, session, question: str, answer: str, level: str) -> dict:
        if not answer or len(answer.strip()) < 5:
            return self._empty_evaluation(level)

        sanitized_answer = self._sanitize_input(answer)
        
        job_role = getattr(session, 'job_role', 'Software Engineer')
        category = getattr(session, 'question_category', 'behavioral')

        prompt = self.SYSTEM_PROMPT.format(
            job_role=job_role,
            candidate_level=level,
            category=category,
            question=question,
            answer=sanitized_answer
        )

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "system", "content": prompt}],
                temperature=0.1,
                response_format={"type": "json_object"},
            )

            result = json.loads(response.choices[0].message.content.strip())
            
            # Map old expected fields for compatibility in pipeline.py
            result['score'] = result.get('overall_score', 50)
            
            result = self._verify_evidence(result, sanitized_answer)
            result = self._validate_scores(result, level)
            
            return result
        except Exception as e:
            logger.error(f"Error evaluating answer strictly: {e}")
            return self._empty_evaluation(level)

    def _empty_evaluation(self, level: str) -> dict:
        result = {
            "star": {"situation": 0, "task": 0, "action": 0, "result": 0, "total": 0},
            "dimensions": {
                "relevance": {"score": 0, "evidence": "no evidence"},
                "depth": {"score": 0, "evidence": "no evidence"},
                "structure": {"score": 0, "evidence": "no evidence"},
                "specificity": {"score": 0, "evidence": "no evidence"},
                "impact": {"score": 0, "evidence": "no evidence"},
                "self_awareness": {"score": 0, "evidence": "no evidence"}
            },
            "overall_score": 0,
            "strengths": [],
            "weaknesses": ["Answer too short or empty"],
            "red_flags": [],
            "green_flags": [],
            "topics": [],
            "score": 0
        }
        return self._validate_scores(result, level)
