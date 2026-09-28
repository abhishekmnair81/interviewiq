import json
import logging
from io import BytesIO
from pypdf import PdfReader
from docx import Document
from apps.analysis.services.llm_factory import get_llm_provider

logger = logging.getLogger(__name__)

def _sanitize_resume_input(text: str) -> str:
    """Sanitize the resume text to prevent prompt injection and limit length."""
    if not text:
        return ""
    if len(text) > 12000:
        text = text[:12000] + "... [truncated]"
    for pattern in ['ignore previous', 'you are now', 'system:', 'assistant:', 'instruction:', 'prompt:']:
        text = text.replace(pattern, '[redacted]')
    return text

def extract_text(file_obj, filename: str) -> str:
    """Extract text from PDF, DOCX, or TXT."""
    try:
        ext = filename.split('.')[-1].lower()
        if ext == 'pdf':
            reader = PdfReader(file_obj)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text
        elif ext == 'docx':
            doc = Document(file_obj)
            return "\n".join([para.text for para in doc.paragraphs])
        elif ext == 'txt':
            return file_obj.read().decode('utf-8', errors='ignore')
        else:
            return ""
    except Exception as e:
        logger.error(f"Error extracting text from {filename}: {e}")
        return ""

def build_highlights(text: str) -> dict:
    """Extract highlights from text via LLM."""
    if not text:
        return {}
    
    safe_text = _sanitize_resume_input(text)
    
    provider = get_llm_provider()
    
    system_prompt = (
        "You are an expert technical recruiter parsing a resume. Extract key details into a JSON object "
        "matching exactly this structure, nothing else: "
        '{"skills": [], "projects": [{"name": "", "summary": ""}], "experience": [{"role": "", "company": "", "duration": ""}], '
        '"education": [], "certifications": [], "notable_keywords": []}'
    )
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Resume Text:\n\n{safe_text}"}
    ]
    
    try:
        raw_json = provider._call_groq(
            messages,
            temperature=0.1,
            max_tokens=2000,
            response_format={"type": "json_object"}
        )
        if raw_json:
            cleaned = raw_json.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            return json.loads(cleaned.strip())
    except Exception as e:
        logger.error(f"Error parsing resume highlights: {e}")
    
    return {}
