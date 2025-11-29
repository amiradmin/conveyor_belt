# camera/models.py
from django.db import models
from django.utils import timezone


class Camera(models.Model):
    CAMERA_STATUS = [
        ('active', 'فعال'),
        ('inactive', 'غیرفعال'),
        ('maintenance', 'در حال تعمیر'),
    ]

    name = models.CharField(max_length=200, verbose_name="نام دوربین")
    location = models.CharField(max_length=200, verbose_name="موقعیت")
    status = models.CharField(max_length=20, choices=CAMERA_STATUS, default='active')
    ip_address = models.GenericIPAddressField(verbose_name="آدرس IP")
    last_active = models.DateTimeField(null=True, blank=True)
    efficiency = models.FloatField(default=0.0, verbose_name="بازدهی")

    class Meta:
        verbose_name = "دوربین"
        verbose_name_plural = "دوربین‌ها"

    def __str__(self):
        return self.name


class ConveyorBelt(models.Model):
    BELT_STATUS = [
        ('operational', 'عملیاتی'),
        ('maintenance', 'تعمیرات'),
        ('stopped', 'متوقف شده'),
    ]

    name = models.CharField(max_length=200, verbose_name="نام نوار نقاله")
    camera = models.ForeignKey(Camera, on_delete=models.CASCADE, verbose_name="دوربین")
    status = models.CharField(max_length=20, choices=BELT_STATUS, default='operational')
    current_speed = models.FloatField(default=0.0, verbose_name="سرعت فعلی")
    average_efficiency = models.FloatField(default=0.0, verbose_name="میانگین بازدهی")
    last_maintenance = models.DateField(null=True, blank=True, verbose_name="آخرین تعمیر")

    class Meta:
        verbose_name = "نوار نقاله"
        verbose_name_plural = "نوارهای نقاله"

    def __str__(self):
        return self.name


class Alert(models.Model):
    ALERT_TYPES = [
        ('overload', 'بار بیش از حد'),
        ('misalignment', 'انحراف نوار'),
        ('imbalance', 'عدم تعادل بار'),
        ('jam', 'گیر کردن'),
        ('maintenance', 'نیاز به تعمیر'),
    ]

    ALERT_SEVERITY = [
        ('low', 'کم'),
        ('medium', 'متوسط'),
        ('high', 'بالا'),
        ('critical', 'بحرانی'),
    ]

    conveyor_belt = models.ForeignKey(ConveyorBelt, on_delete=models.CASCADE, verbose_name="نوار نقاله")
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES, verbose_name="نوع هشدار")
    severity = models.CharField(max_length=20, choices=ALERT_SEVERITY, verbose_name="شدت")
    message = models.TextField(verbose_name="پیام")
    timestamp = models.DateTimeField(default=timezone.now, verbose_name="زمان")
    resolved = models.BooleanField(default=False, verbose_name="حل شده")
    resolved_at = models.DateTimeField(null=True, blank=True, verbose_name="زمان حل")

    class Meta:
        verbose_name = "هشدار"
        verbose_name_plural = "هشدارها"
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.get_alert_type_display()} - {self.conveyor_belt.name}"