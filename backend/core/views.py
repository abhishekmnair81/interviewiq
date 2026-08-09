from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db import connection
from django.core.cache import cache
import django
import sys

class HealthCheckView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        health = {
            'status': 'healthy',
            'django': django.get_version(),
            'python': sys.version,
            'database': self._check_database(),
            'cache': self._check_cache(),
        }

        if any(v == 'unhealthy' for v in health.values()):
            health['status'] = 'unhealthy'
            return Response(health, status=503)

        return Response(health, status=200)

    def _check_database(self):
        try:
            connection.ensure_connection()
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
            return 'healthy'
        except Exception:
            return 'unhealthy'

    def _check_cache(self):
        try:
            cache.set('health_check', 'ok', timeout=5)
            result = cache.get('health_check')
            return 'healthy' if result == 'ok' else 'unhealthy'
        except Exception:
            return 'unhealthy'
