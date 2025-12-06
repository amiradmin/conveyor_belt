import cv2
import time
import logging
from datetime import datetime
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from vision.models import ProcessingJob, Detection, VideoFile
import numpy as np

logger = logging.getLogger(__name__)

class BeltProcessor:
    def __init__(self):
        self.jobs = {}

    def start_job(self, job_id, video_path, camera_id="default"):
        # Create DB job entry
        video_obj, _ = VideoFile.objects.get_or_create(path=video_path)
        job = ProcessingJob.objects.create(
            job_id=job_id, video=video_obj, camera_id=camera_id, status="processing"
        )
        self.jobs[job_id] = job.id

        # Launch background thread
        import threading
        t = threading.Thread(target=self._run, args=(job_id, video_path, camera_id))
        t.daemon = True
        t.start()
        return job

    def _run(self, job_id, video_path, camera_id):
        channel_layer = get_channel_layer()
        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise RuntimeError("Could not open video")

            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
            frame_no = 0
            processed = 0

            # optional: warm up YOLO or any model here
            # e.g. model = YOLO(settings.YOLO_WEIGHTS_PATH)
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                frame_no += 1

                # Process every Nth frame to reduce load
                if frame_no % 10 != 0:
                    continue
                processed += 1

                # Simple contour detection example (replace with your detection)
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                blur = cv2.GaussianBlur(gray, (5,5), 0)
                edges = cv2.Canny(blur, 50, 150)
                contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                object_count = 0
                last_bbox = None
                for cnt in contours:
                    area = cv2.contourArea(cnt)
                    if area < 100:
                        continue
                    x,y,w,h = cv2.boundingRect(cnt)
                    object_count += 1
                    bbox = [int(x),int(y),int(x+w),int(y+h)]
                    # save detection row
                    job_db_id = self.jobs.get(job_id)
                    if job_db_id:
                        Detection.objects.create(
                            job_id=job_db_id,
                            frame_number=frame_no,
                            bbox=bbox,
                            label="object",
                            confidence=0.5
                        )
                    last_bbox = bbox

                progress = int((frame_no / total_frames) * 100)
                # update DB job
                ProcessingJob.objects.filter(job_id=job_id).update(progress=progress)

                # send websocket message to frame_progress group
                try:
                    async_to_sync(channel_layer.group_send)(
                        "frame_progress",
                        {
                            "type": "progress_message",
                            "frame": frame_no,
                            "object_count": object_count,
                            "progress": progress,
                            "is_final": False
                        }
                    )
                except Exception:
                    logger.exception("WS send failed")

                time.sleep(0.01)

            cap.release()

            # finalize job
            stats = {
                "frames_processed": processed,
                "total_frames": total_frames
            }
            ProcessingJob.objects.filter(job_id=job_id).update(status="completed", result=stats, progress=100)
            async_to_sync(channel_layer.group_send)(
                "frame_progress",
                {
                    "type": "progress_message",
                    "frame": frame_no,
                    "object_count": object_count if 'object_count' in locals() else 0,
                    "progress": 100,
                    "is_final": True
                }
            )

        except Exception as e:
            logger.exception("Processing job failed")
            ProcessingJob.objects.filter(job_id=job_id).update(status="error", result={"error": str(e)})
            try:
                async_to_sync(channel_layer.group_send)(
                    "frame_progress",
                    {"type":"error_message", "error": str(e)}
                )
            except Exception:
                logger.exception("WS error send failed")
