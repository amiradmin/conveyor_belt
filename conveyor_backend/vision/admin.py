from django.contrib import admin
from .models import VideoFile, ProcessingJob

admin.site.register(VideoFile)
admin.site.register(ProcessingJob)

