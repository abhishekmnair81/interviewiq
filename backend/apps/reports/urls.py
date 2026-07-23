from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AnalysisReportViewSet

router = DefaultRouter()
router.register(r'', AnalysisReportViewSet, basename='report')

urlpatterns = [
    path('', include(router.urls)),
]
