import time
import logging

logger = logging.getLogger(__name__)

class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = time.time()
        response = self.get_response(request)
        duration_ms = (time.time() - start_time) * 1000

        user_email = (
            request.user.email
            if hasattr(request, 'user') and request.user.is_authenticated
            else 'anonymous'
        )

        logger.info(
            f"{request.method} {request.path} {response.status_code} - {duration_ms:.2f}ms - User: {user_email}"
        )

        return response
