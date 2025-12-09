# vision/services/belt_processor.py
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
from .belt_detector import BeltDetector
from .belt_utils import BeltUtils

logger = logging.getLogger(__name__)


class BeltProcessor:
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
        """Convert NumPy/Python types to JSON serializable types"""
        return self.utils.ensure_serializable(obj)

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
        """Main video processing thread with area detection and speed in km/h"""
        channel_layer = get_channel_layer()

        try:
            import cv2
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

                # FPS calculation
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

                belt_data = self.detector.detect_belt_with_details(frame)

                # Calculate speed in km/h
                if prev_frame is not None and prev_belt_data is not None and belt_data['belt_found']:
                    speed_m_per_s = self.utils.calculate_speed_fast(
                        prev_frame, frame, prev_belt_data, belt_data, target_fps
                    )
                    speed_kmh = float(speed_m_per_s) * 3.6
                else:
                    speed_kmh = 0.0

                if belt_data['belt_found']:
                    speed_history.append(speed_kmh)
                    alignment_history.append(float(abs(belt_data['alignment_deviation'])))
                    area_history.append(float(belt_data['belt_area_pixels']))

                    if len(speed_history) > 50:
                        speed_history = speed_history[-50:]
                    if len(alignment_history) > 50:
                        alignment_history = alignment_history[-50:]
                    if len(area_history) > 50:
                        area_history = area_history[-50:]

                avg_speed = float(np.mean(speed_history).item()) if speed_history else 0.0
                avg_alignment = float(np.mean(alignment_history).item()) if alignment_history else 0.0
                avg_area = float(np.mean(area_history).item()) if area_history else 0.0

                metrics = {
                    'speed': float(speed_kmh),
                    'avg_speed': float(avg_speed),
                    'alignment_deviation': int(belt_data['alignment_deviation']),
                    'avg_alignment': float(avg_alignment),
                    'vibration_amplitude': 0.2,
                    'vibration_frequency': 0.2,
                    'vibration_severity': "High",
                    'belt_width': float(belt_data['belt_width']),
                    'belt_height': float(belt_data['belt_height']),
                    'belt_found': bool(belt_data['belt_found']),
                    'frame_number': int(frame_no),
                    'belt_area_pixels': float(belt_data['belt_area_pixels']),
                    'belt_area_mm2': float(belt_data.get('belt_area_mm2')) if belt_data.get('belt_area_mm2') else None,
                    'avg_belt_area': float(avg_area),
                    'contour_points': int(belt_data.get('contour_points', 0)),
                    'edge_points': int(belt_data.get('edge_points', 0)),
                    'corner_points': int(belt_data.get('corner_points', 0)),
                    'convex_hull_area': float(belt_data.get('convex_hull_area', 0)),
                    'aspect_ratio': float(belt_data.get('aspect_ratio', 0)),
                    'solidity': float(belt_data.get('solidity', 0)),
                    'extent': float(belt_data.get('extent', 0))
                }

                # Draw frame with speed
                annotated_frame = self.utils.draw_enhanced_visualizations(frame, belt_data, metrics)

                _, buffer = cv2.imencode('.jpg', annotated_frame, [
                    int(cv2.IMWRITE_JPEG_QUALITY), 85
                ])
                frame_base64 = base64.b64encode(buffer).decode('utf-8')

                progress = int((frame_no / total_frames) * 100) if total_frames > 0 else 0

                # Update replay buffer
                with self.job_lock:
                    replay_buffer = self.replay_buffers[job_id]
                    if len(replay_buffer['frames']) < 300:
                        replay_buffer['frames'].append(frame_base64)
                        replay_buffer['timestamps'].append(float(current_time))
                        replay_buffer['speeds'].append(float(speed_kmh))
                        replay_buffer['alignments'].append(float(belt_data['alignment_deviation']))

                # Send progress via WebSocket
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

                # Update DB every 30 frames
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

            # Final stats and completion
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
                "belt_metrics": self._prepare_serializable_metrics(metrics),
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
            ProcessingJob.objects.filter(job_id=job_id).update(
                status="error",
                result={"error": str(e)},
                progress=0
            )
            try:
                async_to_sync(channel_layer.group_send)(
                    "frame_progress",
                    {"type": "error_message", "error": str(e)}
                )
            except Exception as ws_error:
                logger.error(f"WebSocket error: {ws_error}")

        finally:
            with self.job_lock:
                if job_id in self.jobs:
                    self.jobs[job_id]['is_running'] = False
                if job_id in self.processing_threads:
                    del self.processing_threads[job_id]

    def set_detection_parameters(self, parameters=None):
        """Set detection parameters for debugging"""
        return self.detector.set_detection_parameters(parameters)

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

    def tune_detection_for_video(self, video_path):
        """Helper method to find optimal parameters for a specific video"""
        return self.detector.tune_detection_for_video(video_path)


# Create global instance
processor = BeltProcessor()