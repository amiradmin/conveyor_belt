from rest_framework.views import APIView
from rest_framework.response import Response
import cv2
import base64
import os
import numpy as np

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

class ProcessVideoFile(APIView):
    def post(self, request):
        """
        پردازش ویدیو + ارسال شماره فریم پردازش شده،
        تعداد اشیا و سرعت نوار نقاله به WebSocket
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
        object_area_threshold = 100  # for counting objects

        # Belt speed estimation constants
        PIXELS_PER_METER = 50  # adjust to your real scale
        VIDEO_FPS = cap.get(cv2.CAP_PROP_FPS) or 30
        processed_frame_interval = 5  # process every 5th frame
        time_per_processed_frame = processed_frame_interval / VIDEO_FPS

        # Store previous largest contour x-coordinates for smoothing
        prev_positions = []
        max_history = 5  # use last 5 processed frames for smoothing

        # WebSocket channel layer
        channel_layer = get_channel_layer()

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame_count += 1

            # Only process every Nth frame
            if processed_count % processed_frame_interval != 0:
                processed_count += 1
                continue

            # Zoom image
            frame = cv2.resize(frame, (frame.shape[1] * zoom_factor,
                                       frame.shape[0] * zoom_factor))

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            blur = cv2.GaussianBlur(gray, (5, 5), 0)

            # Conveyor mask
            mask = np.zeros_like(blur)
            h, w = blur.shape
            cv2.rectangle(mask, (50, int(h * 0.3)), (w - 50, int(h * 0.7)), 255, -1)
            masked = cv2.bitwise_and(blur, blur, mask=mask)

            # Threshold and edges
            _, thresh = cv2.threshold(masked, 50, 255, cv2.THRESH_BINARY)
            edges = cv2.Canny(thresh, 50, 150)

            # Contours
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            frame_copy = frame.copy()

            # Count objects
            object_count = 0
            large_contours = []
            for cnt in contours:
                area = cv2.contourArea(cnt)
                color = (0, 0, 255) if area >= large_stone_area else (0, 255, 0)
                cv2.drawContours(frame_copy, [cnt], -1, color, 2)
                if area >= object_area_threshold:
                    object_count += 1
                if area >= large_stone_area:
                    large_contours.append(cnt)

            # Estimate belt speed using largest contours
            belt_speed_kmh = 0
            if large_contours:
                largest = max(large_contours, key=cv2.contourArea)
                x, y, w_box, h_box = cv2.boundingRect(largest)
                prev_positions.append(x)
                if len(prev_positions) > max_history:
                    prev_positions.pop(0)
                if len(prev_positions) > 1:
                    displacement_pixels = prev_positions[-1] - prev_positions[0]
                    displacement_meters = displacement_pixels / PIXELS_PER_METER
                    total_time = time_per_processed_frame * (len(prev_positions)-1)
                    belt_speed_m_per_s = displacement_meters / total_time
                    belt_speed_kmh = belt_speed_m_per_s * 3.6  # convert m/s to km/h

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
                    "belt_speed": round(belt_speed_kmh, 2),  # km/h
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
