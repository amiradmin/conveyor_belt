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
from django.db.models import Prefetch
from .serializers import (
    CameraSerializer,
    ConveyorBeltSerializer,
    AlertSerializer,
    AlertResolveSerializer,

)

logger = logging.getLogger(__name__)

# Load YOLO once
try:
    model = YOLO("yolov8n.pt")
except Exception as e:
    logger.warning(f"Could not load YOLO model: {e}")
    model = None


# ===== CRUD VIEWSETS =====
class CameraUnresolvedAlertsAPI(APIView):
    def get(self, request):
        return Response({"alerts": []})



class UnresolvedAlertsView(APIView):
    def get(self, request):
        return Response({"alerts": []})



class BeltCamerasAPI(APIView):
    """
    Returns conveyor belts + cameras + simulation configuration
    Compatible with PLC / web visualization modules
    """

    def get(self, request):
        try:
            conveyor_belts = ConveyorBelt.objects.all()  # single camera FK

            belts_data = []

            for belt in conveyor_belts:
                # camera pack
                cameras = [{
                    "id": belt.camera.id,
                    "name": belt.camera.name,
                    "url": belt.camera.url,
                    "ip_address": belt.camera.ip_address,
                    "status": belt.camera.status,
                    "status_display": belt.camera.get_status_display(),
                    "location": belt.camera.location,
                    "last_active": belt.camera.last_active,
                    "efficiency": belt.camera.efficiency,
                }] if belt.camera else []

                belts_data.append({
                    "id": belt.id,
                    "name": belt.name,
                    "status": belt.status,
                    "status_display": belt.get_status_display(),
                    "current_speed": belt.current_speed,
                    "average_efficiency": belt.average_efficiency,
                    "last_maintenance": belt.last_maintenance,
                    "video_url": belt.video_url,
                    "style": belt.style or {},

                    # PLC / simulation defaults
                    "simulation": {
                        "belt_speed": belt.current_speed,
                        "sensor_states": {},  # default empty
                        "roller_count": 6,    # default
                        "alarm_state": False,
                        "fault_message": "",
                        "is_running": False,
                        "load_level": 0,
                        "object_count": 0,
                    },

                    "cameras": cameras,
                    "has_camera": len(cameras) > 0,
                })

            total = len(belts_data)
            belts_with_cam = sum(1 for b in belts_data if b["has_camera"])

            return Response({
                "count": total,
                "statistics": {
                    "total_belts": total,
                    "belts_with_cameras": belts_with_cam,
                    "belts_without_cameras": total - belts_with_cam,
                    "camera_coverage": f"{(belts_with_cam / total * 100):.1f}%" if total else "0%",
                },
                "belts": belts_data
            })

        except Exception as e:
            return Response(
                {"error": f"⚠️ خطا در دریافت اطلاعات: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
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
        camera_id = request.data.get("camera_id", "default")

        if not video_path:
            return Response(
                {"error": "video_path is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        logger.info(f"Processing video request received. Path: {video_path}")

        # Try to find the video file
        actual_path = self.find_video_file(video_path)

        if not actual_path:
            return Response(
                {
                    "error": "Video file not found",
                    "attempted_path": video_path,
                    "suggestions": [
                        "Use absolute server path",
                        "Store videos in MEDIA_ROOT folder",
                        "Check file permissions"
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate it's a video file
        if not self.is_valid_video(actual_path):
            return Response(
                {"error": "Invalid video file format"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Start async processing
        try:
            result = video_processor.process_video_async(
                actual_path,
                camera_id=camera_id,
                callback=self._processing_complete_callback
            )

            return Response({
                "status": "processing_started",
                "video_path": actual_path,
                "message": "Video processing started successfully",
                "file_info": {
                    "size": os.path.getsize(actual_path),
                    "exists": os.path.exists(actual_path)
                }
            })

        except Exception as e:
            logger.error(f"Video processing error: {str(e)}", exc_info=True)
            return Response(
                {"error": "Processing failed", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _processing_complete_callback(self, result):
        """Callback when video processing is complete"""
        # You can store results in database or send final WebSocket message here
        logger.info(f"Video processing completed: {result}")

        # Send WebSocket notification if needed
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

    def find_video_file(self, path):
        """Try to locate the video file using multiple strategies"""
        from django.conf import settings

        possibilities = []

        # 1. If it's a URL, extract the path
        if path.startswith('http://') or path.startswith('https://'):
            from urllib.parse import urlparse
            parsed = urlparse(path)
            path = parsed.path

        # 2. If it's already an absolute path
        if os.path.isabs(path):
            possibilities.append(path)

        # 3. Relative to MEDIA_ROOT
        possibilities.append(os.path.join(settings.MEDIA_ROOT, path.lstrip('/')))

        # 4. Just the filename in MEDIA_ROOT
        possibilities.append(os.path.join(settings.MEDIA_ROOT, os.path.basename(path)))

        # 5. Current directory
        possibilities.append(os.path.join(os.getcwd(), path))

        # 6. Common test video locations
        test_videos = ['3.mp4', 'test_video.mp4', 'sample.mp4', 'conveyor.mp4']
        for video in test_videos:
            possibilities.append(os.path.join(settings.MEDIA_ROOT, video))
            possibilities.append(os.path.join(settings.BASE_DIR, 'media', video))
            possibilities.append(os.path.join('/tmp', video))

        # Try each possibility
        for possible_path in possibilities:
            if os.path.exists(possible_path):
                logger.info(f"Found video at: {possible_path}")
                return possible_path

        logger.warning(f"Video not found. Tried: {possibilities}")
        return None

    def is_valid_video(self, path):
        """Check if file is a valid video"""
        try:
            cap = cv2.VideoCapture(path)
            if not cap.isOpened():
                logger.error(f"Could not open video: {path}")
                return False

            # Check if we can read at least one frame
            ret, frame = cap.read()
            cap.release()

            if not ret:
                logger.error(f"Could not read frames from: {path}")
                return False

            logger.info(f"Valid video: {path}, Frame size: {frame.shape if frame is not None else 'N/A'}")
            return True

        except Exception as e:
            logger.error(f"Video validation error for {path}: {str(e)}")
            return False

    def get(self, request):
        """Get current processing status and list available videos"""
        try:
            # Return available videos in MEDIA_ROOT
            from django.conf import settings
            import glob

            available_videos = []
            media_root = settings.MEDIA_ROOT

            if os.path.exists(media_root):
                video_extensions = ['*.mp4', '*.avi', '*.mov', '*.mkv', '*.flv']
                for ext in video_extensions:
                    videos = glob.glob(os.path.join(media_root, ext))
                    for video in videos:
                        rel_path = os.path.relpath(video, media_root)
                        available_videos.append({
                            'path': rel_path,
                            'full_path': video,
                            'size': os.path.getsize(video),
                            'exists': True
                        })

            # Get processing status
            status_info = video_processor.get_status()
            status_info['available_videos'] = available_videos
            status_info['media_root'] = media_root

            return Response(status_info)
        except Exception as e:
            logger.error(f"Status check error: {str(e)}")
            return Response(
                {"error": "Status check failed"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def delete(self, request):
        """Stop current processing"""
        try:
            job_id = request.data.get('job_id')
            if job_id:
                video_processor.stop_processing(job_id)
                return Response({
                    "status": "stopped",
                    "job_id": job_id,
                    "message": "Processing job stopped"
                })
            else:
                video_processor.stop_processing()
                return Response({"status": "all_processing_stopped"})
        except Exception as e:
            logger.error(f"Stop processing error: {str(e)}")
            return Response(
                {"error": "Stop failed", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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


# In camera/views.py, update the ConveyorAnalysisAPI class:

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

            # Analyze objects with enhanced contour detection (Iron Ore)
            objects_analysis = self.analyze_objects_with_contours(frame)
            belt_analysis = self.analyze_belt_alignment(frame)
            load_analysis = self.analyze_load_distribution(objects_analysis["objects"])
            safety_analysis = self.analyze_safety_issues(frame, objects_analysis["objects"])
            
            # Calculate belt speed from object movement
            belt_speed = self.calculate_belt_speed(objects_analysis["objects"])
            
            # Calculate weight and detect overweight for Iron Ore
            weight_analysis = self.calculate_weight_and_overweight(objects_analysis["objects"], load_analysis)

            # Check for alerts
            alerts = self.check_alerts(objects_analysis, belt_analysis, load_analysis, safety_analysis, camera_id)

            # Combine analyses
            combined_analysis = {
                **objects_analysis,
                **belt_analysis,
                **load_analysis,
                **safety_analysis,
                **weight_analysis,
                "belt_speed": belt_speed,
                "current_speed": belt_speed,  # Alias for compatibility
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
            logger.error(f"Error in conveyor analysis: {str(e)}", exc_info=True)
            return Response({"error": "Internal server error", "details": str(e)}, status=500)

    def analyze_objects_with_contours(self, frame):
        """Enhanced object detection using contour analysis"""
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

            # Apply Gaussian blur
            blur = cv2.GaussianBlur(gray, (7, 7), 0)

            # Edge detection
            edges = cv2.Canny(blur, 50, 150)

            # Find contours
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            objects = []
            valid_contours = []

            for contour in contours:
                area = cv2.contourArea(contour)
                if area > 500:  # Minimum area threshold
                    # Get bounding box
                    x, y, w, h = cv2.boundingRect(contour)

                    # Calculate center
                    center_x = x + w // 2
                    center_y = y + h // 2

                    # Calculate confidence based on contour solidity
                    hull = cv2.convexHull(contour)
                    hull_area = cv2.contourArea(hull)
                    solidity = area / hull_area if hull_area > 0 else 0
                    confidence = min(0.3 + solidity * 0.7, 0.95)  # Scale to 0.3-0.95

                    object_data = {
                        "id": len(objects) + 1,
                        "bbox": [float(x), float(y), float(x + w), float(y + h)],
                        "center": [float(center_x), float(center_y)],
                        "size": float(area),
                        "confidence": float(confidence),
                        "label": "Iron Ore",
                        "color": "#00FF00"  # Default green color
                    }
                    objects.append(object_data)
                    valid_contours.append(contour)

            return {
                "object_count": len(objects),
                "objects": objects,
                "total_area": sum([obj["size"] for obj in objects]),
                "average_confidence": np.mean([obj["confidence"] for obj in objects]) if objects else 0
            }

        except Exception as e:
            logger.error(f"Contour analysis error: {str(e)}")
            return {"object_count": 0, "objects": [], "total_area": 0, "average_confidence": 0}

    def analyze_belt_alignment(self, frame):
        """Analyze belt alignment and center deviation"""
        try:
            height, width = frame.shape[:2]

            # Convert to grayscale
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

            # Apply threshold to detect belt edges
            _, thresh = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)

            # Find contours of belt edges
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            if len(contours) > 0:
                # Find the largest contour (likely the belt)
                largest_contour = max(contours, key=cv2.contourArea)
                x, y, w, h = cv2.boundingRect(largest_contour)

                # Calculate center of belt
                belt_center = x + w // 2
                frame_center = width // 2
                deviation = belt_center - frame_center

                # Calculate deviation percentage
                max_deviation = width * 0.2  # 20% of frame width
                deviation_percentage = abs(deviation) / max_deviation * 100

                return {
                    "belt_width": w,
                    "belt_height": h,
                    "deviation": float(deviation),
                    "deviation_percentage": float(deviation_percentage),
                    "max_deviation": float(max_deviation),
                    "status": "good" if deviation_percentage < 10 else "warning" if deviation_percentage < 20 else "critical"
                }
            else:
                return {
                    "belt_width": width,
                    "belt_height": height,
                    "deviation": 0.0,
                    "deviation_percentage": 0.0,
                    "max_deviation": width * 0.2,
                    "status": "unknown"
                }

        except Exception as e:
            logger.error(f"Belt alignment analysis error: {str(e)}")
            return {
                "belt_width": frame.shape[1] if frame is not None else 0,
                "belt_height": frame.shape[0] if frame is not None else 0,
                "deviation": 0.0,
                "deviation_percentage": 0.0,
                "max_deviation": 100.0,
                "status": "error"
            }

    def analyze_load_distribution(self, objects):
        """Analyze load distribution across the conveyor"""
        try:
            if not objects:
                return {
                    "load_level": 0,
                    "distribution": "empty",
                    "density": 0.0,
                    "clustering_score": 0.0
                }

            # Calculate total area of objects
            total_area = sum(obj.get("size", 0) for obj in objects)

            # Estimate frame area (assuming standard resolution)
            frame_area = 640 * 480  # Default frame size

            # Calculate load percentage
            load_percentage = min((total_area / frame_area) * 100, 100)

            # Analyze distribution (check if objects are evenly spread)
            centers = [obj.get("center", [0, 0]) for obj in objects]
            x_coords = [center[0] for center in centers if len(center) >= 2]

            if len(x_coords) > 1:
                x_std = np.std(x_coords)
                distribution = "even" if x_std < 100 else "clustered" if x_std < 200 else "scattered"
                clustering_score = min(x_std / 300, 1.0)
            else:
                distribution = "unknown"
                clustering_score = 0.0

            return {
                "load_level": float(load_percentage),
                "distribution": distribution,
                "density": float(total_area / len(objects)) if objects else 0,
                "clustering_score": float(clustering_score)
            }

        except Exception as e:
            logger.error(f"Load distribution analysis error: {str(e)}")
            return {
                "load_level": 0,
                "distribution": "error",
                "density": 0.0,
                "clustering_score": 0.0
            }

    def calculate_belt_speed(self, objects):
        """Calculate belt speed based on object movement (pixels per second to m/s conversion)"""
        try:
            if not objects:
                return 0.0
            
            # Get current object positions (use first object's center x coordinate)
            if objects and len(objects) > 0:
                current_x = objects[0].get("center", [0, 0])[0]
                self.prev_positions.append(current_x)
            
            # Calculate speed if we have enough history
            if len(self.prev_positions) >= 2:
                # Estimate pixels per frame
                positions = list(self.prev_positions)
                if len(positions) >= 2:
                    # Average movement per frame
                    movements = [abs(positions[i] - positions[i-1]) for i in range(1, len(positions))]
                    avg_movement = np.mean(movements) if movements else 0
                    
                    # Assume 30 FPS and convert pixels to meters
                    # Typical conversion: 1 pixel ≈ 0.001 meters (adjust based on camera setup)
                    pixels_per_second = avg_movement * 30  # Assuming 30 FPS
                    meters_per_second = pixels_per_second * 0.001  # Adjust this conversion factor
                    
                    return float(meters_per_second)
            
            return 0.0
            
        except Exception as e:
            logger.error(f"Belt speed calculation error: {str(e)}")
            return 0.0

    def calculate_weight_and_overweight(self, objects, load_analysis):
        """Calculate total weight and detect overweight conditions for Iron Ore"""
        try:
            # Estimate weight based on total area (Iron Ore density estimation)
            # Assuming: 1 pixel² ≈ 0.01 kg (adjust based on actual calibration)
            total_area = sum(obj.get("size", 0) for obj in objects)
            estimated_weight = total_area * 0.01  # kg
            
            # Overweight threshold: if load_level > 80% or individual objects too large
            load_level = load_analysis.get("load_level", 0)
            max_object_size = max([obj.get("size", 0) for obj in objects], default=0)
            
            # Threshold: if any single Iron Ore piece is > 50000 pixels (large piece)
            # or total load > 80%
            overweight_detected = load_level > 80 or max_object_size > 50000
            
            return {
                "total_weight": float(estimated_weight),
                "total_area": float(total_area),
                "overweight_detected": overweight_detected,
                "max_object_size": float(max_object_size),
                "load_percentage": float(load_level)
            }
            
        except Exception as e:
            logger.error(f"Weight calculation error: {str(e)}")
            return {
                "total_weight": 0.0,
                "total_area": 0.0,
                "overweight_detected": False,
                "max_object_size": 0.0,
                "load_percentage": 0.0
            }

    def analyze_safety_issues(self, frame, objects):
        """Detect safety issues like objects near edges"""
        try:
            height, width = frame.shape[:2]
            safety_margin = 50  # pixels from edge
            safety_zones = []
            issues = []

            # Define safety zones (edges of the frame)
            safety_zones.append({
                "x": 0,
                "y": 0,
                "width": width,
                "height": safety_margin,
                "type": "top_edge",
                "risk": "high"
            })
            safety_zones.append({
                "x": 0,
                "y": height - safety_margin,
                "width": width,
                "height": safety_margin,
                "type": "bottom_edge",
                "risk": "high"
            })
            safety_zones.append({
                "x": 0,
                "y": 0,
                "width": safety_margin,
                "height": height,
                "type": "left_edge",
                "risk": "medium"
            })
            safety_zones.append({
                "x": width - safety_margin,
                "y": 0,
                "width": safety_margin,
                "height": height,
                "type": "right_edge",
                "risk": "medium"
            })

            # Check each object for safety issues
            for obj in objects:
                bbox = obj.get("bbox", [0, 0, 0, 0])
                if len(bbox) >= 4:
                    x1, y1, x2, y2 = bbox

                    # Check if object is too close to edges
                    if (x1 < safety_margin or x2 > width - safety_margin or
                            y1 < safety_margin or y2 > height - safety_margin):

                        issue_type = []
                        if x1 < safety_margin:
                            issue_type.append("left_edge")
                        if x2 > width - safety_margin:
                            issue_type.append("right_edge")
                        if y1 < safety_margin:
                            issue_type.append("top_edge")
                        if y2 > height - safety_margin:
                            issue_type.append("bottom_edge")

                        issues.append({
                            "object_id": obj.get("id"),
                            "type": issue_type,
                            "severity": "warning",
                            "message": f"Object {obj.get('id')} too close to {', '.join(issue_type)}"
                        })

            return {
                "safety_zones": safety_zones,
                "issues": issues,
                "risk_level": "high" if len(issues) > 3 else "medium" if len(issues) > 0 else "low"
            }

        except Exception as e:
            logger.error(f"Safety analysis error: {str(e)}")
            return {
                "safety_zones": [],
                "issues": [],
                "risk_level": "unknown"
            }

    def check_alerts(self, objects_analysis, belt_analysis, load_analysis, safety_analysis, camera_id):
        """Generate alerts based on analysis results"""
        alerts = []

        # Object count alerts
        if objects_analysis.get("object_count", 0) > 15:
            alerts.append({
                "type": "high_density",
                "severity": "warning",
                "message": f"High object density detected: {objects_analysis['object_count']} objects",
                "camera_id": camera_id
            })

        # Belt alignment alerts
        deviation_percentage = belt_analysis.get("deviation_percentage", 0)
        if deviation_percentage > 20:
            alerts.append({
                "type": "belt_misalignment",
                "severity": "critical",
                "message": f"Belt misalignment detected: {deviation_percentage:.1f}% deviation",
                "camera_id": camera_id
            })
        elif deviation_percentage > 10:
            alerts.append({
                "type": "belt_misalignment",
                "severity": "warning",
                "message": f"Belt slightly misaligned: {deviation_percentage:.1f}% deviation",
                "camera_id": camera_id
            })

        # Load alerts
        load_level = load_analysis.get("load_level", 0)
        if load_level > 80:
            alerts.append({
                "type": "overload",
                "severity": "critical",
                "message": f"Conveyor overload detected: {load_level:.1f}% load",
                "camera_id": camera_id
            })
        elif load_level > 60:
            alerts.append({
                "type": "high_load",
                "severity": "warning",
                "message": f"High conveyor load: {load_level:.1f}%",
                "camera_id": camera_id
            })

        # Safety alerts
        safety_issues = safety_analysis.get("issues", [])
        if len(safety_issues) > 0:
            alerts.append({
                "type": "safety_risk",
                "severity": "warning" if len(safety_issues) <= 3 else "critical",
                "message": f"{len(safety_issues)} safety risk(s) detected",
                "camera_id": camera_id
            })

        return alerts

    def calculate_system_health(self, objects_analysis, belt_analysis, load_analysis):
        """Calculate overall system health score (0-100)"""
        try:
            # Object analysis score (based on confidence and count)
            object_score = min(objects_analysis.get("average_confidence", 0) * 100, 100)
            object_count = objects_analysis.get("object_count", 0)
            if object_count > 20:
                object_score *= 0.8  # Penalize for too many objects
            elif object_count == 0:
                object_score = 50  # Base score for empty conveyor

            # Belt alignment score
            deviation = abs(belt_analysis.get("deviation_percentage", 0))
            belt_score = max(100 - deviation * 2, 0)  # 10% deviation = 80 score

            # Load score
            load_level = load_analysis.get("load_level", 0)
            load_score = 100 - abs(load_level - 50) / 2  # Optimal at 50% load

            # Weighted average
            health_score = (
                    object_score * 0.4 +  # 40% weight to object detection
                    belt_score * 0.3 +  # 30% weight to belt alignment
                    load_score * 0.3  # 30% weight to load distribution
            )

            return max(0, min(100, health_score))

        except Exception as e:
            logger.error(f"Health calculation error: {str(e)}")
            return 50.0  # Default score

    def send_websocket_update(self, analysis, camera_id):
        """Send analysis update via WebSocket"""
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
            logger.error(f"WebSocket update error: {str(e)}")

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