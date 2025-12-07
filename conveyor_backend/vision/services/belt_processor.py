# vision/services/belt_processor.py
import cv2
import time
import logging
import numpy as np
import base64
from datetime import datetime
from scipy import signal
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from vision.models import ProcessingJob, Detection, VideoFile

logger = logging.getLogger(__name__)


class BeltProcessor:
    def __init__(self):
        self.jobs = {}
        self.replay_buffers = {}  # Store frames for replay

    def start_job(self, job_id, video_path, camera_id="default"):
        video_obj, _ = VideoFile.objects.get_or_create(path=video_path)
        job = ProcessingJob.objects.create(
            job_id=job_id, video=video_obj, camera_id=camera_id, status="processing"
        )
        self.jobs[job_id] = job.id
        self.replay_buffers[job_id] = {
            'frames': [],
            'timestamps': [],
            'speeds': [],
            'alignments': []
        }

        import threading
        t = threading.Thread(target=self._run, args=(job_id, video_path, camera_id))
        t.daemon = True
        t.start()
        return job

    def detect_conveyor_belt(self, frame):
        """Detect conveyor belt edges and calculate properties"""
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)

        # Define color range for belt detection (adjust based on your belt color)
        lower_belt = np.array([0, 0, 50])
        upper_belt = np.array([180, 50, 200])
        mask = cv2.inRange(hsv, lower_belt, upper_belt)

        # Apply morphological operations
        kernel = np.ones((5, 5), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

        # Find contours
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        if not contours:
            return None, None, None

        # Find the largest contour (assumed to be the belt)
        largest_contour = max(contours, key=cv2.contourArea)

        # Get bounding rectangle
        x, y, w, h = cv2.boundingRect(largest_contour)

        # Calculate alignment metrics
        # 1. Calculate center deviation
        frame_center_x = frame.shape[1] // 2
        belt_center_x = x + w // 2
        horizontal_deviation = belt_center_x - frame_center_x

        # 2. Calculate angle/rotation
        rect = cv2.minAreaRect(largest_contour)
        angle = rect[2]  # Rotation angle
        if angle < -45:
            angle = 90 + angle

        # 3. Calculate belt edges for width consistency
        edges = cv2.Canny(mask, 50, 150)
        edge_points = np.column_stack(np.where(edges > 0))

        if len(edge_points) > 0:
            # Calculate width at multiple points
            left_edge = np.min(edge_points[:, 1])
            right_edge = np.max(edge_points[:, 1])
            belt_width = right_edge - left_edge
        else:
            belt_width = w

        alignment_data = {
            'horizontal_deviation': horizontal_deviation,
            'rotation_angle': angle,
            'belt_width': belt_width,
            'belt_bbox': [x, y, x + w, y + h],
            'frame_center': frame_center_x,
            'belt_center': belt_center_x
        }

        # Create ROI mask for the belt
        roi_mask = np.zeros(frame.shape[:2], dtype=np.uint8)
        cv2.drawContours(roi_mask, [largest_contour], -1, 255, -1)

        return roi_mask, alignment_data, mask

    def calculate_speed(self, frame1, frame2, roi_mask, pixel_to_meter_ratio=0.01):
        """Calculate belt speed using optical flow"""
        # Ensure frames are grayscale
        gray1 = cv2.cvtColor(frame1, cv2.COLOR_BGR2GRAY)
        gray2 = cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY)

        # Apply mask
        gray1 = cv2.bitwise_and(gray1, gray1, mask=roi_mask)
        gray2 = cv2.bitwise_and(gray2, gray2, mask=roi_mask)

        # Calculate optical flow
        flow = cv2.calcOpticalFlowFarneback(
            gray1, gray2, None,
            pyr_scale=0.5, levels=3, winsize=15,
            iterations=3, poly_n=5, poly_sigma=1.2,
            flags=0
        )

        # Calculate magnitude in direction of belt movement (assumed horizontal)
        magnitude = np.abs(flow[..., 0])  # Horizontal component

        # Apply mask and calculate average speed
        if np.sum(roi_mask) > 0:
            masked_magnitude = magnitude[roi_mask > 0]
            if len(masked_magnitude) > 0:
                avg_pixel_movement = np.mean(masked_magnitude)
                # Convert pixels to meters per second
                # Assuming 30 FPS and pixel_to_meter_ratio conversion
                speed_mps = avg_pixel_movement * 30 * pixel_to_meter_ratio
                speed_mpm = speed_mps * 60  # meters per minute
                return speed_mpm, avg_pixel_movement

        return 0, 0

    def _run(self, job_id, video_path, camera_id):
        channel_layer = get_channel_layer()
        replay_buffer = self.replay_buffers[job_id]

        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise RuntimeError("Could not open video")

            # Get video properties
            fps = cap.get(cv2.CAP_PROP_FPS) or 30
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
            frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

            frame_no = 0
            processed = 0
            prev_frame = None
            prev_roi = None
            speed_history = []
            alignment_history = []

            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                frame_no += 1

                # Process every 5th frame for better performance
                if frame_no % 5 != 0:
                    continue

                processed += 1

                # Step 1: Detect conveyor belt
                roi_mask, alignment, belt_mask = self.detect_conveyor_belt(frame)

                if roi_mask is not None and alignment is not None:
                    # Store alignment data
                    alignment_history.append(alignment)

                    # Step 2: Calculate speed if we have previous frame
                    if prev_frame is not None and prev_roi is not None:
                        speed, pixel_movement = self.calculate_speed(
                            prev_frame, frame, roi_mask
                        )
                        speed_history.append(speed)
                        avg_speed = np.mean(speed_history[-10:]) if speed_history else 0
                    else:
                        speed = 0
                        avg_speed = 0

                    # Step 3: Detect objects within belt ROI
                    belt_region = cv2.bitwise_and(frame, frame, mask=roi_mask)
                    gray = cv2.cvtColor(belt_region, cv2.COLOR_BGR2GRAY)
                    blur = cv2.GaussianBlur(gray, (5, 5), 0)
                    edges = cv2.Canny(blur, 50, 150)

                    # Find contours of objects
                    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

                    object_count = 0
                    objects_data = []

                    for cnt in contours:
                        area = cv2.contourArea(cnt)
                        if area < 100:  # Minimum object size
                            continue

                        x, y, w, h = cv2.boundingRect(cnt)
                        object_count += 1

                        # Draw object bounding box
                        cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)

                        # Calculate object properties
                        object_area = area
                        object_center = (x + w // 2, y + h // 2)

                        objects_data.append({
                            'bbox': [int(x), int(y), int(x + w), int(y + h)],
                            'area': area,
                            'center': object_center
                        })

                        # Save to database
                        job_db_id = self.jobs.get(job_id)
                        if job_db_id:
                            Detection.objects.create(
                                job_id=job_db_id,
                                frame_number=frame_no,
                                bbox=[x, y, x + w, y + h],
                                label="object",
                                confidence=0.8,
                                object_area=area
                            )

                    # Step 4: Draw belt detection and info on frame
                    # Draw belt bounding box
                    belt_bbox = alignment['belt_bbox']
                    cv2.rectangle(frame,
                                  (belt_bbox[0], belt_bbox[1]),
                                  (belt_bbox[2], belt_bbox[3]),
                                  (255, 0, 0), 2)

                    # Draw center lines
                    frame_center = alignment['frame_center']
                    cv2.line(frame, (frame_center, 0), (frame_center, frame_height),
                             (0, 255, 255), 2)

                    belt_center = alignment['belt_center']
                    cv2.line(frame, (belt_center, belt_bbox[1]),
                             (belt_center, belt_bbox[3]), (255, 255, 0), 2)

                    # Add text overlays
                    info_y = 30
                    cv2.putText(frame, f"Speed: {avg_speed:.2f} m/min",
                                (10, info_y), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
                    info_y += 30
                    cv2.putText(frame, f"Objects: {object_count}",
                                (10, info_y), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                    info_y += 30
                    cv2.putText(frame, f"Alignment: {alignment['horizontal_deviation']} px",
                                (10, info_y), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
                    info_y += 30
                    cv2.putText(frame, f"Rotation: {alignment['rotation_angle']:.1f} deg",
                                (10, info_y), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 200, 0), 2)

                    # Draw alignment status
                    if abs(alignment['horizontal_deviation']) > 50:
                        cv2.putText(frame, "WARNING: Misaligned!",
                                    (frame_width - 300, 30),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

                # Step 5: Store frame in replay buffer
                if len(replay_buffer['frames']) < 300:  # Store last 300 frames (10 seconds at 30fps)
                    _, buffer = cv2.imencode('.jpg', frame)
                    frame_base64 = base64.b64encode(buffer).decode('utf-8')
                    replay_buffer['frames'].append(frame_base64)
                    replay_buffer['timestamps'].append(time.time())
                    replay_buffer['speeds'].append(avg_speed if 'avg_speed' in locals() else 0)
                    replay_buffer['alignments'].append(alignment if 'alignment' in locals() else None)
                else:
                    # Maintain fixed buffer size
                    replay_buffer['frames'] = replay_buffer['frames'][1:] + [frame_base64]
                    replay_buffer['timestamps'] = replay_buffer['timestamps'][1:] + [time.time()]
                    replay_buffer['speeds'] = replay_buffer['speeds'][1:] + [avg_speed]
                    replay_buffer['alignments'] = replay_buffer['alignments'][1:] + [alignment]

                # Step 6: Send frame via WebSocket
                progress = int((frame_no / total_frames) * 100)
                ProcessingJob.objects.filter(job_id=job_id).update(progress=progress)

                try:
                    async_to_sync(channel_layer.group_send)(
                        "frame_progress",
                        {
                            "type": "progress_message",
                            "frame": frame_no,
                            "object_count": object_count if 'object_count' in locals() else 0,
                            "progress": progress,
                            "speed": avg_speed if 'avg_speed' in locals() else 0,
                            "alignment": alignment if 'alignment' in locals() else None,
                            "frame_image": frame_base64 if 'frame_base64' in locals() else None,
                            "replay_buffer_size": len(replay_buffer['frames']),
                            "is_final": False
                        }
                    )
                except Exception as e:
                    logger.error(f"WebSocket send error: {e}")

                # Update previous frame for speed calculation
                prev_frame = frame.copy()
                prev_roi = roi_mask

                time.sleep(0.01)  # Small delay to prevent overwhelming

            cap.release()

            # Finalize job
            stats = {
                "frames_processed": processed,
                "total_frames": total_frames,
                "avg_speed": np.mean(speed_history) if speed_history else 0,
                "max_speed": np.max(speed_history) if speed_history else 0,
                "min_speed": np.min(speed_history) if speed_history else 0,
                "alignment_history": alignment_history[-100:] if alignment_history else []
            }

            ProcessingJob.objects.filter(job_id=job_id).update(
                status="completed",
                result=stats,
                progress=100
            )

            async_to_sync(channel_layer.group_send)(
                "frame_progress",
                {
                    "type": "progress_message",
                    "frame": frame_no,
                    "object_count": object_count if 'object_count' in locals() else 0,
                    "progress": 100,
                    "speed": avg_speed if 'avg_speed' in locals() else 0,
                    "alignment": alignment if 'alignment' in locals() else None,
                    "frame_image": frame_base64 if 'frame_base64' in locals() else None,
                    "is_final": True,
                    "replay_available": True,
                    "replay_frames": len(replay_buffer['frames'])
                }
            )

        except Exception as e:
            logger.exception("Processing job failed")
            ProcessingJob.objects.filter(job_id=job_id).update(
                status="error",
                result={"error": str(e)}
            )
            try:
                async_to_sync(channel_layer.group_send)(
                    "frame_progress",
                    {"type": "error_message", "error": str(e)}
                )
            except Exception:
                logger.exception("WS error send failed")

    def get_replay_frames(self, job_id, start_frame=0, end_frame=None):
        """Get frames from replay buffer for specified range"""
        if job_id not in self.replay_buffers:
            return []

        buffer = self.replay_buffers[job_id]
        frames = buffer['frames']

        if end_frame is None:
            end_frame = len(frames)

        start_frame = max(0, start_frame)
        end_frame = min(len(frames), end_frame)

        return {
            'frames': frames[start_frame:end_frame],
            'timestamps': buffer['timestamps'][start_frame:end_frame],
            'speeds': buffer['speeds'][start_frame:end_frame],
            'alignments': buffer['alignments'][start_frame:end_frame]
        }