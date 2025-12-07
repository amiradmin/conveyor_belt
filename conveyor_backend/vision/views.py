# vision/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import os, glob, time, json
from .services.belt_processor import BeltProcessor
from .models import ProcessingJob

processor = BeltProcessor()


class AvailableVideos(APIView):
    def get(self, request):
        media = settings.MEDIA_ROOT
        exts = ["*.mp4", "*.avi", "*.mov", "*.mkv"]
        videos = []
        for e in exts:
            for path in glob.glob(os.path.join(media, e)):
                videos.append({
                    "path": os.path.relpath(path, media),
                    "full_path": path,
                    "size": os.path.getsize(path),
                    "filename": os.path.basename(path)
                })
        return Response({"available_videos": videos})


class StartProcessing(APIView):
    def post(self, request):
        video_path = request.data.get("video_path")
        camera_id = request.data.get("camera_id", "default")

        if not video_path:
            return Response({"error": "video_path required"}, status=status.HTTP_400_BAD_REQUEST)

        # Find full path
        candidates = [
            os.path.join(settings.MEDIA_ROOT, video_path),
            video_path
        ]
        actual = None
        for c in candidates:
            if os.path.exists(c):
                actual = c
                break
        if not actual:
            return Response({"error": "file not found", "video_path": video_path}, status=400)

        job_id = f"job_{int(time.time())}_{camera_id}"
        job = processor.start_job(job_id, actual, camera_id=camera_id)

        return Response({
            "status": "started",
            "job_id": job_id,
            "video_path": actual,
            "message": f"Processing started with job ID: {job_id}"
        })


class JobStatus(APIView):
    def get(self, request, job_id):
        try:
            job = ProcessingJob.objects.get(job_id=job_id)
            return Response({
                "job_id": job.job_id,
                "status": job.status,
                "progress": job.progress,
                "result": job.result,
                "started_at": job.created_at,
                "completed_at": job.updated_at if job.status == "completed" else None
            })
        except ProcessingJob.DoesNotExist:
            return Response({"error": "job not found"}, status=404)


class GetReplayFrames(APIView):
    def post(self, request):
        job_id = request.data.get("job_id")
        start_frame = request.data.get("start_frame", 0)
        end_frame = request.data.get("end_frame")

        if not job_id:
            return Response({"error": "job_id required"}, status=400)

        frames_data = processor.get_replay_frames(job_id, start_frame, end_frame)

        return Response({
            "job_id": job_id,
            "frame_count": len(frames_data['frames']),
            "frames": frames_data['frames'],
            "timestamps": frames_data['timestamps'],
            "speeds": frames_data['speeds'],
            "alignments": frames_data['alignments']
        })


class GetJobStats(APIView):
    def get(self, request, job_id):
        try:
            job = ProcessingJob.objects.get(job_id=job_id)

            # Get all detections for this job
            detections = job.detections.all()

            stats = {
                "job_id": job.job_id,
                "status": job.status,
                "total_frames_processed": job.result.get("frames_processed", 0) if job.result else 0,
                "total_objects_detected": detections.count(),
                "average_speed": job.result.get("avg_speed", 0) if job.result else 0,
                "max_speed": job.result.get("max_speed", 0) if job.result else 0,
                "min_speed": job.result.get("min_speed", 0) if job.result else 0,
                "processing_time": (
                            job.updated_at - job.created_at).total_seconds() if job.status == "completed" else None,
                "object_size_distribution": {
                    "small": detections.filter(object_area__lt=500).count(),
                    "medium": detections.filter(object_area__gte=500, object_area__lt=2000).count(),
                    "large": detections.filter(object_area__gte=2000).count()
                }
            }

            return Response(stats)
        except ProcessingJob.DoesNotExist:
            return Response({"error": "job not found"}, status=404)