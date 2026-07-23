from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AnalysisPipelineLogViewSet

router = DefaultRouter()
router.register(r'logs', AnalysisPipelineLogViewSet, basename='analysis-log')

urlpatterns = [
    path('', include(router.urls)),
]
