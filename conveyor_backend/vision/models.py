# vision/models.py
from django.db import models
from django.utils import timezone
import json


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


class Detection(models.Model):
    """Store individual object detections"""
    job = models.ForeignKey(ProcessingJob, on_delete=models.CASCADE, related_name='detections', null=True, blank=True)
    frame_number = models.IntegerField(default=0)
    bbox = models.JSONField(default=list)  # [x1, y1, x2, y2]
    label = models.CharField(max_length=50, default='object')
    confidence = models.FloatField(default=0.0)
    object_area = models.FloatField(null=True, blank=True)
    is_iron_ore = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)  # This will work now

    class Meta:
        ordering = ['frame_number']

    def __str__(self):
        ore_label = " (Iron)" if self.is_iron_ore else ""
        return f"Frame {self.frame_number}: {self.label}{ore_label}"


# If you want BeltMetrics model, add it too:
class BeltMetrics(models.Model):
    """Store belt metrics for each frame"""
    VIBRATION_SEVERITY_CHOICES = [
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High')
    ]

    job_id = models.CharField(max_length=100, db_index=True)
    frame_number = models.IntegerField(default=0)
    timestamp = models.DateTimeField(auto_now_add=True)

    # Speed metrics
    speed = models.FloatField(default=0.0)  # meters per minute
    avg_speed = models.FloatField(default=0.0)

    # Vibration metrics
    vibration_amplitude = models.FloatField(default=0.0)
    vibration_frequency = models.FloatField(default=0.0)
    vibration_severity = models.CharField(max_length=10, choices=VIBRATION_SEVERITY_CHOICES, default='Low')

    # Alignment metrics
    alignment_deviation = models.IntegerField(default=0)  # pixels from center
    avg_alignment = models.FloatField(default=0.0)

    # Belt info
    belt_width = models.FloatField(default=0.0)
    belt_found = models.BooleanField(default=False)

    class Meta:
        ordering = ['frame_number']
        indexes = [
            models.Index(fields=['job_id', 'frame_number']),
        ]

    def __str__(self):
        return f"Frame {self.frame_number}: Speed={self.speed:.2f}, Belt Found={self.belt_found}"