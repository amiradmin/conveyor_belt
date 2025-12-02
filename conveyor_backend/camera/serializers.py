# camera/serializers.py
from rest_framework import serializers
from .models import Camera, ConveyorBelt, Alert


class CameraAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alert
        fields = ['id', 'message', 'timestamp', 'resolved']



class CameraSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Camera
        fields = [
            'id', 'name', 'location', 'status', 'status_display',
            'ip_address', 'last_active', 'efficiency'
        ]
        read_only_fields = ['last_active']


class ConveyorBeltSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    camera_name = serializers.CharField(source='camera.name', read_only=True)

    class Meta:
        model = ConveyorBelt
        fields = [
            'id', 'name', 'camera', 'camera_name', 'status', 'status_display',
            'current_speed', 'average_efficiency', 'last_maintenance',
            'video', 'video_url','plc_logic','style'
        ]


class AlertSerializer(serializers.ModelSerializer):
    alert_type_display = serializers.CharField(source='get_alert_type_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    conveyor_belt_name = serializers.CharField(source='conveyor_belt.name', read_only=True)

    class Meta:
        model = Alert
        fields = [
            'id', 'conveyor_belt', 'conveyor_belt_name', 'alert_type', 'alert_type_display',
            'severity', 'severity_display', 'message', 'timestamp', 'resolved', 'resolved_at'
        ]
        read_only_fields = ['timestamp']


class AlertResolveSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alert
        fields = ['resolved', 'resolved_at']
        read_only_fields = ['resolved_at']