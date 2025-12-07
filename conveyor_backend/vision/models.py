# vision/models.py
from django.db import models
from django.utils import timezone


class VideoFile(models.Model):
    path = models.CharField(max_length=500)
    filename = models.CharField(max_length=255)
    size = models.BigIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.filename


class ProcessingJob(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('error', 'Error'),
        ('stopped', 'Stopped')
    ]

    job_id = models.CharField(max_length=100, unique=True)
    video = models.ForeignKey(VideoFile, on_delete=models.CASCADE, related_name='jobs', null=True, blank=True)
    camera_id = models.CharField(max_length=100, default='default')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    progress = models.FloatField(default=0)
    result = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.job_id} - {self.status}"