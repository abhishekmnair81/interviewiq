from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AnalysisPipelineLogViewSet
from .did_views import DIDStreamView, DIDSdpView, DIDIceView, DIDSpeakView, DIDCloseView

router = DefaultRouter()
router.register(r'logs', AnalysisPipelineLogViewSet, basename='analysis-log')

urlpatterns = [
    path('', include(router.urls)),

    path('avatar/stream/', DIDStreamView.as_view(), name='did-stream-create'),
    path('avatar/stream/<str:stream_id>/sdp/', DIDSdpView.as_view(), name='did-stream-sdp'),
    path('avatar/stream/<str:stream_id>/ice/', DIDIceView.as_view(), name='did-stream-ice'),
    path('avatar/stream/<str:stream_id>/speak/', DIDSpeakView.as_view(), name='did-stream-speak'),
    path('avatar/stream/<str:stream_id>/close/', DIDCloseView.as_view(), name='did-stream-close'),
]
