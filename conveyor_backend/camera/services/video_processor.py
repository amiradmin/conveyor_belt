# camera/services/video_processor.py
import cv2
import threading
import time
import json
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class VideoProcessor:
    def __init__(self):
        self.processing = False
        self.current_job = None
        self.progress = 0
        self.results = {}
        self.jobs = {}

    def process_video_async(self, video_path, camera_id="default", callback=None):
        """Start video processing in background thread"""
        job_id = f"job_{int(time.time())}_{camera_id}"

        self.jobs[job_id] = {
            'video_path': video_path,
            'camera_id': camera_id,
            'status': 'processing',
            'progress': 0,
            'start_time': datetime.now().isoformat(),
            'results': None,
            'callback': callback
        }

        # Start processing in background thread
        thread = threading.Thread(
            target=self._process_video,
            args=(job_id, video_path, camera_id, callback)
        )
        thread.daemon = True
        thread.start()

        return {
            'job_id': job_id,
            'status': 'started',
            'message': f'Processing started for {video_path}'
        }

    def _process_video(self, job_id, video_path, camera_id, callback):
        """Background video processing"""
        try:
            logger.info(f"Starting video processing for job {job_id}")

            # Open video
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                self.jobs[job_id]['status'] = 'error'
                self.jobs[job_id]['error'] = 'Could not open video file'
                if callback:
                    callback({'error': 'Could not open video file'})
                return

            # Get video properties
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

            logger.info(f"Video info: {total_frames} frames, {fps} fps, {width}x{height}")

            analysis_results = {
                'job_id': job_id,
                'camera_id': camera_id,
                'video_path': video_path,
                'total_frames': total_frames,
                'fps': fps,
                'resolution': f"{width}x{height}",
                'frames_processed': 0,
                'object_counts': [],
                'detections': [],
                'start_time': datetime.now().isoformat(),
                'processing_type': 'full_video_analysis'
            }

            frame_count = 0
            processed_frames = 0

            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                frame_count += 1

                # Process every 10th frame for speed
                if frame_count % 10 == 0:
                    processed_frames += 1

                    # Simple object detection (replace with your actual processing)
                    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                    blur = cv2.GaussianBlur(gray, (5, 5), 0)
                    edges = cv2.Canny(blur, 50, 150)
                    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

                    object_count = len([cnt for cnt in contours if cv2.contourArea(cnt) > 100])
                    analysis_results['object_counts'].append({
                        'frame': frame_count,
                        'count': object_count
                    })

                    # Update progress
                    progress = int((frame_count / total_frames) * 100)
                    self.jobs[job_id]['progress'] = progress
                    self.jobs[job_id]['frames_processed'] = processed_frames

                    # Simulate processing delay
                    time.sleep(0.01)

            cap.release()

            # Calculate summary statistics
            if analysis_results['object_counts']:
                counts = [item['count'] for item in analysis_results['object_counts']]
                analysis_results['average_objects'] = sum(counts) / len(counts)
                analysis_results['max_objects'] = max(counts)
                analysis_results['min_objects'] = min(counts)

            analysis_results['frames_processed'] = processed_frames
            analysis_results['end_time'] = datetime.now().isoformat()
            analysis_results['status'] = 'completed'

            # Save results
            self.jobs[job_id]['status'] = 'completed'
            self.jobs[job_id]['progress'] = 100
            self.jobs[job_id]['results'] = analysis_results
            self.jobs[job_id]['end_time'] = analysis_results['end_time']

            logger.info(f"Video processing completed for job {job_id}")

            # Call callback if provided
            if callback:
                callback(analysis_results)

        except Exception as e:
            logger.error(f"Error processing video {video_path}: {str(e)}")
            self.jobs[job_id]['status'] = 'error'
            self.jobs[job_id]['error'] = str(e)
            if callback:
                callback({'error': str(e)})

    def get_status(self):
        """Get overall processing status"""
        active_jobs = {k: v for k, v in self.jobs.items() if v['status'] == 'processing'}
        completed_jobs = {k: v for k, v in self.jobs.items() if v['status'] == 'completed'}
        error_jobs = {k: v for k, v in self.jobs.items() if v['status'] == 'error'}

        return {
            'active_jobs': len(active_jobs),
            'completed_jobs': len(completed_jobs),
            'error_jobs': len(error_jobs),
            'total_jobs': len(self.jobs),
            'jobs': list(self.jobs.keys())
        }

    def get_job_status(self, job_id):
        """Get status of specific job"""
        if job_id in self.jobs:
            return self.jobs[job_id]
        return {'error': 'Job not found'}

    def stop_processing(self, job_id=None):
        """Stop processing"""
        if job_id and job_id in self.jobs:
            self.jobs[job_id]['status'] = 'stopped'
            return True
        elif job_id is None:
            for jid in self.jobs:
                self.jobs[jid]['status'] = 'stopped'
            return True
        return False


# Global instance
video_processor = VideoProcessor()