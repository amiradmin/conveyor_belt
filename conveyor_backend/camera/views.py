# camera/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import cv2
import base64
import os
import numpy as np
import random
from ultralytics import YOLO
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .services.video_processor import video_processor
from collections import deque
import math
import json
from django.utils import timezone
import logging
from rest_framework import viewsets, generics
from rest_framework.decorators import action
from django.db.models import Count, Avg
import threading
from .models import Camera, ConveyorBelt, Alert
from .serializers import (
    CameraSerializer,
    ConveyorBeltSerializer,
    AlertSerializer,
    AlertResolveSerializer
)

logger = logging.getLogger(__name__)

# Load YOLO once
try:
    model = YOLO("yolov8n.pt")
except Exception as e:
    logger.warning(f"Could not load YOLO model: {e}")
    model = None


# ===== CRUD VIEWSETS =====
class BeltCamerasAPI(APIView):
    """
    API endpoint that returns all conveyor belts with their associated cameras
    Handles belts without cameras assigned
    """

    def get(self, request):
        try:
            # Get all conveyor belts, including those without cameras
            conveyor_belts = ConveyorBelt.objects.select_related('camera').all()

            # Structure the response data
            belts_data = []

            for belt in conveyor_belts:
                # Check if belt has a camera assigned
                if belt.camera:
                    camera_data = {
                        'id': belt.camera.id,
                        'name': belt.camera.name,
                        'location': belt.camera.location,
                        'status': belt.camera.status,
                        'status_display': belt.camera.get_status_display(),
                        'ip_address': belt.camera.ip_address,
                        'last_active': belt.camera.last_active,
                        'efficiency': belt.camera.efficiency
                    }
                else:
                    # No camera assigned
                    camera_data = None

                belt_data = {
                    'id': belt.id,
                    'name': belt.name,
                    'status': belt.status,
                    'status_display': belt.get_status_display(),
                    'current_speed': belt.current_speed,
                    'average_efficiency': belt.average_efficiency,
                    'last_maintenance': belt.last_maintenance,
                    'video_url': belt.video_url,
                    'camera': camera_data,  # This can be None
                    'has_camera': belt.camera is not None  # Explicit flag for frontend
                }
                belts_data.append(belt_data)

            # Add statistics about belts with/without cameras
            belts_with_cameras = [belt for belt in conveyor_belts if belt.camera]
            belts_without_cameras = [belt for belt in conveyor_belts if not belt.camera]

            return Response({
                'count': len(belts_data),
                'statistics': {
                    'total_belts': len(belts_data),
                    'belts_with_cameras': len(belts_with_cameras),
                    'belts_without_cameras': len(belts_without_cameras),
                    'camera_coverage': f"{(len(belts_with_cameras) / len(belts_data) * 100):.1f}%" if belts_data else "0%"
                },
                'belts': belts_data
            })

        except Exception as e:
            return Response(
                {'error': f'خطا در دریافت اطلاعات: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class CameraViewSet(viewsets.ModelViewSet):
    queryset = Camera.objects.all()
    serializer_class = CameraSerializer

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        camera = self.get_object()
        new_status = request.data.get('status')

        if new_status in dict(Camera.CAMERA_STATUS):
            camera.status = new_status
            camera.save()
            return Response({'status': 'Status updated successfully'})
        return Response(
            {'error': 'Invalid status'},
            status=status.HTTP_400_BAD_REQUEST
        )


class ConveyorBeltViewSet(viewsets.ModelViewSet):
    queryset = ConveyorBelt.objects.all()
    serializer_class = ConveyorBeltSerializer

    def get_queryset(self):
        queryset = ConveyorBelt.objects.all()
        camera_id = self.request.query_params.get('camera_id')
        status = self.request.query_params.get('status')

        if camera_id:
            queryset = queryset.filter(camera_id=camera_id)
        if status:
            queryset = queryset.filter(status=status)

        return queryset

    @action(detail=True, methods=['post'])
    def update_speed(self, request, pk=None):
        conveyor_belt = self.get_object()
        new_speed = request.data.get('speed')

        try:
            conveyor_belt.current_speed = float(new_speed)
            conveyor_belt.save()
            return Response({'status': 'Speed updated successfully'})
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid speed value'},
                status=status.HTTP_400_BAD_REQUEST
            )


class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer

    def get_queryset(self):
        queryset = Alert.objects.all()
        resolved = self.request.query_params.get('resolved')
        severity = self.request.query_params.get('severity')
        conveyor_belt_id = self.request.query_params.get('conveyor_belt_id')

        if resolved is not None:
            queryset = queryset.filter(resolved=resolved.lower() == 'true')
        if severity:
            queryset = queryset.filter(severity=severity)
        if conveyor_belt_id:
            queryset = queryset.filter(conveyor_belt_id=conveyor_belt_id)

        return queryset

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        alert = self.get_object()
        alert.resolved = True
        alert.resolved_at = timezone.now()
        alert.save()

        return Response({'status': 'Alert resolved successfully'})

    @action(detail=False, methods=['get'])
    def unresolved_count(self, request):
        count = Alert.objects.filter(resolved=False).count()
        return Response({'unresolved_count': count})

    @action(detail=False, methods=['get'])
    def by_severity(self, request):
        severity_counts = {}
        for severity in dict(Alert.ALERT_SEVERITY):
            severity_counts[severity] = Alert.objects.filter(severity=severity).count()
        return Response(severity_counts)


# ===== VIDEO PROCESSING APIS =====

class ProcessVideoFile(APIView):
    def post(self, request):
        """
        Start video processing asynchronously
        """
        video_path = request.data.get("video_path")
        if not video_path or not os.path.exists(video_path):
            return Response({"error": "Video file not found"}, status=400)

        # Start async processing
        try:
            result = video_processor.process_video_async(
                video_path,
                callback=self._processing_complete_callback
            )
            return Response(result)
        except Exception as e:
            logger.error(f"Video processing error: {str(e)}")
            return Response({"error": "Processing failed"}, status=500)

    def _processing_complete_callback(self, result):
        """Callback when video processing is complete"""
        # You can store results in database or send final WebSocket message here
        logger.info(f"Video processing completed: {result}")

        # Send WebSocket notification
        try:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "video_processing",
                {
                    "type": "processing_complete",
                    "data": result
                }
            )
        except Exception as e:
            logger.error(f"WebSocket callback error: {str(e)}")

    def get(self, request):
        """Get current processing status"""
        try:
            status = video_processor.get_status()
            return Response(status)
        except Exception as e:
            logger.error(f"Status check error: {str(e)}")
            return Response({"error": "Status check failed"}, status=500)

    def delete(self, request):
        """Stop current processing"""
        try:
            video_processor.stop_processing()
            return Response({"status": "stopped"})
        except Exception as e:
            logger.error(f"Stop processing error: {str(e)}")
            return Response({"error": "Stop failed"}, status=500)


class RealTimeAnalysisAPI(APIView):
    """Lightweight API for real-time frame analysis without blocking"""

    def post(self, request):
        try:
            camera_id = request.data.get("camera_id", "default")
            file = request.FILES.get("frame")

            if not file:
                return Response({"error": "No frame received"}, status=400)

            # Quick frame analysis (non-blocking)
            analysis = self.quick_analyze_frame(file, camera_id)

            # Send WebSocket update in background
            self.send_websocket_update_async(analysis, camera_id)

            return Response(analysis)

        except Exception as e:
            logger.error(f"Real-time analysis error: {str(e)}")
            return Response({"error": "Analysis error"}, status=500)

    def quick_analyze_frame(self, file, camera_id):
        """Quick analysis without heavy processing"""
        try:
            # Simple contour detection for real-time
            img_bytes = file.read()
            img_array = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

            if frame is None:
                return {"error": "Invalid image"}

            # Quick object count
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            blur = cv2.GaussianBlur(gray, (5, 5), 0)
            edges = cv2.Canny(blur, 50, 150)
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            object_count = len([cnt for cnt in contours if cv2.contourArea(cnt) > 100])

            return {
                "camera_id": camera_id,
                "object_count": object_count,
                "timestamp": timezone.now().isoformat(),
                "processing_time": "realtime"
            }
        except Exception as e:
            logger.error(f"Frame analysis error: {str(e)}")
            return {"error": "Frame analysis failed"}

    def send_websocket_update_async(self, analysis, camera_id):
        """Send WebSocket update in background thread"""

        def send_update():
            try:
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    f"conveyor_{camera_id}",
                    {
                        "type": "realtime_update",
                        "data": analysis
                    }
                )
            except Exception as e:
                logger.error(f"Async WebSocket error: {str(e)}")

        # Start in background thread
        thread = threading.Thread(target=send_update)
        thread.daemon = True
        thread.start()


class ConveyorAnalysisAPI(APIView):
    def __init__(self):
        super().__init__()
        self.prev_positions = deque(maxlen=10)
        self.frame_count = 0
        self.alert_cooldown = {}

    def post(self, request):
        try:
            camera_id = request.data.get("camera_id", "default")
            file = request.FILES.get("frame")

            if not file:
                return Response({"error": "No frame received"}, status=400)

            # Decode frame
            img_bytes = file.read()
            img_array = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

            if frame is None:
                return Response({"error": "Invalid image"}, status=400)

            # Analyze objects with enhanced contour detection
            objects_analysis = self.analyze_objects_with_contours(frame)
            belt_analysis = self.analyze_belt_alignment(frame)
            load_analysis = self.analyze_load_distribution(objects_analysis["objects"])
            safety_analysis = self.analyze_safety_issues(frame, objects_analysis["objects"])

            # Check for alerts
            alerts = self.check_alerts(objects_analysis, belt_analysis, load_analysis, safety_analysis, camera_id)

            # Combine analyses
            combined_analysis = {
                **objects_analysis,
                **belt_analysis,
                **load_analysis,
                **safety_analysis,
                "timestamp": self.frame_count,
                "camera_id": camera_id,
                "system_health": self.calculate_system_health(objects_analysis, belt_analysis, load_analysis),
                "alerts": alerts,
                "processing_time": timezone.now().isoformat()
            }

            self.frame_count += 1

            # Send real-time update via WebSocket
            self.send_websocket_update(combined_analysis, camera_id)

            response = Response(combined_analysis)
            response["Access-Control-Allow-Origin"] = "*"
            response["Access-Control-Allow-Headers"] = "*"
            return response

        except Exception as e:
            logger.error(f"Error in conveyor analysis: {str(e)}")
            return Response({"error": "Internal server error"}, status=500)

    # ... (keep all your existing ConveyorAnalysisAPI methods as they are)
    # They look good - just add proper error handling if needed


# ===== SYSTEM STATUS APIS =====

class SystemStatusAPI(APIView):
    """API for overall system status and dashboard data"""

    def get(self, request):
        try:
            # Get real data from database
            active_cameras = Camera.objects.filter(status='active').count()
            total_alerts = Alert.objects.count()
            critical_alerts = Alert.objects.filter(severity='critical', resolved=False).count()

            system_status = {
                "overall_health": "good",
                "active_cameras": active_cameras,
                "total_alerts": total_alerts,
                "critical_alerts": critical_alerts,
                "total_throughput": 2450,
                "average_efficiency": 94.7,
                "uptime_percentage": 99.2,
                "maintenance_required": 2,
                "cameras": [
                    {
                        "id": "camera_1",
                        "name": "نوار اصلی انتقال",
                        "status": "active",
                        "efficiency": 96.5,
                        "object_count": 8,
                        "belt_speed": 2.4,
                        "last_update": timezone.now().isoformat()
                    }
                ]
            }

            return Response(system_status)

        except Exception as e:
            logger.error(f"Error in system status: {str(e)}")
            return Response({"error": "Internal server error"}, status=500)


class HistoricalDataAPI(APIView):
    """API for historical data and analytics"""

    def get(self, request):
        try:
            days = int(request.GET.get('days', 7))

            # Generate sample historical data
            historical_data = self.generate_historical_data(days)

            return Response(historical_data)

        except Exception as e:
            logger.error(f"Error in historical data: {str(e)}")
            return Response({"error": "Internal server error"}, status=500)

    def generate_historical_data(self, days):
        """Generate sample historical data for analytics"""
        data = {
            "throughput": [],
            "efficiency": [],
            "alerts": [],
            "downtime": []
        }

        base_date = timezone.now().date()

        for i in range(days):
            date = base_date - timezone.timedelta(days=i)

            data["throughput"].append({
                "date": date.isoformat(),
                "count": random.randint(2000, 3000)
            })

            data["efficiency"].append({
                "date": date.isoformat(),
                "percentage": round(random.uniform(85.0, 98.0), 1)
            })

            data["alerts"].append({
                "date": date.isoformat(),
                "count": random.randint(0, 10)
            })

            data["downtime"].append({
                "date": date.isoformat(),
                "minutes": random.randint(0, 120)
            })

        return data


# ===== DASHBOARD APIS =====

class DashboardStatsAPI(generics.GenericAPIView):
    def get(self, request):
        try:
            stats = {
                'total_cameras': Camera.objects.count(),
                'active_cameras': Camera.objects.filter(status='active').count(),
                'total_belts': ConveyorBelt.objects.count(),
                'operational_belts': ConveyorBelt.objects.filter(status='operational').count(),
                'total_alerts': Alert.objects.count(),
                'unresolved_alerts': Alert.objects.filter(resolved=False).count(),
                'average_efficiency': ConveyorBelt.objects.aggregate(avg=Avg('average_efficiency'))['avg'] or 0,
                'average_speed': ConveyorBelt.objects.aggregate(avg=Avg('current_speed'))['avg'] or 0,
                'cameras_by_status': {
                    status: Camera.objects.filter(status=status).count()
                    for status in dict(Camera.CAMERA_STATUS)
                },
                'belts_by_status': {
                    status: ConveyorBelt.objects.filter(status=status).count()
                    for status in dict(ConveyorBelt.BELT_STATUS)
                },
                'alerts_by_severity': {
                    severity: Alert.objects.filter(severity=severity).count()
                    for severity in dict(Alert.ALERT_SEVERITY)
                }
            }
            return Response(stats)
        except Exception as e:
            logger.error(f"Dashboard stats error: {str(e)}")
            return Response({"error": "Failed to get dashboard stats"}, status=500)


class CameraBeltsAPI(generics.ListAPIView):
    serializer_class = ConveyorBeltSerializer

    def get_queryset(self):
        camera_id = self.kwargs['camera_id']
        return ConveyorBelt.objects.filter(camera_id=camera_id)


class UnresolvedAlertsAPI(generics.ListAPIView):
    serializer_class = AlertSerializer

    def get_queryset(self):
        return Alert.objects.filter(resolved=False).order_by('-timestamp')


class StreamFrameAPIView(APIView):
    def post(self, request):
        try:
            file = request.FILES.get("frame")
            if not file:
                return Response({"error": "No frame received"}, status=400)

            # Decode frame
            img_bytes = file.read()
            img_array = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

            if frame is None:
                return Response({"error": "Invalid image"}, status=400)

            if model is None:
                return Response({"error": "YOLO model not loaded"}, status=500)

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = model.predict(rgb, conf=0.5, verbose=False)

            detected = False
            confidence = 0.0
            box = None

            for r in results:
                for b, cls, conf in zip(r.boxes.xyxy, r.boxes.cls, r.boxes.conf):
                    name = model.names[int(cls)].lower()
                    if name in ["cup", "mug", "coffee"]:
                        detected = True
                        confidence = float(conf)
                        box = [float(x) for x in b]
                        break
                if detected:
                    break

            # Add CORS headers
            response = Response({
                "coffee_detected": detected,
                "confidence": confidence,
                "bbox": box
            })

            response["Access-Control-Allow-Origin"] = "*"
            response["Access-Control-Allow-Headers"] = "*"
            response["Access-Control-Allow-Methods"] = "POST, OPTIONS"

            return response

        except Exception as e:
            logger.error(f"Stream frame error: {str(e)}")
            return Response({"error": "Frame processing failed"}, status=500)