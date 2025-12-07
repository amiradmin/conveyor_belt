# vision/urls.py
from django.urls import path
from .views import (
    AvailableVideos, StartProcessing, JobStatus, 
    GetReplayFrames, GetJobStats
)

urlpatterns = [
    path("videos/", AvailableVideos.as_view(), name="available-videos"),
    path("start/", StartProcessing.as_view(), name="start-processing"),
    path("status/<str:job_id>/", JobStatus.as_view(), name="job-status"),
    path("replay/", GetReplayFrames.as_view(), name="get-replay-frames"),
    path("stats/<str:job_id>/", GetJobStats.as_view(), name="job-stats"),
]