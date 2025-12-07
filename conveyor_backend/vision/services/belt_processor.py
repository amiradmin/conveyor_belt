# vision/services/belt_processor.py
import cv2
import time
import logging
import numpy as np
import base64
import threading
import os
from datetime import datetime
from scipy import signal
from scipy.fft import fft, fftfreq
import math
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from vision.models import ProcessingJob, Detection, VideoFile

logger = logging.getLogger(__name__)


class BeltProcessor:
    def __init__(self):
        self.jobs = {}
        self.replay_buffers = {}
        self.belt_metrics_history = {}

    def start_job(self, job_id, video_path, camera_id="default"):
        """Start a new processing job"""
        try:
            # Create or get video file record
            video_obj, _ = VideoFile.objects.get_or_create(
                path=video_path,
                defaults={
                    'filename': video_path.split('/')[-1],
                    'size': os.path.getsize(video_path) if os.path.exists(video_path) else 0
                }
            )

            # Create job in database
            job = ProcessingJob.objects.create(
                job_id=job_id,
                video=video_obj,
                camera_id=camera_id,
                status="processing"
            )

            self.jobs[job_id] = {
                'db_id': job.id,
                'video_path': video_path,
                'camera_id': camera_id,
                'start_time': time.time()
            }

            self.replay_buffers[job_id] = {
                'frames': [],
                'timestamps': [],
                'speeds': [],
                'alignments': []
            }

            # Start processing in background thread
            thread = threading.Thread(
                target=self._process_video,
                args=(job_id, video_path, camera_id)
            )
            thread.daemon = True
            thread.start()

            return job

        except Exception as e:
            logger.error(f"Error starting job: {e}")
            raise

    def _process_video(self, job_id, video_path, camera_id):
        """Process video to detect belt and calculate metrics"""
        channel_layer = get_channel_layer()

        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise RuntimeError(f"Cannot open video: {video_path}")

            # Get video properties
            fps = cap.get(cv2.CAP_PROP_FPS) or 30
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 0
            frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

            logger.info(f"Processing video: {video_path}")
            logger.info(f"FPS: {fps}, Frames: {total_frames}, Size: {frame_width}x{frame_height}")

            frame_no = 0
            prev_frame = None
            prev_belt_data = None
            prev_time = time.time()

            # Initialize history buffers
            speed_history = []
            alignment_history = []
            vibration_history = []

            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                frame_no += 1
                current_time = time.time()

                # Process every 2nd frame for performance
                if frame_no % 2 != 0:
                    continue

                # Detect belt in frame
                belt_data = self._detect_belt(frame)

                if belt_data and belt_data['belt_found']:
                    # Calculate speed if we have previous frame and belt data
                    speed = 0
                    if prev_frame is not None and prev_belt_data is not None:
                        speed = self._calculate_speed(
                            prev_frame, frame,
                            prev_belt_data, belt_data,
                            fps=fps
                        )

                    # Calculate vibration from speed variations
                    vibration = self._calculate_vibration(speed_history)

                    # Update histories
                    speed_history.append(speed)
                    alignment_history.append(belt_data['alignment_deviation'])
                    vibration_history.append(vibration['amplitude'])

                    # Keep only last 100 values
                    if len(speed_history) > 100:
                        speed_history = speed_history[-100:]
                        alignment_history = alignment_history[-100:]
                        vibration_history = vibration_history[-100:]

                    # Calculate average metrics
                    avg_speed = np.mean(speed_history) if speed_history else 0
                    avg_alignment = np.mean(alignment_history) if alignment_history else 0
                    avg_vibration = np.mean(vibration_history) if vibration_history else 0

                    # Draw visualizations
                    annotated_frame = self._draw_visualizations(
                        frame, belt_data, speed, vibration, avg_speed
                    )

                    # Encode frame for WebSocket
                    _, buffer = cv2.imencode('.jpg', annotated_frame)
                    frame_base64 = base64.b64encode(buffer).decode('utf-8')

                    # Update job progress
                    progress = int((frame_no / total_frames) * 100) if total_frames > 0 else 0
                    ProcessingJob.objects.filter(job_id=job_id).update(progress=progress)

                    # Prepare metrics for WebSocket
                    metrics = {
                        'speed': float(speed),
                        'avg_speed': float(avg_speed),
                        'alignment_deviation': float(belt_data['alignment_deviation']),
                        'avg_alignment': float(avg_alignment),
                        'vibration_amplitude': float(vibration['amplitude']),
                        'vibration_frequency': float(vibration['frequency']),
                        'vibration_severity': vibration['severity'],
                        'belt_width': float(belt_data['belt_width']),
                        'belt_center': belt_data['belt_center'],
                        'frame_center': belt_data['frame_center'],
                        'belt_found': True,
                        'frame_number': frame_no
                    }

                    # Send via WebSocket
                    try:
                        async_to_sync(channel_layer.group_send)(
                            "frame_progress",
                            {
                                "type": "progress_message",
                                "frame": frame_no,
                                "progress": progress,
                                "belt_metrics": metrics,
                                "frame_image": frame_base64,
                                "is_final": False
                            }
                        )
                    except Exception as e:
                        logger.error(f"WebSocket send error: {e}")

                    # Store in replay buffer
                    if len(self.replay_buffers[job_id]['frames']) < 300:
                        self.replay_buffers[job_id]['frames'].append(frame_base64)
                        self.replay_buffers[job_id]['timestamps'].append(current_time)
                        self.replay_buffers[job_id]['speeds'].append(speed)
                        self.replay_buffers[job_id]['alignments'].append(belt_data['alignment_deviation'])
                    else:
                        self.replay_buffers[job_id]['frames'] = self.replay_buffers[job_id]['frames'][1:] + [
                            frame_base64]
                        self.replay_buffers[job_id]['speeds'] = self.replay_buffers[job_id]['speeds'][1:] + [speed]

                else:
                    # Belt not found in this frame
                    metrics = {
                        'belt_found': False,
                        'frame_number': frame_no,
                        'speed': 0,
                        'alignment_deviation': 0,
                        'vibration_amplitude': 0
                    }

                    # Still send progress update
                    progress = int((frame_no / total_frames) * 100) if total_frames > 0 else 0

                    try:
                        async_to_sync(channel_layer.group_send)(
                            "frame_progress",
                            {
                                "type": "progress_message",
                                "frame": frame_no,
                                "progress": progress,
                                "belt_metrics": metrics,
                                "frame_image": None,
                                "is_final": False
                            }
                        )
                    except Exception as e:
                        logger.error(f"WebSocket send error: {e}")

                # Update previous frame data
                prev_frame = frame.copy()
                prev_belt_data = belt_data
                prev_time = current_time

                # Small delay to prevent overwhelming
                time.sleep(0.01)

            # Video processing complete
            cap.release()

            # Calculate final statistics
            final_stats = {
                "frames_processed": frame_no,
                "total_frames": total_frames,
                "average_speed": np.mean(speed_history) if speed_history else 0,
                "max_speed": np.max(speed_history) if speed_history else 0,
                "min_speed": np.min(speed_history) if speed_history else 0,
                "average_vibration": np.mean(vibration_history) if vibration_history else 0,
                "processing_time": time.time() - self.jobs[job_id]['start_time']
            }

            # Update job status
            ProcessingJob.objects.filter(job_id=job_id).update(
                status="completed",
                result=final_stats,
                progress=100
            )

            # Send final message
            try:
                async_to_sync(channel_layer.group_send)(
                    "frame_progress",
                    {
                        "type": "progress_message",
                        "frame": frame_no,
                        "progress": 100,
                        "belt_metrics": metrics if 'metrics' in locals() else {},
                        "frame_image": frame_base64 if 'frame_base64' in locals() else None,
                        "is_final": True,
                        "replay_available": True,
                        "replay_frames": len(self.replay_buffers[job_id]['frames'])
                    }
                )
            except Exception as e:
                logger.error(f"Final WebSocket send error: {e}")

            logger.info(f"Job {job_id} completed successfully")

        except Exception as e:
            logger.exception(f"Error processing video for job {job_id}")

            # Update job status to error
            ProcessingJob.objects.filter(job_id=job_id).update(
                status="error",
                result={"error": str(e)}
            )

            # Send error via WebSocket
            try:
                async_to_sync(channel_layer.group_send)(
                    "frame_progress",
                    {
                        "type": "error_message",
                        "error": str(e)
                    }
                )
            except Exception as e:
                logger.error(f"Error WebSocket send error: {e}")

    def _detect_belt(self, frame):
        """Detect conveyor belt in the frame"""
        try:
            height, width = frame.shape[:2]
            frame_center = width // 2

            # Convert to grayscale
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

            # Apply Gaussian blur
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)

            # Use Canny edge detection
            edges = cv2.Canny(blurred, 50, 150)

            # Find contours
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            if not contours:
                return {
                    'belt_found': False,
                    'belt_bbox': None,
                    'belt_center': None,
                    'belt_width': 0,
                    'alignment_deviation': 0,
                    'frame_center': frame_center
                }

            # Filter contours by area and aspect ratio (belt-like shapes)
            belt_candidates = []
            for contour in contours:
                area = cv2.contourArea(contour)
                if area < 1000:  # Too small to be a belt
                    continue

                x, y, w, h = cv2.boundingRect(contour)
                aspect_ratio = w / h if h > 0 else 0

                # Belt typically has high width-to-height ratio
                if aspect_ratio > 2.0 and w > width * 0.3:
                    belt_candidates.append((contour, area, x, y, w, h, aspect_ratio))

            if not belt_candidates:
                return {
                    'belt_found': False,
                    'belt_bbox': None,
                    'belt_center': None,
                    'belt_width': 0,
                    'alignment_deviation': 0,
                    'frame_center': frame_center
                }

            # Select the best belt candidate (largest area with good aspect ratio)
            best_candidate = max(belt_candidates, key=lambda x: x[1] * x[6])  # area * aspect_ratio

            contour, area, x, y, w, h, aspect_ratio = best_candidate

            # Calculate belt center
            belt_center_x = x + w // 2
            belt_center_y = y + h // 2

            # Calculate alignment deviation
            alignment_deviation = belt_center_x - frame_center

            # Calculate belt width at multiple points for consistency
            belt_mask = np.zeros(gray.shape, dtype=np.uint8)
            cv2.drawContours(belt_mask, [contour], -1, 255, -1)

            # Sample belt width at multiple heights
            widths = []
            for sample_y in range(y, y + h, 10):
                if sample_y < height:
                    row = belt_mask[sample_y, x:x + w]
                    white_pixels = np.where(row == 255)[0]
                    if len(white_pixels) > 0:
                        widths.append(len(white_pixels))

            avg_belt_width = np.mean(widths) if widths else w

            return {
                'belt_found': True,
                'belt_bbox': [int(x), int(y), int(x + w), int(y + h)],
                'belt_center': (int(belt_center_x), int(belt_center_y)),
                'belt_width': float(avg_belt_width),
                'belt_height': h,
                'belt_area': float(area),
                'alignment_deviation': int(alignment_deviation),
                'frame_center': frame_center,
                'contour': contour
            }

        except Exception as e:
            logger.error(f"Error in belt detection: {e}")
            return {
                'belt_found': False,
                'belt_bbox': None,
                'belt_center': None,
                'belt_width': 0,
                'alignment_deviation': 0,
                'frame_center': width // 2 if 'width' in locals() else 0
            }

    def _calculate_speed(self, prev_frame, curr_frame, prev_belt_data, curr_belt_data, fps=30):
        """Calculate belt speed using optical flow within belt region"""
        try:
            if not prev_belt_data['belt_found'] or not curr_belt_data['belt_found']:
                return 0.0

            # Create masks for belt regions
            height, width = prev_frame.shape[:2]

            prev_mask = np.zeros((height, width), dtype=np.uint8)
            curr_mask = np.zeros((height, width), dtype=np.uint8)

            cv2.drawContours(prev_mask, [prev_belt_data['contour']], -1, 255, -1)
            cv2.drawContours(curr_mask, [curr_belt_data['contour']], -1, 255, -1)

            # Convert to grayscale
            prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)
            curr_gray = cv2.cvtColor(curr_frame, cv2.COLOR_BGR2GRAY)

            # Apply masks
            prev_gray = cv2.bitwise_and(prev_gray, prev_gray, mask=prev_mask)
            curr_gray = cv2.bitwise_and(curr_gray, curr_gray, mask=curr_mask)

            # Calculate optical flow using Farneback method
            flow = cv2.calcOpticalFlowFarneback(
                prev_gray, curr_gray, None,
                pyr_scale=0.5, levels=3, winsize=15,
                iterations=3, poly_n=5, poly_sigma=1.2,
                flags=0
            )

            # Extract horizontal movement (assume belt moves horizontally)
            flow_x = flow[..., 0]

            # Calculate average horizontal movement within belt region
            mask_indices = np.where(prev_mask == 255)
            if len(mask_indices[0]) > 0:
                movements = flow_x[mask_indices]
                # Filter out noise (very small movements)
                valid_movements = movements[np.abs(movements) > 0.1]

                if len(valid_movements) > 0:
                    avg_movement = np.mean(valid_movements)

                    # Convert pixels/frame to meters/minute
                    # Assumption: 1 pixel = 0.01 meters (adjust based on camera calibration)
                    pixel_to_meter = 0.01
                    speed_m_per_min = avg_movement * fps * 60 * pixel_to_meter

                    return abs(speed_m_per_min)  # Return absolute speed

            return 0.0

        except Exception as e:
            logger.error(f"Error calculating speed: {e}")
            return 0.0

    def _calculate_vibration(self, speed_history, fps=30):
        """Calculate vibration from speed variations"""
        try:
            if len(speed_history) < 10:
                return {
                    'amplitude': 0.0,
                    'frequency': 0.0,
                    'severity': 'Low'
                }

            # Use last 50 speed readings
            recent_speeds = speed_history[-50:] if len(speed_history) >= 50 else speed_history

            # Calculate amplitude (standard deviation of speeds)
            amplitude = np.std(recent_speeds) if len(recent_speeds) > 1 else 0.0

            # Calculate frequency using FFT
            if len(recent_speeds) >= 32:
                fft_result = fft(recent_speeds - np.mean(recent_speeds))
                frequencies = fftfreq(len(recent_speeds), 1 / fps)

                # Get magnitude and find dominant frequency
                magnitudes = np.abs(fft_result)
                valid_idx = np.where(frequencies > 0)

                if len(valid_idx[0]) > 0:
                    max_idx = np.argmax(magnitudes[valid_idx])
                    dominant_freq = frequencies[valid_idx][max_idx]
                else:
                    dominant_freq = 0.0
            else:
                dominant_freq = 0.0

            # Determine severity
            if amplitude < 0.1:
                severity = 'Low'
            elif amplitude < 0.5:
                severity = 'Medium'
            else:
                severity = 'High'

            return {
                'amplitude': float(amplitude),
                'frequency': float(dominant_freq),
                'severity': severity
            }

        except Exception as e:
            logger.error(f"Error calculating vibration: {e}")
            return {
                'amplitude': 0.0,
                'frequency': 0.0,
                'severity': 'Low'
            }

    def _draw_visualizations(self, frame, belt_data, speed, vibration, avg_speed):
        """Draw visualizations on the frame"""
        vis_frame = frame.copy()
        height, width = frame.shape[:2]

        if not belt_data['belt_found']:
            # Draw "No belt detected" message
            cv2.putText(vis_frame, "No belt detected",
                        (width // 2 - 100, height // 2),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            return vis_frame

        # Draw belt bounding box
        bbox = belt_data['belt_bbox']
        cv2.rectangle(vis_frame, (bbox[0], bbox[1]), (bbox[2], bbox[3]), (0, 255, 0), 2)

        # Draw belt center
        belt_center = belt_data['belt_center']
        cv2.circle(vis_frame, belt_center, 8, (0, 255, 255), -1)

        # Draw frame center line
        frame_center = belt_data['frame_center']
        cv2.line(vis_frame, (frame_center, 0), (frame_center, height), (255, 255, 0), 2)

        # Draw alignment indicator
        belt_center_x = belt_center[0]
        arrow_y = height - 50
        arrow_start = (frame_center, arrow_y)
        arrow_end = (belt_center_x, arrow_y)

        deviation = belt_data['alignment_deviation']
        if abs(deviation) > 50:
            arrow_color = (0, 0, 255)  # Red
            alignment_status = "POOR"
        elif abs(deviation) > 20:
            arrow_color = (0, 165, 255)  # Orange
            alignment_status = "FAIR"
        else:
            arrow_color = (0, 255, 0)  # Green
            alignment_status = "GOOD"

        cv2.arrowedLine(vis_frame, arrow_start, arrow_end, arrow_color, 3, tipLength=0.03)

        # Draw text overlay with metrics
        y_offset = 30
        line_height = 25

        # Background for text
        cv2.rectangle(vis_frame, (10, 10), (350, 220), (0, 0, 0, 0.7), -1)

        # Speed
        cv2.putText(vis_frame, f"Speed: {speed:.2f} m/min",
                    (20, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
        y_offset += line_height

        cv2.putText(vis_frame, f"Avg Speed: {avg_speed:.2f} m/min",
                    (20, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)
        y_offset += line_height

        # Vibration
        vib_color = (0, 255, 0) if vibration['severity'] == 'Low' else \
            (0, 165, 255) if vibration['severity'] == 'Medium' else \
                (0, 0, 255)

        cv2.putText(vis_frame, f"Vibration: {vibration['severity']}",
                    (20, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.6, vib_color, 2)
        y_offset += line_height

        cv2.putText(vis_frame, f"Amplitude: {vibration['amplitude']:.3f}",
                    (20, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.6, vib_color, 2)
        y_offset += line_height

        # Alignment
        cv2.putText(vis_frame, f"Alignment: {alignment_status}",
                    (20, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.6, arrow_color, 2)
        y_offset += line_height

        cv2.putText(vis_frame, f"Deviation: {deviation} px",
                    (20, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.6, arrow_color, 2)
        y_offset += line_height

        # Belt info
        cv2.putText(vis_frame, f"Belt Width: {belt_data['belt_width']:.1f} px",
                    (20, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 200, 0), 2)
        y_offset += line_height

        # Draw warnings if needed
        if vibration['severity'] == 'High':
            cv2.putText(vis_frame, "WARNING: High Vibration!",
                        (width - 300, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 3)

        if abs(deviation) > 50:
            cv2.putText(vis_frame, "WARNING: Belt Misaligned!",
                        (width - 300, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 3)

        return vis_frame

    def get_job_status(self, job_id):
        """Get status of a processing job"""
        if job_id in self.jobs:
            try:
                job = ProcessingJob.objects.get(job_id=job_id)
                return {
                    'job_id': job.job_id,
                    'status': job.status,
                    'progress': job.progress,
                    'result': job.result
                }
            except ProcessingJob.DoesNotExist:
                return {'error': 'Job not found in database'}
        else:
            return {'error': 'Job not found in processor'}

    def stop_job(self, job_id):
        """Stop a processing job"""
        if job_id in self.jobs:
            # Mark job as stopped in database
            ProcessingJob.objects.filter(job_id=job_id).update(status="stopped")

            # Clean up
            if job_id in self.replay_buffers:
                del self.replay_buffers[job_id]

            del self.jobs[job_id]
            return True
        return False