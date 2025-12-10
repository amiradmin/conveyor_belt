# vision/services/belt_processor.py
import os
import time
import queue
import threading
import logging
import base64
from datetime import datetime

import numpy as np
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings

from vision.models import ProcessingJob, VideoFile
import cv2

logger = logging.getLogger(__name__)


class BeltUtils:
    """Utility methods for belt processing, speed calculation, and visualization"""

    def ensure_serializable(self, obj):
        if obj is None:
            return None
        elif isinstance(obj, (np.integer,)):
            return int(obj)
        elif isinstance(obj, (np.floating,)):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, np.bool_):
            return bool(obj)
        elif isinstance(obj, dict):
            return {k: self.ensure_serializable(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self.ensure_serializable(i) for i in obj]
        elif isinstance(obj, tuple):
            return tuple(self.ensure_serializable(i) for i in obj)
        elif isinstance(obj, (str, int, float, bool)):
            return obj
        else:
            try:
                return str(obj)
            except:
                return None

    def calculate_speed_fast(self, prev_frame_gray, curr_frame_gray, prev_belt_data, curr_belt_data, fps):
        """Calculate belt speed using optical flow limited to the belt mask (m/s)"""
        try:
            if not prev_belt_data or not curr_belt_data or not prev_belt_data.get('belt_found') or not curr_belt_data.get('belt_found'):
                return 0.0
            height, width = prev_frame_gray.shape[:2]

            def safe_mask(mask):
                if mask is None:
                    return np.zeros((height, width), dtype=np.uint8)
                m = mask.astype(np.uint8)
                if m.shape != (height, width):
                    m = cv2.resize(m, (width, height), interpolation=cv2.INTER_NEAREST)
                return (m > 0).astype(np.uint8) * 255

            prev_mask = safe_mask(prev_belt_data.get('belt_mask'))
            curr_mask = safe_mask(curr_belt_data.get('belt_mask'))

            prev_masked = cv2.bitwise_and(prev_frame_gray, prev_frame_gray, mask=prev_mask)
            curr_masked = cv2.bitwise_and(curr_frame_gray, curr_frame_gray, mask=curr_mask)

            if np.count_nonzero(prev_mask) < 50:
                return 0.0

            flow = cv2.calcOpticalFlowFarneback(prev_masked, curr_masked, None,
                                                0.5, 3, 15, 3, 5, 1.2, 0)
            if flow is None:
                return 0.0

            flow_x = flow[..., 0]
            movements = flow_x[prev_mask > 0]
            valid = movements[np.abs(movements) > 0.05]
            if valid.size == 0:
                return 0.0

            avg_px_per_frame = float(np.mean(valid))
            pixel_to_meter = 0.001  # default 1 mm per px
            try:
                if curr_belt_data.get('belt_physical_width_mm') and curr_belt_data.get('belt_width'):
                    physical_mm = float(curr_belt_data['belt_physical_width_mm'])
                    pixel_width = float(curr_belt_data['belt_width'])
                    pixel_to_meter = (physical_mm / 1000.0) / pixel_width if pixel_width > 0 else 0.001
            except:
                pass

            return float(abs(avg_px_per_frame) * fps * pixel_to_meter)
        except Exception as e:
            logger.error(f"Error calculating speed: {e}")
            return 0.0

    def calculate_speed_kmh(self, prev_frame_gray, curr_frame_gray, prev_belt_data, curr_belt_data, fps):
        return self.calculate_speed_fast(prev_frame_gray, curr_frame_gray, prev_belt_data, curr_belt_data, fps) * 3.6

    def draw_enhanced_visualizations(self, frame, belt_data, metrics):
        """Draw contours, edges, speed, alignment, and overlay metrics"""
        vis = frame.copy()
        h, w = vis.shape[:2]
        COLOR_GREEN = (0, 255, 0)
        COLOR_RED = (0, 0, 255)
        COLOR_BLUE = (255, 0, 0)
        COLOR_CYAN = (255, 255, 0)
        COLOR_YELLOW = (0, 255, 255)
        COLOR_ORANGE = (0, 165, 255)
        COLOR_WHITE = (255, 255, 255)

        if not belt_data.get('belt_found', False):
            cv2.putText(vis, "NO BELT DETECTED", (w // 2 - 150, h // 2),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, COLOR_RED, 2, cv2.LINE_AA)
            return vis

        contour = belt_data.get('contour')
        if contour is not None and len(contour) > 2:
            cv2.drawContours(vis, [contour], -1, COLOR_GREEN, 2)
        if belt_data.get('convex_hull') is not None:
            cv2.drawContours(vis, [belt_data['convex_hull']], -1, COLOR_CYAN, 2)
        if belt_data.get('min_area_rect') is not None:
            cv2.drawContours(vis, [belt_data['min_area_rect']], -1, COLOR_BLUE, 2)

        edges = belt_data.get('edges')
        mask = belt_data.get('belt_mask')
        if edges is not None and mask is not None and edges.shape == mask.shape:
            ys, xs = np.where(np.logical_and(edges > 0, mask > 0))
            for x, y in zip(xs[:1000], ys[:1000]):
                vis[y, x] = COLOR_RED

        left_edge = belt_data.get('left_edge') or []
        right_edge = belt_data.get('right_edge') or []
        if len(left_edge) > 2:
            cv2.polylines(vis, [np.array(left_edge).reshape(-1, 1, 2)], False, COLOR_BLUE, 3)
        if len(right_edge) > 2:
            cv2.polylines(vis, [np.array(right_edge).reshape(-1, 1, 2)], False, COLOR_CYAN, 3)

        damaged = belt_data.get('damaged_points') or []
        for x, y in damaged:
            cv2.circle(vis, (x, y), 4, COLOR_RED, -1)

        deviation = int(belt_data.get('alignment_deviation', 0))
        frame_center = belt_data.get('frame_center', w // 2)
        cv2.arrowedLine(vis, (frame_center, h - 40), (frame_center + deviation, h - 40),
                        COLOR_ORANGE if abs(deviation) > 30 else COLOR_GREEN, 3, tipLength=0.05)

        # Overlay metrics
        y0, dy = 20, 22
        metrics_lines = [
            f"Speed: {metrics.get('speed', 0):.2f} km/h",
            f"Avg Speed: {metrics.get('avg_speed', 0):.2f} km/h",
            f"Alignment: {deviation} px",
            f"Area: {belt_data.get('belt_area_pixels', 0):.0f} px",
            f"Edges (pts): {belt_data.get('edge_points', 0)}",
            f"Contour pts: {belt_data.get('contour_points', 0)}",
            f"Damaged pts: {len(damaged)}"
        ]
        cv2.rectangle(vis, (5, 5), (320, 5 + len(metrics_lines) * dy + 10), (0, 0, 0), -1)
        for i, line in enumerate(metrics_lines):
            cv2.putText(vis, line, (10, y0 + i * dy), cv2.FONT_HERSHEY_SIMPLEX, 0.55, COLOR_WHITE, 1, cv2.LINE_AA)

        return vis


class BeltDetector:
    """Detect conveyor belt contours, mask, and key metrics"""

    def __init__(self):
        self.detection_params = self._get_default_parameters()

    def _get_default_parameters(self):
        return {
            'canny_sigma': 0.25,
            'min_area_ratio': 0.01,
            'max_area_ratio': 0.7,
            'min_aspect_ratio': 1.5,
            'max_aspect_ratio': 25.0,
            'min_solidity': 0.6,
            'min_extent': 0.5,
            'enable_debug': False
        }

    def set_detection_parameters(self, parameters=None):
        if parameters:
            self.detection_params.update(parameters)
        logger.info(f"Detection parameters updated: {self.detection_params}")
        return self.detection_params

    def _create_empty_belt_data(self, height, width, frame_center, edges_img=None):
        return {
            'belt_found': False,
            'belt_bbox': None,
            'belt_center': None,
            'belt_width': 0,
            'belt_height': 0,
            'belt_area_pixels': 0.0,
            'alignment_deviation': 0,
            'frame_center': frame_center,
            'contour': None,
            'convex_hull': None,
            'min_area_rect': None,
            'edges': edges_img if edges_img is not None else np.zeros((height, width), dtype=np.uint8),
            'edge_points': 0,
            'belt_mask': np.zeros((height, width), dtype=np.uint8),
            'confidence': 0.0,
            'contour_points': 0,
            'corner_points': 0,
            'convex_hull_area': 0.0,
            'min_area_rect_area': 0.0,
            'aspect_ratio': 0.0,
            'solidity': 0.0,
            'extent': 0.0,
            'corners': [],
            'belt_orientation': 0.0
        }

    def _find_corner_points(self, contour, max_corners=20, quality=0.01, min_distance=10):
        if contour is None or len(contour) < 4:
            return []
        pts = contour.reshape(-1, 2).astype(np.float32)
        corners = cv2.goodFeaturesToTrack(pts, max_corners, quality, min_distance)
        if corners is not None:
            return corners.reshape(-1, 2).astype(int).tolist()
        return []

    def detect_belt_with_details(self, frame):
        try:
            height, width = frame.shape[:2]
            frame_center = width // 2

            # Crop ROI
            y1, y2 = int(height * 0.12), int(height * 0.95)
            x1, x2 = int(width * 0.05), int(width * 0.95)
            crop = frame[y1:y2, x1:x2]
            if crop.size == 0:
                return self._create_empty_belt_data(height, width, frame_center)

            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            gray = clahe.apply(gray)
            blurred = cv2.medianBlur(gray, 5)

            # Auto Canny
            sigma = self.detection_params.get('canny_sigma', 0.25)
            v = np.median(blurred)
            edges = cv2.Canny(blurred, int(max(0, (1 - sigma) * v)), int(min(255, (1 + sigma) * v)))
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
            edges_closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel, iterations=2)

            contours, _ = cv2.findContours(edges_closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if not contours:
                return self._create_empty_belt_data(height, width, frame_center, edges)

            # Belt candidates
            belt_candidates = []
            min_area = max(50, crop.shape[0] * crop.shape[1] * 0.005)
            max_area = crop.shape[0] * crop.shape[1] * 0.9
            for cnt in contours:
                area = cv2.contourArea(cnt)
                if area < min_area or area > max_area:
                    continue
                x, y, w, h = cv2.boundingRect(cnt)
                aspect_ratio = w / h if h > 0 else 0
                hull = cv2.convexHull(cnt)
                solidity = area / cv2.contourArea(hull) if hull is not None else 0
                extent = area / (w * h) if w * h > 0 else 0
                if aspect_ratio < self.detection_params.get('min_aspect_ratio', 1.0):
                    continue
                if solidity < self.detection_params.get('min_solidity', 0.4):
                    continue
                if extent < self.detection_params.get('min_extent', 0.3):
                    continue
                belt_candidates.append({'contour': cnt, 'area': area, 'bbox': (x, y, x + w, y + h),
                                        'aspect_ratio': aspect_ratio, 'solidity': solidity, 'extent': extent})

            if not belt_candidates and contours:
                largest = max(contours, key=cv2.contourArea)
                x, y, w, h = cv2.boundingRect(largest)
                belt_candidates.append({'contour': largest, 'area': cv2.contourArea(largest),
                                        'bbox': (x, y, x + w, y + h), 'aspect_ratio': w / max(1, h),
                                        'solidity': 0.5, 'extent': 0.5})

            best = sorted(belt_candidates, key=lambda c: c['area'], reverse=True)[0]
            mask_crop = np.zeros(crop.shape[:2], np.uint8)
            cv2.drawContours(mask_crop, [best['contour']], -1, 255, -1)

            contour_full = best['contour'] + np.array([[x1, y1]])
            contour_full = contour_full.reshape(-1, 1, 2).astype(np.int32)
            mask_full = np.zeros((height, width), np.uint8)
            mask_full[y1:y2, x1:x2] = mask_crop

            x1b, y1b, x2b, y2b = best['bbox']
            w_full, h_full = x2b - x1b, y2b - y1b
            belt_center_x, belt_center_y = x1b + w_full // 2, y1b + h_full // 2
            alignment_deviation = belt_center_x - crop.shape[1] // 2

            rect = cv2.minAreaRect(contour_full)
            min_area_rect = cv2.boxPoints(rect).astype(np.int32)
            convex_hull = cv2.convexHull(contour_full)
            convex_hull_area = float(cv2.contourArea(convex_hull)) if convex_hull is not None else 0.0

            return {
                'belt_found': True,
                'belt_bbox': [x1b + x1, y1b + y1, x2b + x1, y2b + y1],
                'belt_center': (belt_center_x, belt_center_y),
                'belt_width': float(w_full),
                'belt_height': float(h_full),
                'belt_area_pixels': float(best['area']),
                'alignment_deviation': int(alignment_deviation),
                'frame_center': frame_center,
                'contour': contour_full,
                'convex_hull': convex_hull,
                'min_area_rect': min_area_rect,
                'edges': edges,
                'edge_points': int(np.sum((edges > 0) & (mask_crop > 0))),
                'belt_mask': mask_full,
                'confidence': 0.9,
                'contour_points': int(contour_full.reshape(-1, 2).shape[0]),
                'corner_points': len(self._find_corner_points(contour_full)),
                'convex_hull_area': convex_hull_area,
                'min_area_rect_area': float(cv2.contourArea(min_area_rect)) if min_area_rect is not None else 0.0,
                'aspect_ratio': best['aspect_ratio'],
                'solidity': best['solidity'],
                'extent': best['extent'],
                'corners': self._find_corner_points(contour_full),
                'belt_orientation': float(rect[2]) if rect else 0.0
            }
        except Exception as e:
            logger.error(f"Belt detection error: {e}")
            return self._create_empty_belt_data(*frame.shape[:2], frame.shape[1] // 2)


class BeltProcessor:
    """Process video streams, detect belts, compute metrics, send via WebSocket"""

    def __init__(self):
        self.jobs = {}
        self.replay_buffers = {}
        self.frame_queues = {}
        self.processing_threads = {}
        self.job_lock = threading.Lock()
        self.calibration_data = {}
        self.detector = BeltDetector()
        self.utils = BeltUtils()

    def _ensure_serializable(self, obj):
        return self.utils.ensure_serializable(obj)

    def _prepare_serializable_metrics(self, metrics_dict):
        return self._ensure_serializable(metrics_dict)

    def calibrate_belt_area(self, job_id, reference_width_mm=1000, reference_height_mm=200):
        with self.job_lock:
            self.calibration_data[job_id] = {
                'reference_width_mm': float(reference_width_mm),
                'reference_height_mm': float(reference_height_mm),
                'calibrated': False,
                'pixels_per_mm': None,
                'calibration_timestamp': time.time()
            }
        return {"status": "calibration_data_set", "job_id": job_id}

    def start_job(self, job_id, video_path, camera_id="default"):
        """Start processing video in a separate thread"""
        if not os.path.isabs(video_path):
            video_path = os.path.join(settings.MEDIA_ROOT, video_path)
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")

        video_obj, _ = VideoFile.objects.get_or_create(
            path=video_path,
            defaults={'filename': os.path.basename(video_path), 'size': os.path.getsize(video_path)}
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
                'video_path': video_path,
                'camera_id': camera_id,
                'start_time': time.time(),
                'is_running': True,
                'fps': 0.0,
                'frame_count': 0,
                'total_frames': 0,
                'processing_started': False
            }
            self.replay_buffers[job_id] = {'frames': [], 'timestamps': [], 'speeds': [], 'alignments': []}
            self.frame_queues[job_id] = queue.Queue(maxsize=30)

        thread = threading.Thread(target=self._process_video_stream, args=(job_id, video_path), name=f"BeltProcessor-{job_id}")
        thread.daemon = True
        thread.start()

        with self.job_lock:
            self.processing_threads[job_id] = thread

        return job

    def _process_video_stream(self, job_id, video_path):
        """Internal processing loop for frames"""
        channel_layer = get_channel_layer()
        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise RuntimeError(f"Cannot open video: {video_path}")

            original_fps = float(cap.get(cv2.CAP_PROP_FPS)) or 30.0
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            frame_interval = 1.0 / min(original_fps, 30.0)

            with self.job_lock:
                self.jobs[job_id].update({'total_frames': total_frames, 'original_fps': original_fps, 'processing_started': True})

            frame_no = 0
            prev_frame_gray = None
            prev_belt_data = None
            prev_time = time.time()
            fps_start_time = time.time()
            fps_frame_count = 0

            speed_history, alignment_history, area_history = [], [], []

            while self.jobs.get(job_id, {}).get('is_running', False):
                ret, frame = cap.read()
                if not ret:
                    break
                frame_no += 1
                fps_frame_count += 1
                current_time = time.time()

                if current_time - fps_start_time >= 1.0:
                    current_fps = fps_frame_count / (current_time - fps_start_time)
                    with self.job_lock:
                        self.jobs[job_id]['fps'] = float(current_fps)
                    fps_start_time = current_time
                    fps_frame_count = 0

                with self.job_lock:
                    self.jobs[job_id]['frame_count'] = frame_no

                elapsed = current_time - prev_time
                time.sleep(max(0, frame_interval - elapsed))

                belt_data = self.detector.detect_belt_with_details(frame)
                frame_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

                speed_kmh = self.utils.calculate_speed_kmh(prev_frame_gray, frame_gray, prev_belt_data, belt_data, self.jobs[job_id]['fps']) if prev_frame_gray is not None else 0.0

                if belt_data.get('belt_found', False):
                    speed_history.append(speed_kmh)
                    alignment_history.append(abs(belt_data.get('alignment_deviation', 0)))
                    area_history.append(float(belt_data.get('belt_area_pixels', 0)))
                    speed_history = speed_history[-50:]
                    alignment_history = alignment_history[-50:]
                    area_history = area_history[-50:]

                metrics = {
                    'speed': speed_kmh,
                    'avg_speed': float(np.mean(speed_history)) if speed_history else 0.0,
                    'alignment_deviation': int(belt_data.get('alignment_deviation', 0)),
                    'avg_alignment': float(np.mean(alignment_history)) if alignment_history else 0.0,
                    'belt_area_pixels': float(belt_data.get('belt_area_pixels', 0)),
                    'avg_belt_area': float(np.mean(area_history)) if area_history else 0.0,
                    'belt_found': belt_data.get('belt_found', False)
                }

                annotated_frame = self.utils.draw_enhanced_visualizations(frame, belt_data, metrics)
                _, buffer = cv2.imencode('.jpg', annotated_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
                frame_base64 = base64.b64encode(buffer).decode('utf-8')

                progress = int((frame_no / total_frames) * 100) if total_frames else 0

                with self.job_lock:
                    replay_buffer = self.replay_buffers[job_id]
                    if len(replay_buffer['frames']) < 300:
                        replay_buffer['frames'].append(frame_base64)
                        replay_buffer['timestamps'].append(float(current_time))
                        replay_buffer['speeds'].append(speed_kmh)
                        replay_buffer['alignments'].append(int(belt_data.get('alignment_deviation', 0)))

                # Send via WebSocket
                try:
                    async_to_sync(channel_layer.group_send)("frame_progress", {
                        "type": "progress_message",
                        "frame": frame_no,
                        "progress": progress,
                        "belt_metrics": self._prepare_serializable_metrics(metrics),
                        "frame_image": frame_base64,
                        "fps": float(self.jobs[job_id].get('fps', 0)),
                        "is_final": False
                    })
                except Exception as e:
                    logger.error(f"WebSocket send error: {e}")

                prev_frame_gray = frame_gray.copy()
                prev_belt_data = belt_data
                prev_time = time.time()

            cap.release()
            with self.job_lock:
                self.jobs[job_id]['is_running'] = False

            ProcessingJob.objects.filter(job_id=job_id).update(status="completed", progress=100)

        except Exception as e:
            logger.exception(f"Error processing video {video_path}: {e}")
            ProcessingJob.objects.filter(job_id=job_id).update(status="error", progress=0)
            try:
                async_to_sync(channel_layer.group_send)("frame_progress", {"type": "error_message", "error": str(e)})
            except:
                pass


# Singleton instance
processor = BeltProcessor()
