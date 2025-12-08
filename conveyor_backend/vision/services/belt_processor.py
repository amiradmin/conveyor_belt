# vision/services/belt_processor.py
import cv2
import time
import logging
import numpy as np
import base64
import threading
import queue
import os
from datetime import datetime
from scipy import signal
from scipy.fft import fft, fftfreq
import math
import json
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from vision.models import ProcessingJob, VideoFile

logger = logging.getLogger(__name__)


class BeltProcessor:
    def __init__(self):
        self.jobs = {}
        self.replay_buffers = {}
        self.frame_queues = {}
        self.processing_threads = {}
        self.job_lock = threading.Lock()
        self.calibration_data = {}

    def _ensure_serializable(self, obj):
        """Convert NumPy/Python types to JSON serializable types"""
        if obj is None:
            return None
        elif isinstance(obj, (np.integer, np.int64, np.int32, np.int16, np.int8)):
            return int(obj)
        elif isinstance(obj, (np.floating, np.float64, np.float32, np.float16)):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, np.bool_):
            return bool(obj)
        elif isinstance(obj, dict):
            return {key: self._ensure_serializable(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [self._ensure_serializable(item) for item in obj]
        elif isinstance(obj, tuple):
            return tuple(self._ensure_serializable(item) for item in obj)
        elif isinstance(obj, (str, int, float, bool)):
            return obj
        else:
            try:
                return str(obj)
            except:
                return None

    def _prepare_serializable_metrics(self, metrics_dict):
        """Prepare metrics dictionary for JSON serialization"""
        return self._ensure_serializable(metrics_dict)

    def calibrate_belt_area(self, job_id, reference_width_mm=1000, reference_height_mm=200):
        """Calibrate belt area measurement using a known reference"""
        with self.job_lock:
            if job_id in self.jobs:
                self.calibration_data[job_id] = {
                    'reference_width_mm': float(reference_width_mm),
                    'reference_height_mm': float(reference_height_mm),
                    'calibrated': False,
                    'pixels_per_mm': None,
                    'calibration_timestamp': float(time.time())
                }
        return {"status": "calibration_data_set", "job_id": job_id}

    def start_job(self, job_id, video_path, camera_id="default"):
        """Start a new processing job with optimized streaming"""
        try:
            if not os.path.isabs(video_path):
                video_path = os.path.join(settings.MEDIA_ROOT, video_path)

            if not os.path.exists(video_path):
                raise FileNotFoundError(f"Video file not found: {video_path}")

            video_obj, _ = VideoFile.objects.get_or_create(
                path=video_path,
                defaults={
                    'filename': os.path.basename(video_path),
                    'size': os.path.getsize(video_path)
                }
            )

            job = ProcessingJob.objects.create(
                job_id=job_id,
                video=video_obj,
                camera_id=camera_id,
                status="processing"
            )

            with self.job_lock:
                self.jobs[job_id] = {
                    'db_id': int(job.id),
                    'video_path': str(video_path),
                    'camera_id': str(camera_id),
                    'start_time': float(time.time()),
                    'is_running': True,
                    'fps': 0.0,
                    'frame_count': 0,
                    'total_frames': 0,
                    'processing_started': False
                }

                self.replay_buffers[job_id] = {
                    'frames': [],
                    'timestamps': [],
                    'speeds': [],
                    'alignments': [],
                    'vibrations': []
                }

                self.frame_queues[job_id] = queue.Queue(maxsize=30)

            logger.info(f"Starting job {job_id} for video: {video_path}")

            thread = threading.Thread(
                target=self._process_video_stream,
                args=(job_id, video_path),
                name=f"BeltProcessor-{job_id}"
            )
            thread.daemon = True
            thread.start()

            with self.job_lock:
                self.processing_threads[job_id] = thread

            return job

        except Exception as e:
            logger.error(f"Error starting job {job_id}: {e}")
            raise

    def _process_video_stream(self, job_id, video_path):
        """Main video processing thread with area detection"""
        channel_layer = get_channel_layer()

        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise RuntimeError(f"Cannot open video: {video_path}")

            original_fps = float(cap.get(cv2.CAP_PROP_FPS)) or 30.0
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

            target_fps = min(original_fps, 30.0)
            frame_interval = 1.0 / target_fps

            with self.job_lock:
                self.jobs[job_id].update({
                    'total_frames': int(total_frames),
                    'original_fps': float(original_fps),
                    'target_fps': float(target_fps),
                    'resolution': f"{frame_width}x{frame_height}",
                    'processing_started': True
                })

            frame_no = 0
            prev_frame = None
            prev_belt_data = None
            prev_time = time.time()
            fps_start_time = time.time()
            fps_frame_count = 0

            speed_history = []
            alignment_history = []
            area_history = []

            while self.jobs.get(job_id, {}).get('is_running', False):
                ret, frame = cap.read()
                if not ret:
                    break

                frame_no += 1
                fps_frame_count += 1
                current_time = time.time()

                if current_time - fps_start_time >= 1.0:
                    current_fps = float(fps_frame_count) / (current_time - fps_start_time)
                    with self.job_lock:
                        self.jobs[job_id]['fps'] = float(current_fps)
                    fps_start_time = current_time
                    fps_frame_count = 0

                with self.job_lock:
                    self.jobs[job_id]['frame_count'] = int(frame_no)

                elapsed = current_time - prev_time
                sleep_time = frame_interval - elapsed
                if sleep_time > 0:
                    time.sleep(sleep_time)

                belt_data = self._detect_belt_with_details(frame)

                speed = 0.0
                if prev_frame is not None and prev_belt_data is not None and belt_data['belt_found']:
                    speed = self._calculate_speed_fast(prev_frame, frame, prev_belt_data, belt_data, target_fps)
                    speed = float(speed)

                if belt_data['belt_found']:
                    speed_history.append(float(speed))
                    alignment_history.append(float(abs(belt_data['alignment_deviation'])))
                    area_history.append(float(belt_data['belt_area_pixels']))

                    if len(speed_history) > 50:
                        speed_history = speed_history[-50:]
                    if len(alignment_history) > 50:
                        alignment_history = alignment_history[-50:]
                    if len(area_history) > 50:
                        area_history = area_history[-50:]

                vibration = self._calculate_vibration_from_area(area_history)

                avg_speed = float(np.mean(speed_history).item()) if speed_history else 0.0
                avg_alignment = float(np.mean(alignment_history).item()) if alignment_history else 0.0
                avg_area = float(np.mean(area_history).item()) if area_history else 0.0

                metrics = {
                    'speed': float(speed),
                    'avg_speed': float(avg_speed),
                    'alignment_deviation': int(belt_data['alignment_deviation']),
                    'avg_alignment': float(avg_alignment),
                    'vibration_amplitude': float(vibration['amplitude']),
                    'vibration_frequency': float(vibration['frequency']),
                    'vibration_severity': str(vibration['severity']),
                    'belt_width': float(belt_data['belt_width']),
                    'belt_height': float(belt_data['belt_height']),
                    'belt_found': bool(belt_data['belt_found']),
                    'frame_number': int(frame_no),
                    'belt_area_pixels': float(belt_data['belt_area_pixels']),
                    'belt_area_mm2': float(belt_data.get('belt_area_mm2')) if belt_data.get(
                        'belt_area_mm2') is not None else None,
                    'avg_belt_area': float(avg_area),
                    'contour_points': int(belt_data.get('contour_points', 0)),
                    'edge_points': int(belt_data.get('edge_points', 0)),
                    'corner_points': int(belt_data.get('corner_points', 0)),
                    'convex_hull_area': float(belt_data.get('convex_hull_area', 0)),
                    'aspect_ratio': float(belt_data.get('aspect_ratio', 0)),
                    'solidity': float(belt_data.get('solidity', 0)),
                    'extent': float(belt_data.get('extent', 0))
                }

                annotated_frame = self._draw_enhanced_visualizations(frame, belt_data, metrics)

                _, buffer = cv2.imencode('.jpg', annotated_frame, [
                    int(cv2.IMWRITE_JPEG_QUALITY), 85
                ])
                frame_base64 = base64.b64encode(buffer).decode('utf-8')

                progress = int((frame_no / total_frames) * 100) if total_frames > 0 else 0

                with self.job_lock:
                    replay_buffer = self.replay_buffers[job_id]
                    if len(replay_buffer['frames']) < 300:
                        replay_buffer['frames'].append(frame_base64)
                        replay_buffer['timestamps'].append(float(current_time))
                        replay_buffer['speeds'].append(float(speed))
                        replay_buffer['alignments'].append(float(belt_data['alignment_deviation']))
                        replay_buffer['vibrations'].append(float(vibration['amplitude']))

                message_data = {
                    "type": "progress_message",
                    "frame": int(frame_no),
                    "progress": int(progress),
                    "belt_metrics": self._prepare_serializable_metrics(metrics),
                    "frame_image": str(frame_base64),
                    "fps": float(self.jobs[job_id].get('fps', 0)),
                    "is_final": False
                }

                try:
                    async_to_sync(channel_layer.group_send)(
                        "frame_progress",
                        message_data
                    )
                except Exception as e:
                    logger.error(f"WebSocket send error: {e}")

                if frame_no % 30 == 0:
                    try:
                        ProcessingJob.objects.filter(job_id=job_id).update(
                            progress=int(progress),
                            updated_at=datetime.now()
                        )
                    except Exception as e:
                        logger.error(f"Database update error: {e}")

                prev_frame = frame.copy()
                prev_belt_data = belt_data
                prev_time = time.time()

            cap.release()

            final_stats = {
                "frames_processed": int(frame_no),
                "total_frames": int(total_frames),
                "average_fps": float(self.jobs[job_id].get('fps', 0)),
                "average_speed": float(np.mean(speed_history).item()) if speed_history else 0.0,
                "max_speed": float(np.max(speed_history).item()) if speed_history else 0.0,
                "average_area": float(np.mean(area_history).item()) if area_history else 0.0,
                "area_std_dev": float(np.std(area_history).item()) if area_history else 0.0,
                "processing_time": float(time.time() - self.jobs[job_id]['start_time']),
                "resolution": f"{frame_width}x{frame_height}"
            }

            ProcessingJob.objects.filter(job_id=job_id).update(
                status="completed",
                result=self._prepare_serializable_metrics(final_stats),
                progress=100
            )

            final_message = {
                "type": "progress_message",
                "frame": int(frame_no),
                "progress": 100,
                "belt_metrics": self._prepare_serializable_metrics(metrics if 'metrics' in locals() else {}),
                "frame_image": frame_base64 if 'frame_base64' in locals() else None,
                "fps": float(self.jobs[job_id].get('fps', 0)),
                "is_final": True,
                "replay_available": True,
                "replay_frames": int(len(self.replay_buffers[job_id]['frames']))
            }

            try:
                async_to_sync(channel_layer.group_send)(
                    "frame_progress",
                    final_message
                )
            except Exception as e:
                logger.error(f"Final WebSocket send error: {e}")

            logger.info(f"Job {job_id} completed. Processed {frame_no} frames.")

        except Exception as e:
            logger.exception(f"Error processing video: {e}")
            try:
                ProcessingJob.objects.filter(job_id=job_id).update(
                    status="error",
                    result={"error": str(e)},
                    progress=0
                )
            except Exception as db_error:
                logger.error(f"Database error: {db_error}")

            try:
                async_to_sync(channel_layer.group_send)(
                    "frame_progress",
                    {
                        "type": "error_message",
                        "error": str(e)
                    }
                )
            except Exception as ws_error:
                logger.error(f"WebSocket error: {ws_error}")

        finally:
            with self.job_lock:
                if job_id in self.jobs:
                    self.jobs[job_id]['is_running'] = False
                if job_id in self.processing_threads:
                    del self.processing_threads[job_id]

        # vision/services/belt_processor.py
        # ... (keep imports and other methods)

    import cv2
    import numpy as np
    import logging

    logger = logging.getLogger(__name__)

    def _detect_belt_with_details(self, frame):
        """Enhanced conveyor belt detection with aggressive thresholds, fully fixed for shape alignment."""
        try:
            height, width = frame.shape[:2]
            frame_center = width // 2

            # --- STEP 1: Crop the ROI first ---
            y1_crop = int(height * 0.15)
            y2_crop = int(height * 0.9)
            x1_crop = int(width * 0.15)
            x2_crop = int(width * 0.85)

            frame_cropped = frame[y1_crop:y2_crop, x1_crop:x2_crop]

            # --- STEP 2: Compute grayscale and equalize ---
            gray = cv2.cvtColor(frame_cropped, cv2.COLOR_BGR2GRAY)
            equalized = cv2.equalizeHist(gray)

            # --- STEP 3: HSV saturation ---
            hsv = cv2.cvtColor(frame_cropped, cv2.COLOR_BGR2HSV)
            _, s, v = cv2.split(hsv)
            saturation = s.astype(np.uint8)

            # --- STEP 4: LAB lightness ---
            lab = cv2.cvtColor(frame_cropped, cv2.COLOR_BGR2LAB)
            lightness = lab[:, :, 0]

            # --- STEP 5: Combine channels ---
            combined = cv2.addWeighted(equalized, 0.5, saturation, 0.3, 0)
            combined = cv2.addWeighted(combined, 0.7, lightness, 0.3, 0)

            # --- STEP 6: Blur ---
            blurred = cv2.GaussianBlur(combined, (5, 5), 1)

            # --- STEP 7: Canny edges ---
            sigma = 0.15
            v_median = np.median(blurred)
            lower = int(max(0, (1.0 - 3 * sigma) * v_median))
            upper = int(min(255, (1.0 + 2 * sigma) * v_median))
            edges_canny = cv2.Canny(blurred, lower, upper, apertureSize=3, L2gradient=True)

            # --- STEP 8: Sobel edges ---
            sobel_x = cv2.Sobel(blurred, cv2.CV_64F, 1, 0, ksize=3)
            sobel_y = cv2.Sobel(blurred, cv2.CV_64F, 0, 1, ksize=3)
            sobel_edges = cv2.magnitude(sobel_x, sobel_y)
            sobel_edges = np.uint8(np.clip(sobel_edges, 0, 255))
            _, sobel_edges = cv2.threshold(sobel_edges, 30, 255, cv2.THRESH_BINARY)

            # --- STEP 9: Combine edges ---
            edges_combined = cv2.bitwise_or(edges_canny, sobel_edges)

            # --- STEP 10: Morphological ops ---
            kernel_dilate = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
            kernel_close = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
            edges_dilated = cv2.dilate(edges_combined, kernel_dilate, iterations=2)
            edges_closed = cv2.morphologyEx(edges_dilated, cv2.MORPH_CLOSE, kernel_close, iterations=2)

            # --- STEP 11: Find contours ---
            contours, _ = cv2.findContours(edges_closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if not contours:
                logger.warning("No contours found, trying Otsu fallback...")
                _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                if not contours:
                    return self._create_empty_belt_data(height, width, frame_center, edges_canny)

            # --- STEP 12: Filter contours ---
            belt_contours = []
            min_area = frame_cropped.shape[0] * frame_cropped.shape[1] * 0.005
            max_area = frame_cropped.shape[0] * frame_cropped.shape[1] * 0.9

            for contour in contours:
                area = cv2.contourArea(contour)
                if area < min_area or area > max_area:
                    continue
                x, y, w, h = cv2.boundingRect(contour)
                aspect_ratio = float(w) / h if h > 0 else 0
                if w > 50 and h > 20 and 0.8 < aspect_ratio < 50.0:
                    hull = cv2.convexHull(contour)
                    hull_area = cv2.contourArea(hull)
                    solidity = float(area) / hull_area if hull_area > 0 else 0
                    rect_area = w * h
                    extent = float(area) / rect_area if rect_area > 0 else 0
                    perimeter = cv2.arcLength(contour, True)
                    circularity = 4 * np.pi * area / (perimeter * perimeter) if perimeter > 0 else 0
                    belt_contours.append({
                        'contour': contour,
                        'area': float(area),
                        'bbox': [int(x), int(y), int(x + w), int(y + h)],
                        'aspect_ratio': aspect_ratio,
                        'solidity': solidity,
                        'extent': extent,
                        'circularity': circularity,
                        'perimeter': perimeter,
                        'center': (int(x + w // 2), int(y + h // 2))
                    })

            # --- STEP 13: Fallback if no contours pass ---
            if not belt_contours and contours:
                largest_contour = max(contours, key=cv2.contourArea)
                x, y, w, h = cv2.boundingRect(largest_contour)
                area = cv2.contourArea(largest_contour)
                belt_contours.append({
                    'contour': largest_contour,
                    'area': float(area),
                    'bbox': [int(x), int(y), int(x + w), int(y + h)],
                    'aspect_ratio': float(w) / h if h > 0 else 1.0,
                    'solidity': 0.5,
                    'extent': 0.5,
                    'circularity': 0.3,
                    'perimeter': cv2.arcLength(largest_contour, True),
                    'center': (int(x + w // 2), int(y + h // 2))
                })

            # --- STEP 14: Select best contour ---
            belt_contours.sort(key=lambda c: c['area'], reverse=True)
            best_contour = belt_contours[0]
            contour = best_contour['contour']
            x1, y1, x2, y2 = best_contour['bbox']
            w, h = x2 - x1, y2 - y1
            belt_center_x = x1 + w // 2
            belt_center_y = y1 + h // 2
            alignment_deviation = belt_center_x - (frame_cropped.shape[1] // 2)

            # --- STEP 15: Create mask aligned with cropped frame ---
            belt_mask = np.zeros(frame_cropped.shape[:2], dtype=np.uint8)
            cv2.drawContours(belt_mask, [contour], -1, 255, -1)
            edge_points_in_belt = np.sum((edges_canny > 0) & (belt_mask > 0))

            # --- STEP 16: Optional mapping back to full frame coordinates ---
            contour_full = contour + [x1_crop, y1_crop]
            bbox_full = [x1 + x1_crop, y1 + y1_crop, x2 + x1_crop, y2 + y1_crop]

            return {
                'belt_found': True,
                'belt_bbox': bbox_full,
                'belt_center': (belt_center_x + x1_crop, belt_center_y + y1_crop),
                'belt_width': float(w),
                'belt_height': float(h),
                'belt_area_pixels': float(best_contour['area']),
                'alignment_deviation': int(alignment_deviation),
                'frame_center': frame_center,
                'contour': contour_full,
                'edges': edges_canny,
                'edge_points': int(edge_points_in_belt),
                'belt_mask': belt_mask,
                'confidence': 0.8
            }

        except Exception as e:
            logger.error(f"Error in belt detection: {e}", exc_info=True)
            height, width = frame.shape[:2] if 'frame' in locals() else (0, 0)
            return self._create_empty_belt_data(height, width, width // 2 if width > 0 else 0, None)

    def set_detection_parameters(self, parameters=None):
        """Set detection parameters for debugging"""
        default_params = {
            'canny_sigma': 0.25,
            'min_area_ratio': 0.01,  # Min 1% of frame
            'max_area_ratio': 0.7,  # Max 70% of frame
            'min_aspect_ratio': 1.5,
            'max_aspect_ratio': 25.0,
            'min_solidity': 0.6,
            'min_extent': 0.5,
            'max_circularity': 0.7,
            'min_confidence': 0.3,
            'enable_debug': True
        }

        if parameters:
            default_params.update(parameters)

        self.detection_params = default_params
        logger.info(f"Detection parameters updated: {default_params}")
        return default_params


    def _create_empty_belt_data(self, height, width, frame_center, edges):
        """Create empty belt data structure"""
        return {
            'belt_found': False,
            'belt_bbox': [0, 0, 0, 0],
            'belt_center': (0, 0),
            'belt_width': 0.0,
            'belt_height': 0.0,
            'belt_area_pixels': 0.0,
            'belt_area_mm2': None,
            'belt_physical_width_mm': None,
            'belt_physical_height_mm': None,
            'alignment_deviation': 0,
            'frame_center': int(frame_center),
            'contour': None,
            'edges': edges,
            'contour_points': 0,
            'edge_points': int(np.sum(edges > 0)) if edges is not None else 0,
            'corner_points': 0,
            'convex_hull_area': 0.0,
            'min_area_rect_area': 0.0,
            'belt_orientation': 0.0,
            'aspect_ratio': 0.0,
            'solidity': 0.0,
            'extent': 0.0
        }

    def _find_corner_points(self, contour, max_corners=20, quality=0.01, min_distance=10):
        """Find corner points in a contour"""
        if len(contour) < 4:
            return []

        points = contour.reshape(-1, 2).astype(np.float32)

        corners = cv2.goodFeaturesToTrack(points, max_corners, quality, min_distance)

        if corners is not None:
            corners = corners.reshape(-1, 2).astype(int)
            return corners.tolist()
        return []

    def _calculate_speed_fast(self, prev_frame, curr_frame, prev_belt_data, curr_belt_data, fps):
        """Calculate belt speed using optical flow"""
        try:
            if not prev_belt_data['belt_found'] or not curr_belt_data['belt_found']:
                return 0.0

            height, width = prev_frame.shape[:2]

            prev_mask = prev_belt_data.get('belt_mask', np.zeros((height, width), dtype=np.uint8))
            curr_mask = curr_belt_data.get('belt_mask', np.zeros((height, width), dtype=np.uint8))

            prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)
            curr_gray = cv2.cvtColor(curr_frame, cv2.COLOR_BGR2GRAY)

            prev_gray = cv2.bitwise_and(prev_gray, prev_gray, mask=prev_mask)
            curr_gray = cv2.bitwise_and(curr_gray, curr_gray, mask=curr_mask)

            flow = cv2.calcOpticalFlowFarneback(
                prev_gray, curr_gray, None,
                pyr_scale=0.5, levels=3, winsize=15,
                iterations=3, poly_n=5, poly_sigma=1.2,
                flags=0
            )

            flow_x = flow[..., 0]

            mask_indices = np.where(prev_mask > 0)
            if len(mask_indices[0]) > 0:
                movements = flow_x[mask_indices]

                valid_movements = movements[np.abs(movements) > 0.1]

                if len(valid_movements) > 0:
                    avg_movement = float(np.mean(valid_movements))

                    pixel_to_meter = 0.001

                    if curr_belt_data.get('belt_physical_width_mm') and curr_belt_data.get('belt_width'):
                        physical_width_mm = float(curr_belt_data['belt_physical_width_mm'])
                        pixel_width = float(curr_belt_data['belt_width'])
                        if pixel_width > 0:
                            pixel_to_meter = (physical_width_mm / 1000.0) / pixel_width

                    speed_m_per_sec = abs(avg_movement) * float(fps) * pixel_to_meter
                    speed_m_per_min = speed_m_per_sec * 60.0

                    return float(speed_m_per_min)

            return 0.0

        except Exception as e:
            logger.error(f"Error calculating speed: {e}")
            return 0.0

    def _calculate_vibration_from_area(self, area_history):
        """Calculate vibration from area variations"""
        try:
            if len(area_history) < 5:
                return {
                    'amplitude': 0.0,
                    'frequency': 0.0,
                    'severity': 'Low'
                }

            recent_areas = area_history[-20:] if len(area_history) >= 20 else area_history

            if len(recent_areas) > 1:
                mean_area = float(np.mean(recent_areas))
                if mean_area > 0:
                    normalized_areas = [(float(a) - mean_area) / mean_area for a in recent_areas]
                    amplitude = float(np.std(normalized_areas)) * 100.0
                else:
                    amplitude = 0.0
            else:
                amplitude = 0.0

            if amplitude < 5.0:
                severity = 'Low'
            elif amplitude < 15.0:
                severity = 'Medium'
            else:
                severity = 'High'

            return {
                'amplitude': float(amplitude),
                'frequency': 0.0,
                'severity': str(severity)
            }

        except Exception as e:
            logger.error(f"Error calculating vibration from area: {e}")
            return {
                'amplitude': 0.0,
                'frequency': 0.0,
                'severity': 'Low'
            }

    def _draw_enhanced_visualizations(self, frame, belt_data, metrics):
        """Draw enhanced visualizations with area measurement display"""
        vis_frame = frame.copy()
        height, width = frame.shape[:2]

        COLOR_BLUE = (255, 0, 0)
        COLOR_GREEN = (0, 255, 0)
        COLOR_YELLOW = (0, 255, 255)
        COLOR_RED = (0, 0, 255)
        COLOR_MAGENTA = (255, 0, 255)
        COLOR_CYAN = (255, 255, 0)
        COLOR_ORANGE = (0, 165, 255)
        COLOR_WHITE = (255, 255, 255)

        if not belt_data['belt_found']:
            cv2.putText(vis_frame, "NO BELT DETECTED",
                        (width // 2 - 120, height // 2),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, COLOR_RED, 2)
            return vis_frame

        if belt_data.get('contour') is not None:
            contour = belt_data['contour']

            overlay = vis_frame.copy()
            cv2.drawContours(overlay, [contour], -1, (0, 100, 255), -1)
            cv2.addWeighted(overlay, 0.3, vis_frame, 0.7, 0, vis_frame)

            cv2.drawContours(vis_frame, [contour], -1, COLOR_YELLOW, 2)

            for point in contour[::10]:
                x, y = point[0]
                cv2.circle(vis_frame, (x, y), 2, COLOR_BLUE, -1)

            if belt_data.get('convex_hull') is not None:
                cv2.drawContours(vis_frame, [belt_data['convex_hull']], -1, COLOR_MAGENTA, 2)

            if belt_data.get('min_area_rect') is not None:
                cv2.drawContours(vis_frame, [belt_data['min_area_rect']], -1, (0, 255, 0), 2)

                rect_center = tuple(np.mean(belt_data['min_area_rect'], axis=0).astype(int))
                cv2.putText(vis_frame, "Min Area Rect",
                            (rect_center[0] - 50, rect_center[1] - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

        if belt_data.get('edges') is not None:
            edges = belt_data['edges']
            y_indices, x_indices = np.where(edges > 0)
            for x, y in zip(x_indices[:300], y_indices[:300]):
                cv2.circle(vis_frame, (x, y), 1, COLOR_GREEN, -1)

        if belt_data.get('corners') is not None:
            for corner in belt_data['corners']:
                if len(corner) == 2:
                    x, y = corner
                    cv2.circle(vis_frame, (x, y), 6, COLOR_RED, -1)

        if belt_data['belt_found'] and belt_data.get('contour') is not None:
            M = cv2.moments(belt_data['contour'])
            if M['m00'] != 0:
                centroid_x = int(M['m10'] / M['m00'])
                centroid_y = int(M['m01'] / M['m00'])
                cv2.circle(vis_frame, (centroid_x, centroid_y), 8, COLOR_CYAN, -1)
                cv2.circle(vis_frame, (centroid_x, centroid_y), 10, COLOR_CYAN, 2)

                area_text = f"Area: {belt_data['belt_area_pixels']:.0f} px²"
                if belt_data.get('belt_area_mm2'):
                    area_text += f"\n{belt_data['belt_area_mm2']:.0f} mm²"

                text_size = cv2.getTextSize(area_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)[0]
                cv2.rectangle(vis_frame,
                              (centroid_x - text_size[0] // 2 - 5, centroid_y + 20 - text_size[1] - 5),
                              (centroid_x + text_size[0] // 2 + 5, centroid_y + 20 + 5),
                              (0, 0, 0), -1)
                cv2.putText(vis_frame, area_text,
                            (centroid_x - text_size[0] // 2, centroid_y + 20),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, COLOR_WHITE, 1)

        frame_center = belt_data['frame_center']
        cv2.line(vis_frame, (frame_center, 0), (frame_center, height), (200, 200, 200), 2)

        deviation = belt_data['alignment_deviation']
        arrow_y = height - 50
        alignment_color = COLOR_ORANGE if abs(deviation) > 20 else COLOR_GREEN
        cv2.arrowedLine(vis_frame, (frame_center, arrow_y),
                        (frame_center + deviation, arrow_y), alignment_color, 3, tipLength=0.05)

        y_pos = 30
        line_height = 25

        overlay = vis_frame.copy()
        cv2.rectangle(overlay, (10, 10), (450, 300), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.6, vis_frame, 0.4, 0, vis_frame)

        cv2.putText(vis_frame, "BELT AREA ANALYSIS",
                    (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
        y_pos += line_height + 10

        cv2.putText(vis_frame, "--- AREA MEASUREMENTS ---",
                    (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 200, 100), 1)
        y_pos += line_height

        area_px = belt_data['belt_area_pixels']
        cv2.putText(vis_frame, f"Contour Area: {area_px:.0f} px²",
                    (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, COLOR_YELLOW, 2)
        y_pos += line_height

        if belt_data.get('belt_area_mm2'):
            area_mm2 = belt_data['belt_area_mm2']
            cv2.putText(vis_frame, f"Physical Area: {area_mm2:.0f} mm²",
                        (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 200), 2)
            y_pos += line_height

        hull_area = belt_data.get('convex_hull_area', 0)
        hull_efficiency = (area_px / hull_area * 100) if hull_area > 0 else 0
        cv2.putText(vis_frame, f"Convex Hull: {hull_area:.0f} px² ({hull_efficiency:.1f}% eff)",
                    (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, COLOR_MAGENTA, 2)
        y_pos += line_height

        min_rect_area = belt_data.get('min_area_rect_area', 0)
        rect_efficiency = (area_px / min_rect_area * 100) if min_rect_area > 0 else 0
        cv2.putText(vis_frame, f"Min Rect Area: {min_rect_area:.0f} px² ({rect_efficiency:.1f}% eff)",
                    (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, COLOR_GREEN, 2)
        y_pos += line_height + 5

        cv2.putText(vis_frame, "--- DIMENSIONS ---",
                    (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 255), 1)
        y_pos += line_height

        cv2.putText(vis_frame, f"Width: {belt_data['belt_width']:.1f} px",
                    (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, COLOR_CYAN, 2)
        y_pos += line_height

        cv2.putText(vis_frame, f"Height: {belt_data['belt_height']:.1f} px",
                    (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, COLOR_CYAN, 2)
        y_pos += line_height

        if belt_data.get('belt_physical_width_mm'):
            cv2.putText(vis_frame, f"Phys Width: {belt_data['belt_physical_width_mm']:.1f} mm",
                        (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 100), 2)
            y_pos += line_height

        aspect_ratio = belt_data.get('aspect_ratio', 0)
        cv2.putText(vis_frame, f"Aspect Ratio: {aspect_ratio:.2f}",
                    (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 150, 0), 2)
        y_pos += line_height

        cv2.putText(vis_frame, "--- SHAPE QUALITY ---",
                    (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 150, 255), 1)
        y_pos += line_height

        solidity = belt_data.get('solidity', 0)
        solidity_color = COLOR_GREEN if solidity > 0.85 else COLOR_ORANGE if solidity > 0.7 else COLOR_RED
        cv2.putText(vis_frame, f"Solidity: {solidity:.3f}",
                    (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, solidity_color, 2)
        y_pos += line_height

        extent = belt_data.get('extent', 0)
        extent_color = COLOR_GREEN if extent > 0.85 else COLOR_ORANGE if extent > 0.7 else COLOR_RED
        cv2.putText(vis_frame, f"Extent: {extent:.3f}",
                    (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, extent_color, 2)
        y_pos += line_height

        cv2.putText(vis_frame, "--- FEATURE COUNTS ---",
                    (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (150, 255, 255), 1)
        y_pos += line_height

        cv2.putText(vis_frame, f"Contour Points: {belt_data.get('contour_points', 0)}",
                    (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, COLOR_BLUE, 2)
        y_pos += line_height

        cv2.putText(vis_frame, f"Edge Points: {belt_data.get('edge_points', 0)}",
                    (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, COLOR_GREEN, 2)
        y_pos += line_height

        cv2.putText(vis_frame, f"Corner Points: {belt_data.get('corner_points', 0)}",
                    (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, COLOR_RED, 2)
        y_pos += line_height

        cv2.putText(vis_frame, f"Frame: {metrics.get('frame_number', 0)}",
                    (width - 150, height - 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, COLOR_WHITE, 2)

        warning_y = 40
        if abs(deviation) > 50:
            cv2.putText(vis_frame, "⚠ MISALIGNMENT",
                        (width - 200, warning_y),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, COLOR_ORANGE, 2)
            warning_y += 30

        if belt_data.get('solidity', 1) < 0.7:
            cv2.putText(vis_frame, "⚠ IRREGULAR SHAPE",
                        (width - 200, warning_y),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, COLOR_ORANGE, 2)
            warning_y += 30

        if area_px > 0:
            expected_area_ratio = area_px / (height * width)
            if expected_area_ratio < 0.1:
                cv2.putText(vis_frame, "⚠ SMALL BELT AREA",
                            (width - 200, warning_y),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, COLOR_ORANGE, 2)

        return vis_frame

    def get_job_status(self, job_id):
        """Get status of a processing job"""
        with self.job_lock:
            if job_id not in self.jobs:
                return {'error': 'Job not found'}

        try:
            job = ProcessingJob.objects.get(job_id=job_id)

            status_data = {
                'job_id': str(job.job_id),
                'status': str(job.status),
                'progress': int(job.progress),
                'result': self._prepare_serializable_metrics(job.result) if job.result else {},
                'created_at': job.created_at.isoformat() if job.created_at else None,
                'updated_at': job.updated_at.isoformat() if job.updated_at else None,
                'video': str(job.video.path) if job.video else None
            }

            with self.job_lock:
                if job_id in self.jobs:
                    job_info = self.jobs[job_id]
                    status_data.update({
                        'fps': float(job_info.get('fps', 0)),
                        'frame_count': int(job_info.get('frame_count', 0)),
                        'total_frames': int(job_info.get('total_frames', 0)),
                        'is_running': bool(job_info.get('is_running', False)),
                        'processing_time': float(time.time() - job_info.get('start_time', time.time()))
                    })

            return self._prepare_serializable_metrics(status_data)

        except ProcessingJob.DoesNotExist:
            return {'error': 'Job not found in database'}
        except Exception as e:
            logger.error(f"Error getting job status: {e}")
            return {'error': str(e)}

    def stop_job(self, job_id):
        """Stop a processing job"""
        with self.job_lock:
            if job_id not in self.jobs:
                return False

            self.jobs[job_id]['is_running'] = False

        try:
            ProcessingJob.objects.filter(job_id=job_id).update(
                status="stopped",
                updated_at=datetime.now()
            )
        except Exception as e:
            logger.error(f"Error updating job status: {e}")

        def cleanup():
            time.sleep(2)
            with self.job_lock:
                if job_id in self.jobs:
                    del self.jobs[job_id]
                if job_id in self.replay_buffers:
                    del self.replay_buffers[job_id]
                if job_id in self.frame_queues:
                    del self.frame_queues[job_id]
                if job_id in self.processing_threads:
                    del self.processing_threads[job_id]

        threading.Thread(target=cleanup, daemon=True).start()
        return True

    def get_replay_frames(self, job_id, start_frame=0, end_frame=None):
        """Get frames from replay buffer"""
        with self.job_lock:
            if job_id not in self.replay_buffers:
                return {'frames': [], 'count': 0}

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
                'alignments': buffer['alignments'][start_frame:end_frame],
                'vibrations': buffer['vibrations'][start_frame:end_frame],
                'count': int(len(frames[start_frame:end_frame]))
            }

    def list_active_jobs(self):
        """List all active jobs"""
        with self.job_lock:
            active_jobs = []
            for job_id, job_info in self.jobs.items():
                if job_info.get('is_running', False):
                    active_jobs.append({
                        'job_id': str(job_id),
                        'fps': float(job_info.get('fps', 0)),
                        'frame_count': int(job_info.get('frame_count', 0)),
                        'progress': int(job_info.get('frame_count', 0) / max(job_info.get('total_frames', 1), 1) * 100),
                        'start_time': float(job_info.get('start_time', 0))
                    })
            return self._prepare_serializable_metrics(active_jobs)

    # Add this to your BeltProcessor class

    def tune_detection_for_video(self, video_path):
        """Helper method to find optimal parameters for a specific video"""
        cap = cv2.VideoCapture(video_path)
        ret, sample_frame = cap.read()
        cap.release()

        if not ret:
            return {"error": "Could not read video"}

        # Try different parameter sets
        parameter_sets = [
            {
                'name': 'VERY_AGGRESSIVE',
                'canny_sigma': 0.15,
                'min_area_ratio': 0.005,  # 0.5% of frame
                'max_area_ratio': 0.8,  # 80% of frame
                'min_aspect_ratio': 1.0,  # Very wide range
                'max_aspect_ratio': 30.0,
                'min_solidity': 0.4,  # Very low
                'min_extent': 0.3,  # Very low
                'max_circularity': 0.8,
                'min_confidence': 0.15,  # Very low
                'enable_debug': True
            },
            {
                'name': 'AGGRESSIVE',
                'canny_sigma': 0.2,
                'min_area_ratio': 0.01,  # 1% of frame
                'max_area_ratio': 0.7,  # 70% of frame
                'min_aspect_ratio': 1.2,
                'max_aspect_ratio': 25.0,
                'min_solidity': 0.5,
                'min_extent': 0.4,
                'max_circularity': 0.75,
                'min_confidence': 0.2,
                'enable_debug': True
            },
            {
                'name': 'MODERATE',
                'canny_sigma': 0.25,
                'min_area_ratio': 0.02,  # 2% of frame
                'max_area_ratio': 0.6,  # 60% of frame
                'min_aspect_ratio': 1.5,
                'max_aspect_ratio': 20.0,
                'min_solidity': 0.6,
                'min_extent': 0.5,
                'max_circularity': 0.7,
                'min_confidence': 0.3,
                'enable_debug': True
            }
        ]

        results = []
        for params in parameter_sets:
            self.set_detection_parameters(params)
            belt_data = self._detect_belt_with_details(sample_frame)
            results.append({
                'name': params['name'],
                'belt_found': belt_data['belt_found'],
                'area': belt_data['belt_area_pixels'],
                'width': belt_data['belt_width'],
                'height': belt_data['belt_height'],
                'aspect_ratio': belt_data['aspect_ratio'],
                'confidence': belt_data.get('confidence', 0)
            })

        return results
# Create global instance
processor = BeltProcessor()