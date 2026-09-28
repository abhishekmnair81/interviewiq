import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

class OneCompilerRunner:
    """Runs code via OneCompiler API."""

    LANGUAGE_MAP = {
        'c': 'c',
        'cpp': 'cpp',
        'python': 'python',
        'java': 'java',
    }

    def __init__(self):
        self.api_key = getattr(settings, 'ONECOMPILER_API_KEY', '')
        self.base_url = getattr(settings, 'ONECOMPILER_API_URL', 'https://onecompiler.com/api/v1')

    def run_code(self, source_code, language, stdin=""):
        # Normalize language
        lang = self.LANGUAGE_MAP.get(language.lower(), 'python')

        payload = {
            "language": lang,
            "code": source_code,
            "stdin": stdin,
        }

        headers = {
            "Content-Type": "application/json",
            "X-API-Key": self.api_key,
        }
        
        logger.info(f"OneCompiler request: lang={lang}, code_len={len(source_code)}")

        try:
            response = requests.post(
                f"{self.base_url}/run",
                json=payload,
                headers=headers,
                timeout=15,
            )
            response.raise_for_status()
            data = response.json()
            
            logger.info(f"OneCompiler response: {data}")

            return {
                "stdout": data.get("stdout") or data.get("output") or "",
                "stderr": data.get("stderr") or data.get("error") or "",
                "exception": data.get("exception"),
                "execution_time": data.get("executionTime") or data.get("time"),
                "status": "success" if not (data.get("stderr") or data.get("exception") or data.get("error")) else "error",
            }
        except requests.exceptions.HTTPError as e:
            err_msg = f"OneCompiler API error: {e.response.status_code} — {e.response.text[:200]}"
            logger.error(err_msg)
            return {
                "stdout": "",
                "stderr": err_msg,
                "status": "error",
            }
        except Exception as e:
            err_msg = f"Code execution failed: {str(e)}"
            logger.error(err_msg)
            return {
                "stdout": "",
                "stderr": err_msg,
                "status": "error",
            }
