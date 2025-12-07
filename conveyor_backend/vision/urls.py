# vision/urls.py
from django.urls import path
from .views import (
    AvailableVideos, StartProcessing, JobStatus,
    StopProcessing, ListJobs, ActiveJobs,
    GetReplayFrames, SystemInfo
)

urlpatterns = [
    # Video management
    path("videos/", AvailableVideos.as_view(), name="available-videos"),

    # Job control
    path("start/", StartProcessing.as_view(), name="start-processing"),
    path("stop/", StopProcessing.as_view(), name="stop-processing"),
    path("status/<str:job_id>/", JobStatus.as_view(), name="job-status"),
    path("jobs/", ListJobs.as_view(), name="list-jobs"),
    path("jobs/active/", ActiveJobs.as_view(), name="active-jobs"),

    # Replay
    path("replay/", GetReplayFrames.as_view(), name="get-replay-frames"),

    # System
    path("system/info/", SystemInfo.as_view(), name="system-info"),
]