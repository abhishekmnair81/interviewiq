import json
import logging
from io import BytesIO
from pypdf import PdfReader
from docx import Document
from apps.analysis.services.llm_factory import get_llm_provider

logger = logging.getLogger(__name__)

# A broad list of common tech/skill keywords we can detect directly in the resume
# text. This lets us produce a genuinely resume-grounded skills list even when the
# LLM is unavailable — so Alex never has to fall back to generic questions.
_TECH_KEYWORDS = [
    'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'golang', 'go', 'rust',
    'ruby', 'php', 'swift', 'kotlin', 'scala', 'r ', 'matlab', 'sql', 'nosql',
    'html', 'css', 'react', 'react native', 'next.js', 'nextjs', 'angular', 'vue',
    'node', 'node.js', 'express', 'django', 'flask', 'fastapi', 'spring', 'spring boot',
    '.net', 'laravel', 'rails', 'tailwind', 'bootstrap',
    'postgres', 'postgresql', 'mysql', 'mongodb', 'redis', 'sqlite', 'oracle', 'firebase',
    'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'k8s', 'terraform',
    'jenkins', 'git', 'github', 'gitlab', 'ci/cd', 'linux', 'nginx', 'kafka', 'rabbitmq',
    'graphql', 'rest', 'grpc', 'microservices',
    'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'sklearn', 'pandas', 'numpy',
    'opencv', 'nlp', 'machine learning', 'deep learning', 'computer vision', 'llm',
    'langchain', 'hugging face', 'huggingface', 'openai', 'transformers',
    'data science', 'data analysis', 'power bi', 'tableau', 'excel', 'hadoop', 'spark',
    'android', 'ios', 'flutter', 'figma', 'unity', 'arduino', 'raspberry pi', 'iot',
]

_SECTION_ALIASES = {
    'skills': ['skills', 'technical skills', 'technologies', 'tech stack', 'core competencies', 'proficiencies'],
    'projects': ['projects', 'project', 'personal projects', 'academic projects', 'key projects'],
    'experience': ['experience', 'work experience', 'professional experience', 'employment', 'work history', 'internship', 'internships'],
    'education': ['education', 'academic', 'qualifications', 'academic background'],
    'certifications': ['certifications', 'certification', 'certificates', 'courses', 'licenses'],
    'achievements': ['achievements', 'accomplishments', 'awards', 'honors', 'activities'],
}


def _match_section(line: str):
    """Return the canonical section name if `line` looks like a section header."""
    low = line.strip().lower().rstrip(':').strip()
    if not low or len(low) > 40:
        return None
    for canonical, aliases in _SECTION_ALIASES.items():
        for a in aliases:
            if low == a or low.startswith(a + ' ') or low == a + 's':
                return canonical
    return None


def _split_items(chunk: str):
    """Split a section body into individual items (bullets / lines / comma lists)."""
    items = []
    for raw in chunk.splitlines():
        line = raw.strip(' \t-*•·▪◦‣o>')
        line = line.strip()
        if line:
            items.append(line)
    return items


def _heuristic_highlights(text: str) -> dict:
    """Extract resume highlights WITHOUT an LLM, straight from the resume text.

    This is the last-resort fallback so the app is never blocked by an LLM
    outage. It is grounded entirely in the candidate's actual resume text
    (section headers + detected tech keywords), so Alex's questions stay
    on-resume even here.
    """
    if not text or not text.strip():
        return {}

    lines = text.splitlines()

    # 1) Bucket lines by section.
    sections = {k: [] for k in _SECTION_ALIASES}
    current = None
    for line in lines:
        sec = _match_section(line)
        if sec:
            current = sec
            continue
        if current:
            sections[current].append(line)

    # 2) Skills — from a skills section if present, else keyword scan.
    low_text = text.lower()
    skills = []
    if sections['skills']:
        body = " ".join(sections['skills'])
        for token in body.replace('|', ',').replace('•', ',').replace('/', ',').split(','):
            t = token.strip(' \t.-')
            if 1 < len(t) <= 30 and not t.isdigit():
                skills.append(t)
    # Always augment with detected known tech keywords, matched on word
    # boundaries so short tokens don't match inside unrelated words.
    import re as _re
    for kw in _TECH_KEYWORDS:
        term = kw.strip()
        if not term:
            continue
        if _re.search(r'(?<![a-z0-9])' + _re.escape(term) + r'(?![a-z0-9])', low_text):
            label = term.title() if term.islower() else term
            if label.lower() not in [s.lower() for s in skills]:
                skills.append(label)
    skills = skills[:40]

    # 3) Projects.
    projects = []
    for item in _split_items("\n".join(sections['projects']))[:8]:
        # Use the text before a separator as the name, the rest as description.
        name = item.split(' - ')[0].split(':')[0].split('|')[0].strip()[:80]
        techs = [kw.strip().title() for kw in _TECH_KEYWORDS if kw.strip() in item.lower()][:6]
        projects.append({
            'name': name or item[:80],
            'description': item[:300],
            'technologies': techs,
            'role': '',
            'impact': '',
        })

    # 4) Experience.
    experience = []
    for item in _split_items("\n".join(sections['experience']))[:8]:
        role = item
        company = ''
        for sep in [' at ', ' - ', ', ', ' | ', ' @ ']:
            if sep in item:
                role, company = item.split(sep, 1)
                break
        experience.append({
            'role': role.strip()[:80],
            'company': company.strip()[:80],
            'duration': '',
            'responsibilities': [],
            'achievements': [],
        })

    # 5) Education / certifications / achievements.
    education = [{'degree': it[:120], 'institution': '', 'year': '', 'details': ''}
                 for it in _split_items("\n".join(sections['education']))[:5]]
    certifications = [{'name': it[:120], 'issuer': '', 'year': ''}
                      for it in _split_items("\n".join(sections['certifications']))[:8]]
    achievements = _split_items("\n".join(sections['achievements']))[:8]

    result = {
        'candidate_name': '',
        'professional_summary': '',
        'total_years_experience': '',
        'skills': skills,
        'projects': projects,
        'experience': experience,
        'education': education,
        'certifications': certifications,
        'achievements': achievements,
        'notable_keywords': skills[:15],
    }

    # Only useful if we actually found SOMETHING to ask about.
    if not (skills or projects or experience or education or certifications):
        return {}
    return result


def _sanitize_resume_input(text: str) -> str:
    """Sanitize the resume text to prevent prompt injection and limit length."""
    if not text:
        return ""
    if len(text) > 16000:
        text = text[:16000] + "... [truncated]"
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
        "You are an expert technical recruiter doing a DEEP, exhaustive parse of a candidate's resume, "
        "reading it from start to finish. Capture EVERY concrete detail — do not summarize away specifics. "
        "For each project capture its name, what it does, the exact technologies/tools used, the candidate's "
        "personal role, and the measurable impact or outcome. For each job capture concrete responsibilities and "
        "achievements. For certifications capture the exact certificate name, the issuing body, and the year. "
        "Extract real values ONLY from the resume text — never invent, guess, or add placeholders. If a field is "
        "genuinely absent, use an empty string or empty list. "
        "Return ONLY a JSON object matching exactly this structure, nothing else:\n"
        '{'
        '"candidate_name": "", '
        '"professional_summary": "", '
        '"total_years_experience": "", '
        '"skills": [], '
        '"projects": [{"name": "", "description": "", "technologies": [], "role": "", "impact": ""}], '
        '"experience": [{"role": "", "company": "", "duration": "", "responsibilities": [], "achievements": []}], '
        '"education": [{"degree": "", "institution": "", "year": "", "details": ""}], '
        '"certifications": [{"name": "", "issuer": "", "year": ""}], '
        '"achievements": [], '
        '"notable_keywords": []'
        '}'
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": (
            "Read this resume text carefully from beginning to end and extract every detail into the JSON schema. "
            "Be thorough and specific — include all projects, all jobs, and all certificates you find.\n\n"
            f"Resume Text:\n\n{safe_text}"
        )}
    ]
    
    try:
        raw_json = provider._call_groq(
            messages,
            temperature=0.1,
            max_tokens=3500,
            response_format={"type": "json_object"}
        )
        if not raw_json and type(provider).__name__ != 'AlexInterviewer':
            logger.warning("Configured provider failed to extract highlights. Falling back to Groq (AlexInterviewer).")
            from apps.analysis.groq_service import AlexInterviewer
            fallback_provider = AlexInterviewer()
            raw_json = fallback_provider._call_groq(
                messages,
                temperature=0.1,
                max_tokens=3500,
                response_format={"type": "json_object"}
            )
            
        if raw_json:
            cleaned = raw_json.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            elif cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
            # If the model wrapped the JSON in prose (common when response_format
            # is unsupported and we retried without it), extract the outermost
            # JSON object so json.loads still succeeds.
            if not cleaned.startswith("{"):
                start = cleaned.find("{")
                end = cleaned.rfind("}")
                if start != -1 and end != -1 and end > start:
                    cleaned = cleaned[start:end + 1]
            parsed = json.loads(cleaned.strip())
            logger.info(
                "Resume highlights parsed OK via %s | keys=%s",
                type(provider).__name__, list(parsed.keys())
            )
            return parsed
        else:
            logger.error(
                "Resume highlight extraction returned EMPTY from the LLM "
                "(provider=%s). This usually means the LLM API call failed — "
                "check the provider's own error log line above (bad API key, "
                "invalid model id, or network/egress). Returning {}.",
                type(provider).__name__,
            )
    except Exception as e:
        logger.error(f"Error parsing resume highlights: {e}")

    # LLM path failed — fall back to a local, non-LLM parse of the ACTUAL resume
    # text so the interview is never blocked by an LLM outage and questions stay
    # grounded in the candidate's real resume (not a generic stub).
    heuristic = _heuristic_highlights(text)
    if heuristic:
        logger.warning(
            "Using heuristic (non-LLM) resume highlights — LLM extraction was "
            "unavailable. skills=%d projects=%d experience=%d",
            len(heuristic.get('skills', [])),
            len(heuristic.get('projects', [])),
            len(heuristic.get('experience', [])),
        )
        return heuristic

    # Truly nothing usable — let the upload view surface a clear error to retry.
    return {}
