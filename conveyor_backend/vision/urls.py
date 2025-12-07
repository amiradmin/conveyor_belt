# vision/urls.py
from django.urls import path
from .views import (
    AvailableVideos, StartProcessing, JobStatus,
    StopProcessing, ListJobs, GetMetrics
)

urlpatterns = [
    path("videos/", AvailableVideos.as_view(), name="available-videos"),
    path("start/", StartProcessing.as_view(), name="start-processing"),
    path("stop/", StopProcessing.as_view(), name="stop-processing"),
    path("status/<str:job_id>/", JobStatus.as_view(), name="job-status"),
    path("jobs/", ListJobs.as_view(), name="list-jobs"),
    path("metrics/<str:job_id>/", GetMetrics.as_view(), name="get-metrics"),
]