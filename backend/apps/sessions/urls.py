from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InterviewSessionViewSet, RandomQuestionView

router = DefaultRouter()
router.register(r'', InterviewSessionViewSet, basename='session')

urlpatterns = [
    path('create/', InterviewSessionViewSet.as_view({'post': 'create'}), name='session-create'),
    path('questions/random/', RandomQuestionView.as_view(), name='questions-random'),
    path('', include(router.urls)),
]
