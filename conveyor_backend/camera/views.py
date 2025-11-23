from rest_framework.views import APIView
from rest_framework.response import Response
import cv2
import base64
import os
import numpy as np
from ultralytics import YOLO
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from collections import deque


class StreamFrameAPIView(APIView):
    def post(self, request):
        file = request.FILES.get("frame")
        if not file:
            return Response({"error": "No frame received"}, status=400)

        # Read image bytes
        img_bytes = file.read()
        img_array = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

        # Example: convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # You can run ANY CV/ML model here
        # e.g., detect damaged sensors, belt tears, etc.

        # Demo output (no file return)
        return Response({"message": "Frame received"}, status=200)



class ProcessVideoFile(APIView):
    def post(self, request):
        """
        Process video + send frame number, object count, and realistic belt speed (km/h) via WebSocket
        """
        video_path = request.data.get("video_path")
        if not video_path or not os.path.exists(video_path):
            return Response({"error": "Video file not found"}, status=400)

        cap = cv2.VideoCapture(video_path)
        processed_frames = []
        frame_count = 0
        processed_count = 0
        zoom_factor = 3
        large_stone_area = 1000

        # Calibration: pixels per meter (adjust according to your video)
        PIXELS_PER_METER = 200  # example: 200 pixels = 1 meter on belt

        VIDEO_FPS = cap.get(cv2.CAP_PROP_FPS) or 30
        SKIP_FRAMES = 5  # only process every 5th frame

        # Store previous x-coordinates to smooth speed
        prev_x_queue = deque(maxlen=5)

        # WebSocket channel layer
        channel_layer = get_channel_layer()

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame_count += 1

            # Only process every SKIP_FRAMES frame
            if processed_count % SKIP_FRAMES != 0:
                processed_count += 1
                continue

            # Zoom image
            frame = cv2.resize(frame, (frame.shape[1] * zoom_factor,
                                       frame.shape[0] * zoom_factor))

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            blur = cv2.GaussianBlur(gray, (5, 5), 0)

            # Conveyor belt mask
            mask = np.zeros_like(blur)
            h, w = blur.shape
            cv2.rectangle(mask, (50, int(h * 0.3)), (w - 50, int(h * 0.7)), 255, -1)
            masked = cv2.bitwise_and(blur, blur, mask=mask)

            # Threshold + Canny
            _, thresh = cv2.threshold(masked, 50, 255, cv2.THRESH_BINARY)
            edges = cv2.Canny(thresh, 50, 150)

            # Contours
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            frame_copy = frame.copy()

            # Count objects
            object_count = 0
            for cnt in contours:
                area = cv2.contourArea(cnt)
                color = (0, 0, 255) if area >= large_stone_area else (0, 255, 0)
                cv2.drawContours(frame_copy, [cnt], -1, color, 2)
                if area >= 100:
                    object_count += 1

            # Estimate belt speed (smoothed)
            belt_speed_kmh = 0
            if contours:
                largest = max(contours, key=cv2.contourArea)
                x, y, w_box, h_box = cv2.boundingRect(largest)
                prev_x_queue.append(x)

                if len(prev_x_queue) >= 2:
                    # displacement in pixels over last N frames
                    displacement_pixels = abs(prev_x_queue[-1] - prev_x_queue[0])
                    # time between first and last frame in seconds
                    time_sec = (len(prev_x_queue) * SKIP_FRAMES) / VIDEO_FPS
                    belt_speed_m_per_s = (displacement_pixels / PIXELS_PER_METER) / time_sec
                    belt_speed_kmh = belt_speed_m_per_s * 3.6

            # Resize for sending
            small = cv2.resize(frame_copy, (320, 240))
            _, buffer = cv2.imencode(".jpg", small)
            img_base64 = base64.b64encode(buffer).decode("utf-8")
            processed_frames.append(img_base64)

            # 🔴 Send progress + metrics to WebSocket
            async_to_sync(channel_layer.group_send)(
                "frame_progress",
                {
                    "type": "progress_message",
                    "frame": processed_count,
                    "object_count": object_count,
                    "belt_speed": round(belt_speed_kmh, 2),
                }
            )

            processed_count += 1

        cap.release()

        return Response({
            "original_video_url": f"http://localhost:8000/media/{os.path.basename(video_path)}",
            "total_frames": frame_count,
            "processed_frames_count": processed_count,
            "frames": processed_frames,
        })
