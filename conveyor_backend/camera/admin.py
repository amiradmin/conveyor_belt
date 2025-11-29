# camera/admin.py
from django.contrib import admin
from django.utils import timezone
from .models import Camera, ConveyorBelt, Alert


# Custom admin classes for better display
class CameraAdmin(admin.ModelAdmin):
    list_display = ['name', 'location', 'status', 'efficiency', 'last_active', 'is_online']
    list_filter = ['status', 'location']
    search_fields = ['name', 'location', 'ip_address']
    readonly_fields = ['last_active']

    def is_online(self, obj):
        if obj.last_active:
            time_diff = timezone.now() - obj.last_active
            return time_diff.total_seconds() < 300  # Online if active in last 5 minutes
        return False

    is_online.boolean = True
    is_online.short_description = 'آنلاین'


class ConveyorBeltAdmin(admin.ModelAdmin):
    list_display = ['name', 'camera', 'status', 'current_speed', 'average_efficiency', 'needs_maintenance']
    list_filter = ['status', 'camera']
    search_fields = ['name', 'camera__name']

    def needs_maintenance(self, obj):
        if obj.last_maintenance:
            days_since_maintenance = (timezone.now().date() - obj.last_maintenance).days
            return days_since_maintenance > 30  # Needs maintenance if over 30 days
        return True  # Never maintained

    needs_maintenance.boolean = True
    needs_maintenance.short_description = 'نیاز به تعمیر'


class AlertAdmin(admin.ModelAdmin):
    list_display = ['conveyor_belt', 'alert_type_display', 'severity_display', 'timestamp', 'resolved', 'resolved_at']
    list_filter = ['alert_type', 'severity', 'resolved', 'timestamp']
    search_fields = ['conveyor_belt__name', 'message']
    readonly_fields = ['timestamp']
    actions = ['mark_as_resolved']

    def alert_type_display(self, obj):
        return obj.get_alert_type_display()

    alert_type_display.short_description = 'نوع هشدار'

    def severity_display(self, obj):
        return obj.get_severity_display()

    severity_display.short_description = 'شدت'

    def mark_as_resolved(self, request, queryset):
        updated = queryset.update(resolved=True, resolved_at=timezone.now())
        self.message_user(request, f'{updated} هشدار به عنوان حل شده علامت گذاری شد.')

    mark_as_resolved.short_description = 'علامت گذاری هشدارهای انتخاب شده به عنوان حل شده'


# Register your models with the custom admin classes
admin.site.register(Camera, CameraAdmin)
admin.site.register(ConveyorBelt, ConveyorBeltAdmin)
admin.site.register(Alert, AlertAdmin)

# Optional: Customize the admin site header and title
admin.site.site_header = 'سیستم نظارت بر نوار نقاله - فولاد شهبان'
admin.site.site_title = 'پنل مدیریت سیستم نوار نقاله'
admin.site.index_title = 'مدیریت سیستم نظارتی'