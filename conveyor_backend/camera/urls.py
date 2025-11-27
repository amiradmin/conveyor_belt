from django.urls import path
from .views import ProcessVideoFile,StreamFrameAPIView,ConveyorAnalysisAPI

urlpatterns = [
    path("process-video/", ProcessVideoFile.as_view(), name="process-video"),
    path('stream/', StreamFrameAPIView.as_view(), name='stream-frame'),
    path('conveyor/analyze/', ConveyorAnalysisAPI.as_view(), name='conveyor-analyze'),

]