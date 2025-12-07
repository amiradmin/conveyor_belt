# vision/models.py
from django.db import models
import json


class VideoFile(models.Model):
    path = models.CharField(max_length=500)
    filename = models.CharField(max_length=255)
    size = models.BigIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.filename


class ProcessingJob(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('error', 'Error')
    ]

    job_id = models.CharField(max_length=100, unique=True)
    video = models.ForeignKey(VideoFile, on_delete=models.CASCADE, related_name='jobs')
    camera_id = models.CharField(max_length=100, default='default')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    progress = models.FloatField(default=0)
    result = models.JSONField(null=True, blank=True)
    avg_speed = models.FloatField(default=0)  # Average belt speed
    max_speed = models.FloatField(default=0)  # Maximum speed detected
    min_speed = models.FloatField(default=0)  # Minimum speed detected
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.job_id} - {self.status}"


class Detection(models.Model):
    job = models.ForeignKey(ProcessingJob, on_delete=models.CASCADE, related_name='detections')
    frame_number = models.IntegerField()
    bbox = models.JSONField()  # [x1, y1, x2, y2]
    label = models.CharField(max_length=50)
    confidence = models.FloatField()
    object_area = models.FloatField(null=True, blank=True)  # Area in pixels
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['frame_number']

    def __str__(self):
        return f"Frame {self.frame_number}: {self.label}"