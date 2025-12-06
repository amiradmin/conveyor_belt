from django.contrib import admin
from .models import VideoFile, ProcessingJob, Detection

admin.site.register(VideoFile)
admin.site.register(ProcessingJob)
admin.site.register(Detection)
