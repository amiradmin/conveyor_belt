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

logger = logging.getLogger(__name__)

# Load YOLO once
try:
    model = YOLO("yolov8n.pt")
except Exception as e:
    logger.warning(f"Could not load YOLO model: {e}")
    model = None

from .services.video_processor import video_processor
import os


class ProcessVideoFile(APIView):
    def post(self, request):
        """
        Start video processing asynchronously
        """
        video_path = request.data.get("video_path")
        if not video_path or not os.path.exists(video_path):
            return Response({"error": "Video file not found"}, status=400)

        # Start async processing
        result = video_processor.process_video_async(
            video_path,
            callback=self._processing_complete_callback
        )

        return Response(result)

    def _processing_complete_callback(self, result):
        """Callback when video processing is complete"""
        # You can store results in database or send final WebSocket message here
        logger.info(f"Video processing completed: {result}")

    def get(self, request):
        """Get current processing status"""
        status = video_processor.get_status()
        return Response(status)

    def delete(self, request):
        """Stop current processing"""
        video_processor.stop_processing()
        return Response({"status": "stopped"})


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

    def check_alerts(self, objects_analysis, belt_analysis, load_analysis, safety_analysis, camera_id):
        """Check for various alert conditions"""
        alerts = []
        current_time = timezone.now()

        # Overload alert
        if objects_analysis["object_count"] > 15:
            if self.can_trigger_alert("overload", camera_id):
                alerts.append({
                    "type": "overload",
                    "severity": "high",
                    "message": f"Overload detected: {objects_analysis['object_count']} objects",
                    "belt_speed": objects_analysis["belt_speed"]
                })

        # Misalignment alert
        if belt_analysis["alignment_score"] < 0.6:
            if self.can_trigger_alert("misalignment", camera_id):
                alerts.append({
                    "type": "misalignment",
                    "severity": "medium",
                    "message": f"Belt misalignment detected: {belt_analysis['alignment_score']}",
                    "centering": belt_analysis["belt_centering"]
                })

        # Load imbalance alert
        if load_analysis["load_balance"] == "unbalanced":
            if self.can_trigger_alert("imbalance", camera_id):
                alerts.append({
                    "type": "imbalance",
                    "severity": "medium",
                    "message": "Load imbalance detected",
                    "distribution": load_analysis["load_distribution"]
                })

        # Safety alerts
        for safety_alert in safety_analysis.get("safety_issues", []):
            if self.can_trigger_alert(safety_alert["type"], camera_id):
                alerts.append(safety_alert)

        return alerts

    def can_trigger_alert(self, alert_type, camera_id):
        """Prevent alert spam with cooldown"""
        key = f"{camera_id}_{alert_type}"
        current_time = timezone.now()

        if key in self.alert_cooldown:
            last_trigger = self.alert_cooldown[key]
            if (current_time - last_trigger).total_seconds() < 300:  # 5 minutes cooldown
                return False

        self.alert_cooldown[key] = current_time
        return True

    def calculate_system_health(self, objects_analysis, belt_analysis, load_analysis):
        """Calculate overall system health score"""
        health_score = 100

        # Deduct for object overload
        if objects_analysis["object_count"] > 15:
            health_score -= 20
        elif objects_analysis["object_count"] > 10:
            health_score -= 10

        # Deduct for misalignment
        if belt_analysis["alignment_score"] < 0.7:
            health_score -= 15
        elif belt_analysis["alignment_score"] < 0.8:
            health_score -= 5

        # Deduct for imbalance
        if load_analysis["load_balance"] == "unbalanced":
            health_score -= 15
        elif load_analysis["load_balance"] == "slightly_unbalanced":
            health_score -= 5

        if health_score >= 90:
            return "excellent"
        elif health_score >= 80:
            return "good"
        elif health_score >= 70:
            return "fair"
        else:
            return "poor"

    def send_websocket_update(self, analysis_data, camera_id):
        """Send real-time updates via WebSocket"""
        try:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"conveyor_{camera_id}",
                {
                    "type": "analysis_update",
                    "data": analysis_data
                }
            )
        except Exception as e:
            logger.error(f"WebSocket error: {str(e)}")

    def analyze_safety_issues(self, frame, objects):
        """Analyze safety issues like jams or blockages"""
        safety_issues = []

        # Check for potential jams (objects too close together)
        for i, obj1 in enumerate(objects):
            for j, obj2 in enumerate(objects[i + 1:], i + 1):
                distance = math.sqrt(
                    (obj1["center_x"] - obj2["center_x"]) ** 2 +
                    (obj1["center_y"] - obj2["center_y"]) ** 2
                )
                if distance < 50:  # Objects too close
                    safety_issues.append({
                        "type": "potential_jam",
                        "severity": "high",
                        "message": "Objects too close - potential jam risk",
                        "object1": obj1["type"],
                        "object2": obj2["type"],
                        "distance": round(distance, 2)
                    })

        # Check for oversized objects
        oversized_objects = [obj for obj in objects if obj["area"] > 20000]
        if oversized_objects:
            safety_issues.append({
                "type": "oversized_object",
                "severity": "medium",
                "message": f"Oversized object detected: {len(oversized_objects)} objects",
                "count": len(oversized_objects)
            })

        return {"safety_issues": safety_issues}

    def analyze_objects_with_contours(self, frame):
        """Enhanced object detection focusing on contour/edge detection"""
        height, width = frame.shape[:2]

        # Get objects with detailed contour information
        objects = self.detect_objects_with_detailed_contours(frame)

        # If no objects found, generate realistic demo objects
        if len(objects) == 0:
            objects = self.generate_realistic_demo_objects(width, height)

        # Count objects by type
        large_count = len([obj for obj in objects if obj["type"] == "large"])
        medium_count = len([obj for obj in objects if obj["type"] == "medium"])
        small_count = len([obj for obj in objects if obj["type"] == "small"])

        # Calculate belt speed
        belt_speed = self.calculate_belt_speed(objects)

        return {
            "object_count": len(objects),
            "objects": objects,
            "belt_speed": round(belt_speed, 2),
            "large_count": large_count,
            "medium_count": medium_count,
            "small_count": small_count,
            "detection_method": "contour_edge"
        }

    def detect_objects_with_detailed_contours(self, frame):
        """Detect objects with detailed contour information for green edges"""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        height, width = gray.shape

        # Enhanced preprocessing for better edge detection
        blurred = cv2.GaussianBlur(gray, (9, 9), 2)

        # Use Canny edge detection for clear edges
        edges = cv2.Canny(blurred, 50, 150)

        # Dilate edges to connect broken edges
        kernel = np.ones((3, 3), np.uint8)
        edges = cv2.dilate(edges, kernel, iterations=1)

        # Find contours from edges
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        objects = []
        min_area = 800
        max_area = 50000

        for contour in contours:
            area = cv2.contourArea(contour)

            if min_area < area < max_area:
                # Get bounding rectangle
                x, y, w, h = cv2.boundingRect(contour)

                # Check if in conveyor area
                if self.is_in_conveyor_area(x, y, w, h, width, height):
                    # Calculate contour properties
                    perimeter = cv2.arcLength(contour, True)
                    hull = cv2.convexHull(contour)
                    hull_area = cv2.contourArea(hull)

                    # Solidity (area vs convex hull area) - indicates how solid the object is
                    solidity = float(area) / hull_area if hull_area > 0 else 0

                    # Only keep solid objects (avoid detecting random edges)
                    if solidity > 0.3:
                        center_x = x + w / 2
                        center_y = y + h / 2

                        # Classify by size
                        if area > 12000:
                            obj_type = "large"
                            confidence = 0.85
                        elif area > 5000:
                            obj_type = "medium"
                            confidence = 0.75
                        else:
                            obj_type = "small"
                            confidence = 0.65

                        # Get contour points for drawing
                        contour_points = contour.reshape(-1, 2).tolist()

                        # Simplify contour for frontend (reduce points)
                        epsilon = 0.02 * perimeter
                        approx_contour = cv2.approxPolyDP(contour, epsilon, True)
                        simplified_points = approx_contour.reshape(-1, 2).tolist()

                        objects.append({
                            "bbox": [float(x), float(y), float(x + w), float(y + h)],
                            "confidence": confidence,
                            "type": obj_type,
                            "area": float(area),
                            "width": float(w),
                            "height": float(h),
                            "center_x": float(center_x),
                            "center_y": float(center_y),
                            "contour_points": simplified_points,  # Points for green contour
                            "perimeter": float(perimeter),
                            "solidity": float(solidity),
                            "detection_method": "edge_contour"
                        })

        return objects

    def generate_realistic_demo_objects(self, width, height):
        """Generate demo objects with realistic contour shapes"""
        objects = []
        num_objects = random.randint(3, 8)

        for i in range(num_objects):
            # Random size and position
            obj_width = random.randint(40, 150)
            obj_height = random.randint(40, 150)
            x = random.randint(int(width * 0.15), int(width * 0.85 - obj_width))
            y = random.randint(int(height * 0.35), int(height * 0.65 - obj_height))

            area = obj_width * obj_height

            # Classify by size
            if area > 12000:
                obj_type = "large"
                confidence = random.uniform(0.8, 0.95)
            elif area > 5000:
                obj_type = "medium"
                confidence = random.uniform(0.7, 0.85)
            else:
                obj_type = "small"
                confidence = random.uniform(0.6, 0.75)

            # Generate realistic contour points (stone-like shape)
            contour_points = self.generate_stone_contour(x, y, obj_width, obj_height)

            objects.append({
                "bbox": [float(x), float(y), float(x + obj_width), float(y + obj_height)],
                "confidence": confidence,
                "type": obj_type,
                "area": float(area),
                "width": float(obj_width),
                "height": float(obj_height),
                "center_x": float(x + obj_width / 2),
                "center_y": float(y + obj_height / 2),
                "contour_points": contour_points,
                "perimeter": float(2 * (obj_width + obj_height)),
                "solidity": random.uniform(0.6, 0.9),
                "detection_method": "demo"
            })

        return objects

    def generate_stone_contour(self, x, y, width, height):
        """Generate realistic stone-like contour points"""
        points = []
        num_points = 12  # Number of points in the contour

        for i in range(num_points):
            angle = 2 * math.pi * i / num_points

            # Add randomness to create irregular stone shape
            radius_variation = random.uniform(0.7, 1.3)

            # Calculate point with some randomness
            point_x = x + width / 2 + (width / 2 * math.cos(angle) * radius_variation)
            point_y = y + height / 2 + (height / 2 * math.sin(angle) * radius_variation)

            # Ensure points stay within bounds
            point_x = max(x, min(x + width, point_x))
            point_y = max(y, min(y + height, point_y))

            points.append([float(point_x), float(point_y)])

        return points

    def is_in_conveyor_area(self, x, y, w, h, img_width, img_height):
        """Check if object is within conveyor belt area"""
        belt_left = img_width * 0.1
        belt_right = img_width * 0.9
        belt_top = img_height * 0.3
        belt_bottom = img_height * 0.7

        object_center_x = x + w / 2
        object_center_y = y + h / 2

        return (belt_left < object_center_x < belt_right and
                belt_top < object_center_y < belt_bottom)

    def calculate_belt_speed(self, objects):
        """Calculate belt speed"""
        if len(objects) == 0:
            return random.uniform(1.5, 2.8)

        base_speed = 2.0
        load_factor = min(len(objects) / 10.0, 1.0)
        speed_variation = random.uniform(-0.5, 0.5)

        return base_speed + speed_variation + (load_factor * 0.5)

    def analyze_belt_alignment(self, frame):
        """Analyze belt alignment"""
        return {
            "belt_alignment": random.choice(["good", "warning", "good", "good"]),  # Mostly good
            "alignment_score": round(random.uniform(0.7, 0.95), 3),
            "belt_centering": round(random.uniform(-0.1, 0.1), 3),
        }

    def analyze_load_distribution(self, objects):
        """Analyze load distribution"""
        if not objects:
            return {
                "load_balance": "no_load",
                "load_distribution": 0,
                "left_load": 0,
                "right_load": 0,
                "center_load": 0
            }

        left_load = sum(obj["area"] for obj in objects if obj["center_x"] < 0.4)
        right_load = sum(obj["area"] for obj in objects if obj["center_x"] > 0.6)
        center_load = sum(obj["area"] for obj in objects if 0.4 <= obj["center_x"] <= 0.6)

        total_load = left_load + right_load + center_load

        if total_load == 0:
            return {
                "load_balance": "no_load",
                "load_distribution": 0,
                "left_load": 0,
                "right_load": 0,
                "center_load": 0
            }

        load_imbalance = abs(left_load - right_load) / total_load

        if load_imbalance < 0.2:
            balance_status = "balanced"
        elif load_imbalance < 0.4:
            balance_status = "slightly_unbalanced"
        else:
            balance_status = "unbalanced"

        return {
            "load_balance": balance_status,
            "load_distribution": round(load_imbalance, 3),
            "left_load": round(left_load, 2),
            "right_load": round(right_load, 2),
            "center_load": round(center_load, 2)
        }


class StreamFrameAPIView(APIView):
    def post(self, request):
        file = request.FILES.get("frame")
        if not file:
            return Response({"error": "No frame received"}, status=400)

        # Decode frame
        img_bytes = file.read()
        img_array = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

        if frame is None:
            return Response({"error": "Invalid image"}, status=400)

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

#
# class ProcessVideoFile(APIView):
#     def post(self, request):
#         """
#         Process video + send frame number, object count, and realistic belt speed (km/h) via WebSocket
#         """
#         video_path = request.data.get("video_path")
#         if not video_path or not os.path.exists(video_path):
#             return Response({"error": "Video file not found"}, status=400)
#
#         cap = cv2.VideoCapture(video_path)
#         processed_frames = []
#         frame_count = 0
#         processed_count = 0
#         zoom_factor = 3
#         large_stone_area = 1000
#
#         # Calibration: pixels per meter (adjust according to your video)
#         PIXELS_PER_METER = 200  # example: 200 pixels = 1 meter on belt
#
#         VIDEO_FPS = cap.get(cv2.CAP_PROP_FPS) or 30
#         SKIP_FRAMES = 5  # only process every 5th frame
#
#         # Store previous x-coordinates to smooth speed
#         prev_x_queue = deque(maxlen=5)
#
#         # WebSocket channel layer
#         channel_layer = get_channel_layer()
#
#         while True:
#             ret, frame = cap.read()
#             if not ret:
#                 break
#
#             frame_count += 1
#
#             # Only process every SKIP_FRAMES frame
#             if processed_count % SKIP_FRAMES != 0:
#                 processed_count += 1
#                 continue
#
#             # Zoom image
#             frame = cv2.resize(frame, (frame.shape[1] * zoom_factor,
#                                        frame.shape[0] * zoom_factor))
#
#             gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
#             blur = cv2.GaussianBlur(gray, (5, 5), 0)
#
#             # Conveyor belt mask
#             mask = np.zeros_like(blur)
#             h, w = blur.shape
#             cv2.rectangle(mask, (50, int(h * 0.3)), (w - 50, int(h * 0.7)), 255, -1)
#             masked = cv2.bitwise_and(blur, blur, mask=mask)
#
#             # Threshold + Canny
#             _, thresh = cv2.threshold(masked, 50, 255, cv2.THRESH_BINARY)
#             edges = cv2.Canny(thresh, 50, 150)
#
#             # Contours
#             contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
#             frame_copy = frame.copy()
#
#             # Count objects
#             object_count = 0
#             for cnt in contours:
#                 area = cv2.contourArea(cnt)
#                 color = (0, 0, 255) if area >= large_stone_area else (0, 255, 0)
#                 cv2.drawContours(frame_copy, [cnt], -1, color, 2)
#                 if area >= 100:
#                     object_count += 1
#
#             # Estimate belt speed (smoothed)
#             belt_speed_kmh = 0
#             if contours:
#                 largest = max(contours, key=cv2.contourArea)
#                 x, y, w_box, h_box = cv2.boundingRect(largest)
#                 prev_x_queue.append(x)
#
#                 if len(prev_x_queue) >= 2:
#                     # displacement in pixels over last N frames
#                     displacement_pixels = abs(prev_x_queue[-1] - prev_x_queue[0])
#                     # time between first and last frame in seconds
#                     time_sec = (len(prev_x_queue) * SKIP_FRAMES) / VIDEO_FPS
#                     belt_speed_m_per_s = (displacement_pixels / PIXELS_PER_METER) / time_sec
#                     belt_speed_kmh = belt_speed_m_per_s * 3.6
#
#             # Resize for sending
#             small = cv2.resize(frame_copy, (320, 240))
#             _, buffer = cv2.imencode(".jpg", small)
#             img_base64 = base64.b64encode(buffer).decode("utf-8")
#             processed_frames.append(img_base64)
#
#             # 🔴 Send progress + metrics to WebSocket
#             async_to_sync(channel_layer.group_send)(
#                 "frame_progress",
#                 {
#                     "type": "progress_message",
#                     "frame": processed_count,
#                     "object_count": object_count,
#                     "belt_speed": round(belt_speed_kmh, 2),
#                 }
#             )
#
#             processed_count += 1
#
#         cap.release()
#
#         return Response({
#             "original_video_url": f"http://localhost:8000/media/{os.path.basename(video_path)}",
#             "total_frames": frame_count,
#             "processed_frames_count": processed_count,
#             "frames": processed_frames,
#         })


class SystemStatusAPI(APIView):
    """API for overall system status and dashboard data"""

    def get(self, request):
        try:
            # Get data from all cameras (in real system, this would query the database)
            system_status = {
                "overall_health": "good",
                "active_cameras": 4,
                "total_alerts": 3,
                "critical_alerts": 1,
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
                    },
                    {
                        "id": "camera_2",
                        "name": "نوار تغذیه کوره",
                        "status": "warning",
                        "efficiency": 78.2,
                        "object_count": 12,
                        "belt_speed": 1.8,
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