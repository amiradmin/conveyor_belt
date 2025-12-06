from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import os, glob, time
from .services.belt_processor import BeltProcessor
from .models import ProcessingJob

processor = BeltProcessor()

class AvailableVideos(APIView):
    def get(self, request):
        media = settings.MEDIA_ROOT
        exts = ["*.mp4","*.avi","*.mov","*.mkv"]
        videos = []
        for e in exts:
            for path in glob.glob(os.path.join(media, e)):
                videos.append({
                    "path": os.path.relpath(path, media),
                    "full_path": path,
                    "size": os.path.getsize(path)
                })
        return Response({"available_videos": videos})

class StartProcessing(APIView):
    def post(self, request):
        video_path = request.data.get("video_path")
        camera_id = request.data.get("camera_id", "default")
        if not video_path:
            return Response({"error":"video_path required"}, status=status.HTTP_400_BAD_REQUEST)

        # find full path
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
            return Response({"error":"file not found", "video_path": video_path}, status=400)

        job_id = f"job_{int(time.time())}_{camera_id}"
        job = processor.start_job(job_id, actual, camera_id=camera_id)
        return Response({"status":"started", "job_id": job_id, "video_path": actual})

class JobStatus(APIView):
    def get(self, request, job_id):
        try:
            job = ProcessingJob.objects.get(job_id=job_id)
            return Response({
                "job_id": job.job_id,
                "status": job.status,
                "progress": job.progress,
                "result": job.result
            })
        except ProcessingJob.DoesNotExist:
            return Response({"error":"job not found"}, status=404)
