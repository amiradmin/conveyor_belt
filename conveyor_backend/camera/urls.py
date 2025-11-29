# camera/urls.py - FIXED VERSION
from django.urls import path
from .views import (
    ProcessVideoFile,
    StreamFrameAPIView,
    ConveyorAnalysisAPI,
    SystemStatusAPI,
    HistoricalDataAPI
)

urlpatterns = [
    path("process-video/", ProcessVideoFile.as_view(), name="process-video"),
    path('stream/', StreamFrameAPIView.as_view(), name='stream-frame'),
    path('conveyor/analyze/', ConveyorAnalysisAPI.as_view(), name='conveyor-analyze'),
    path('system/status/', SystemStatusAPI.as_view(), name='system-status'),
    path('analytics/historical/', HistoricalDataAPI.as_view(), name='historical-data'),
]