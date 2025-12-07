# vision/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import os, glob, time, json
from .services.belt_processor import BeltProcessor
from .models import ProcessingJob
import logging

logger = logging.getLogger(__name__)

# Create a single instance of BeltProcessor
processor = BeltProcessor()


class AvailableVideos(APIView):
    def get(self, request):
        """Get list of available videos in media directory"""
        try:
            media_dir = settings.MEDIA_ROOT
            exts = ["*.mp4", "*.avi", "*.mov", "*.mkv", "*.MP4", "*.AVI"]
            videos = []

            for ext in exts:
                pattern = os.path.join(media_dir, "**", ext)
                for path in glob.glob(pattern, recursive=True):
                    rel_path = os.path.relpath(path, media_dir)
                    videos.append({
                        "path": rel_path,
                        "full_path": path,
                        "filename": os.path.basename(path),
                        "size": os.path.getsize(path) if os.path.exists(path) else 0,
                        "size_mb": f"{os.path.getsize(path) / (1024 * 1024):.2f} MB" if os.path.exists(path) else "0 MB"
                    })

            return Response({
                "status": "success",
                "available_videos": videos,
                "count": len(videos)
            })

        except Exception as e:
            logger.error(f"Error listing videos: {e}")
            return Response({
                "status": "error",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class StartProcessing(APIView):
    def post(self, request):
        """Start processing a video"""
        try:
            video_path = request.data.get("video_path")
            camera_id = request.data.get("camera_id", "default")

            if not video_path:
                return Response({
                    "status": "error",
                    "error": "video_path is required"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Find the actual file path
            actual_path = None
            candidates = [
                os.path.join(settings.MEDIA_ROOT, video_path),
                video_path,
                os.path.join(settings.BASE_DIR, video_path)
            ]

            for candidate in candidates:
                if os.path.exists(candidate):
                    actual_path = candidate
                    break

            if not actual_path:
                return Response({
                    "status": "error",
                    "error": f"Video file not found: {video_path}",
                    "searched_paths": candidates
                }, status=status.HTTP_404_NOT_FOUND)

            # Generate unique job ID
            job_id = f"belt_job_{int(time.time())}_{camera_id}"

            # Start the processing job
            job = processor.start_job(job_id, actual_path, camera_id)

            return Response({
                "status": "success",
                "message": "Processing started successfully",
                "job_id": job_id,
                "video_path": actual_path,
                "camera_id": camera_id,
                "start_time": time.strftime("%Y-%m-%d %H:%M:%S")
            })

        except Exception as e:
            logger.error(f"Error starting processing: {e}")
            return Response({
                "status": "error",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class JobStatus(APIView):
    def get(self, request, job_id):
        """Get status of a processing job"""
        try:
            # Try to get from database first
            try:
                job = ProcessingJob.objects.get(job_id=job_id)
                response_data = {
                    "job_id": job.job_id,
                    "status": job.status,
                    "progress": job.progress,
                    "result": job.result,
                    "created_at": job.created_at,
                    "updated_at": job.updated_at,
                    "video": job.video.path if job.video else None
                }

                # Add additional metrics from processor if available
                processor_status = processor.get_job_status(job_id)
                if 'error' not in processor_status:
                    response_data.update(processor_status)

                return Response(response_data)

            except ProcessingJob.DoesNotExist:
                # Check if job exists in processor
                processor_status = processor.get_job_status(job_id)
                if 'error' not in processor_status:
                    return Response(processor_status)
                else:
                    return Response({
                        "status": "error",
                        "error": "Job not found"
                    }, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            logger.error(f"Error getting job status: {e}")
            return Response({
                "status": "error",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class StopProcessing(APIView):
    def post(self, request):
        """Stop a processing job"""
        try:
            job_id = request.data.get("job_id")

            if not job_id:
                return Response({
                    "status": "error",
                    "error": "job_id is required"
                }, status=status.HTTP_400_BAD_REQUEST)

            stopped = processor.stop_job(job_id)

            if stopped:
                return Response({
                    "status": "success",
                    "message": f"Job {job_id} stopped successfully"
                })
            else:
                return Response({
                    "status": "error",
                    "error": f"Job {job_id} not found or already stopped"
                }, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            logger.error(f"Error stopping job: {e}")
            return Response({
                "status": "error",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ListJobs(APIView):
    def get(self, request):
        """List all processing jobs"""
        try:
            jobs = ProcessingJob.objects.all().order_by('-created_at')

            job_list = []
            for job in jobs:
                job_list.append({
                    "job_id": job.job_id,
                    "status": job.status,
                    "progress": job.progress,
                    "video": job.video.path if job.video else None,
                    "created_at": job.created_at,
                    "updated_at": job.updated_at
                })

            return Response({
                "status": "success",
                "jobs": job_list,
                "count": len(job_list)
            })

        except Exception as e:
            logger.error(f"Error listing jobs: {e}")
            return Response({
                "status": "error",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GetMetrics(APIView):
    def get(self, request, job_id):
        """Get detailed metrics for a job"""
        try:
            # Get job from database
            job = ProcessingJob.objects.get(job_id=job_id)

            # Get all detections for this job
            detections = job.detections.all()

            # Calculate metrics
            metrics = {
                "job_id": job_id,
                "status": job.status,
                "progress": job.progress,
                "video": job.video.path if job.video else None,

                "processing_stats": job.result or {},

                "detection_stats": {
                    "total_detections": detections.count(),
                    "by_label": {},
                    "frame_coverage": {}
                },

                "timestamps": {
                    "created": job.created_at,
                    "updated": job.updated_at,
                    "duration": (
                                job.updated_at - job.created_at).total_seconds() if job.updated_at and job.created_at else None
                }
            }

            # Calculate label distribution
            for detection in detections:
                label = detection.label
                if label not in metrics["detection_stats"]["by_label"]:
                    metrics["detection_stats"]["by_label"][label] = 0
                metrics["detection_stats"]["by_label"][label] += 1

            return Response(metrics)

        except ProcessingJob.DoesNotExist:
            return Response({
                "status": "error",
                "error": "Job not found"
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error getting metrics: {e}")
            return Response({
                "status": "error",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)