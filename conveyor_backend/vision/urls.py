from django.urls import path
from .views import AvailableVideos, StartProcessing, JobStatus

urlpatterns = [
    path("videos/", AvailableVideos.as_view(), name="available-videos"),
    path("start/", StartProcessing.as_view(), name="start-processing"),
    path("status/<str:job_id>/", JobStatus.as_view(), name="job-status"),
]
