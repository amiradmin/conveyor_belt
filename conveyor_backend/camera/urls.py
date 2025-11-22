from django.urls import path
from .views import ProcessVideoFile

urlpatterns = [
    path("process-video/", ProcessVideoFile.as_view(), name="process-video"),
]