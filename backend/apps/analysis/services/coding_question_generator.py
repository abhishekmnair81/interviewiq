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
        llm_providers = getattr(settings, 'LLM_PROVIDERS', {})
        api_key = os.environ.get('GROQ_API_KEY') or llm_providers.get('groq', {}).get('API_KEY')
        if not api_key:
            api_key = "test-api-key"
        self.client = Groq(api_key=api_key.strip("'\""), http_client=httpx.Client(verify=False))
        self.model = "qwen/qwen3.8-27b"

    def generate_challenge(self, resume_highlights, difficulty_level):
        prompt = (
            f"Candidate Level: {difficulty_level}\n"
            f"Resume Highlights:\n{json.dumps(resume_highlights, indent=2)}\n\n"
            "Generate a coding challenge tailored to this candidate based on the rules above. Provide ONLY JSON."
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
            
            if data.get("language") not in ["python", "java", "c", "cpp"]:
                data["language"] = "python"
                
            # Best-effort verify reference solution
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
                print(f"Generated coding challenge failed verification: {run_result.get('stderr')}")
                return None # Fallback to static
                
            return data
            
        except Exception as e:
            print(f"Error generating coding challenge: {e}")
            return None
