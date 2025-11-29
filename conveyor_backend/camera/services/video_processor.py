import cv2
import base64
import os
import numpy as np
from collections import deque
import threading
import time
from django.utils import timezone
import logging
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)


class VideoProcessor:
    def __init__(self):
        self.is_processing = False
        self.current_progress = 0
        self.processed_frames = []
        self.object_count = 0
        self.belt_speed = 0
        self.processing_thread = None
        self.channel_layer = get_channel_layer()

    def process_video_async(self, video_path, callback=None):
        """Start video processing in a separate thread"""
        if self.is_processing:
            return {"error": "Already processing a video"}

        self.is_processing = True
        self.current_progress = 0
        self.processed_frames = []

        # Start processing in background thread
        self.processing_thread = threading.Thread(
            target=self._process_video_thread,
            args=(video_path, callback)
        )
        self.processing_thread.daemon = True
        self.processing_thread.start()

        return {"status": "started", "message": "Video processing started"}

    def _process_video_thread(self, video_path, callback=None):
        """Background thread for video processing"""
        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                self._send_error("Could not open video file")
                return

            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            frame_count = 0
            processed_count = 0
            zoom_factor = 3
            large_stone_area = 1000

            # Calibration
            PIXELS_PER_METER = 200
            VIDEO_FPS = cap.get(cv2.CAP_PROP_FPS) or 30
            SKIP_FRAMES = 5

            # Store previous x-coordinates to smooth speed
            prev_x_queue = deque(maxlen=5)

            while self.is_processing:
                ret, frame = cap.read()
                if not ret:
                    break

                frame_count += 1

                # Only process every SKIP_FRAMES frame
                if processed_count % SKIP_FRAMES != 0:
                    processed_count += 1
                    continue

                # Update progress
                self.current_progress = int((frame_count / total_frames) * 100)

                # Process frame
                processed_frame_data = self._process_single_frame(
                    frame, zoom_factor, large_stone_area,
                    prev_x_queue, VIDEO_FPS, SKIP_FRAMES, PIXELS_PER_METER
                )

                self.processed_frames.append(processed_frame_data['frame_base64'])
                self.object_count = processed_frame_data['object_count']
                self.belt_speed = processed_frame_data['belt_speed']

                # Send WebSocket update
                self._send_progress_update(
                    processed_count,
                    processed_frame_data['object_count'],
                    processed_frame_data['belt_speed']
                )

                processed_count += 1

                # Small delay to prevent overwhelming the system
                time.sleep(0.01)

            cap.release()

            # Final update
            self.current_progress = 100
            self._send_progress_update(
                processed_count,
                self.object_count,
                self.belt_speed,
                is_final=True
            )

            # Call callback if provided
            if callback:
                callback({
                    "original_video_url": f"http://localhost:8000/media/{os.path.basename(video_path)}",
                    "total_frames": total_frames,
                    "processed_frames_count": processed_count,
                    "frames": self.processed_frames,
                })

        except Exception as e:
            logger.error(f"Video processing error: {str(e)}")
            self._send_error(f"Processing error: {str(e)}")
        finally:
            self.is_processing = False

    def _process_single_frame(self, frame, zoom_factor, large_stone_area, prev_x_queue, video_fps, skip_frames,
                              pixels_per_meter):
        """Process a single frame and return analysis data"""
        # Zoom image
        frame = cv2.resize(frame, (frame.shape[1] * zoom_factor, frame.shape[0] * zoom_factor))

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

        # Estimate belt speed
        belt_speed_kmh = 0
        if contours:
            largest = max(contours, key=cv2.contourArea)
            x, y, w_box, h_box = cv2.boundingRect(largest)
            prev_x_queue.append(x)

            if len(prev_x_queue) >= 2:
                displacement_pixels = abs(prev_x_queue[-1] - prev_x_queue[0])
                time_sec = (len(prev_x_queue) * skip_frames) / video_fps
                belt_speed_m_per_s = (displacement_pixels / pixels_per_meter) / time_sec
                belt_speed_kmh = belt_speed_m_per_s * 3.6

        # Resize and encode frame
        small = cv2.resize(frame_copy, (320, 240))
        _, buffer = cv2.imencode(".jpg", small)
        frame_base64 = base64.b64encode(buffer).decode("utf-8")

        return {
            'frame_base64': frame_base64,
            'object_count': object_count,
            'belt_speed': round(belt_speed_kmh, 2)
        }

    def _send_progress_update(self, frame_number, object_count, belt_speed, is_final=False):
        """Send progress update via WebSocket"""
        try:
            async_to_sync(self.channel_layer.group_send)(
                "frame_progress",
                {
                    "type": "progress_message",
                    "frame": frame_number,
                    "object_count": object_count,
                    "belt_speed": belt_speed,
                    "progress": self.current_progress,
                    "is_final": is_final
                }
            )
        except Exception as e:
            logger.error(f"WebSocket send error: {str(e)}")

    def _send_error(self, error_message):
        """Send error via WebSocket"""
        try:
            async_to_sync(self.channel_layer.group_send)(
                "frame_progress",
                {
                    "type": "error_message",
                    "error": error_message
                }
            )
        except Exception as e:
            logger.error(f"WebSocket error send error: {str(e)}")

    def stop_processing(self):
        """Stop the current video processing"""
        self.is_processing = False
        if self.processing_thread and self.processing_thread.is_alive():
            self.processing_thread.join(timeout=5.0)

    def get_status(self):
        """Get current processing status"""
        return {
            "is_processing": self.is_processing,
            "progress": self.current_progress,
            "object_count": self.object_count,
            "belt_speed": self.belt_speed,
            "processed_frames_count": len(self.processed_frames)
        }


# Global video processor instance
video_processor = VideoProcessor()