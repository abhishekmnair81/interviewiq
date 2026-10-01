import os
import json
import httpx
from django.conf import settings
from groq import Groq

class CodingQuestionGenerator:
    """Generates a coding challenge grounded in the candidate's resume."""

    SYSTEM_PROMPT = """You are an expert technical interviewer. Your task is to generate a programming challenge tailored to the candidate's resume.
The output MUST be valid JSON matching this exact schema:
{
  "id": "resume-coding-1",
  "title": "String title",
  "description": "String description (can include basic formatting). Keep it concise. Mention how this relates to their resume.",
  "examples": [
    { "input": "String input 1", "expected_output": "String expected 1" },
    { "input": "String input 2", "expected_output": "String expected 2" }
  ],
  "starter_code": "String starter code matching the language. Must include the main function/method signature.",
  "language": "Must be exactly one of: python, java, c, cpp",
  "test_case": "String of code that can be appended to the starter code to test the candidate's solution with assertions. This MUST NOT contain the solution, just the tests that call the function defined in starter_code.",
  "reference_solution": "A complete, correct string of code solving the problem in the chosen language. Used for grading.",
  "difficulty": "easy | medium | hard"
}

CRITICAL RULES:
1. ONLY return the raw JSON object. Do not include markdown formatting like ```json.
2. The problem MUST relate to the candidate's domain (e.g., if they are a data scientist, give a data manipulation problem; if backend, an API parsing or routing problem).
3. The language MUST be chosen from (python, java, c, cpp) based on the most prominent language in their resume. If none match, default to python.
4. The test_case must be runnable code that validates the solution. It will be concatenated with the candidate's code before execution.
"""

    def __init__(self):
        from .llm_client import build_chat_client
        self.client, self.model = build_chat_client()

    def generate_challenge(self, resume_highlights, difficulty_level, avoid_titles=None):
        avoid_titles = avoid_titles or []
        avoid_note = ""
        if avoid_titles:
            avoid_note = (
                "\n\nDo NOT reuse or closely resemble any of these already-asked "
                f"problem titles: {', '.join(avoid_titles)}. Pick a different aspect "
                "of the candidate's resume."
            )
        prompt = (
            f"Candidate Level: {difficulty_level}\n"
            f"Resume Highlights:\n{json.dumps(resume_highlights, indent=2)}\n\n"
            "Generate a coding challenge tailored to this candidate based on the rules above. "
            "Provide ONLY JSON." + avoid_note
        )

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.4,
                max_tokens=1500,
            )

            raw_content = response.choices[0].message.content.strip()
            
            if raw_content.startswith("```json"):
                raw_content = raw_content[7:]
            elif raw_content.startswith("```"):
                raw_content = raw_content[3:]
                
            if raw_content.endswith("```"):
                raw_content = raw_content[:-3]
            
            raw_content = raw_content.strip()
            
            data = json.loads(raw_content)

            if not data.get("title") or not data.get("description"):
                print("Generated coding challenge missing title/description — discarding.")
                return None

            if str(data.get("language", "")).lower() not in ["python", "java", "c", "cpp"]:
                data["language"] = "python"
            else:
                data["language"] = str(data["language"]).lower()

            if not data.get("id"):
                data["id"] = "resume-coding-1"

            # Best-effort verify the reference solution. Verification is a QUALITY
            # signal, not a hard gate: a resume-grounded question is more valuable
            # to the candidate than a generic one, so we keep it even if the probe
            # run fails. We only drop the auto-appended test_case in that case, so
            # a broken harness can't wreck the candidate's own submission run.
            try:
                from apps.analysis.services.code_runner import OneCompilerRunner
                test_runner = OneCompilerRunner()

                code_to_verify = data.get("reference_solution", "")
                if data.get("test_case"):
                    code_to_verify += "\n\n" + data["test_case"]

                run_result = test_runner.run_code(
                    source_code=code_to_verify,
                    language=data["language"],
                    stdin=""
                )

                if run_result.get("status") != "success":
                    print(f"Coding challenge verification failed (keeping question, "
                          f"dropping test_case): {run_result.get('stderr')}")
                    data["test_case"] = ""
            except Exception as ve:
                print(f"Coding challenge verification skipped due to runner error: {ve}")
                data["test_case"] = ""

            return data

        except Exception as e:
            print(f"Error generating coding challenge: {e}")
            return None

    def generate_challenge_set(self, resume_highlights, difficulty_level, count=2):
        """Generate up to `count` distinct resume-grounded coding challenges.

        Returns a list (possibly empty). Each entry gets a unique id so the
        frontend can index them. Callers should fall back to the static pool
        only when this returns an empty list.
        """
        challenges = []
        seen_titles = []
        for i in range(max(1, count)):
            ch = self.generate_challenge(resume_highlights, difficulty_level, avoid_titles=seen_titles)
            if not ch or 'title' not in ch:
                continue
            ch['id'] = f"resume-coding-{i + 1}"
            ch['test_cases'] = ch.get('examples', [])
            challenges.append(ch)
            seen_titles.append(ch['title'])
        return challenges
