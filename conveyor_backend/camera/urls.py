from django.urls import path
from .views import ProcessVideoFile,StreamFrameAPIView

urlpatterns = [
    path("process-video/", ProcessVideoFile.as_view(), name="process-video"),
    path('stream/', StreamFrameAPIView.as_view(), name='stream-frame'),
]