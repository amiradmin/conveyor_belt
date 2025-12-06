from django.db import models
from django.utils import timezone

class VideoFile(models.Model):
    path = models.CharField(max_length=1024)
    uploaded_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.path

class ProcessingJob(models.Model):
    JOB_STATUS = [
        ("processing","processing"),
        ("completed","completed"),
        ("error","error"),
        ("stopped","stopped")
    ]
    video = models.ForeignKey(VideoFile, on_delete=models.CASCADE, null=True, blank=True)
    job_id = models.CharField(max_length=128, unique=True)
    camera_id = models.CharField(max_length=64, default="default")
    status = models.CharField(max_length=32, choices=JOB_STATUS, default="processing")
    progress = models.IntegerField(default=0)
    result = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

class Detection(models.Model):
    job = models.ForeignKey(ProcessingJob, on_delete=models.CASCADE, related_name="detections")
    frame_number = models.IntegerField()
    bbox = models.JSONField()         # [x1,y1,x2,y2]
    label = models.CharField(max_length=64)
    confidence = models.FloatField()
    created_at = models.DateTimeField(default=timezone.now)
