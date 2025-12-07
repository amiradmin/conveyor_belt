# vision/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import os
import glob
import time
import json
import logging
from .services.belt_processor import processor
from .models import ProcessingJob

logger = logging.getLogger(__name__)


class AvailableVideos(APIView):
    def get(self, request):
        """Get list of available videos"""
        try:
            media_dir = settings.MEDIA_ROOT
            video_extensions = ["*.mp4", "*.avi", "*.mov", "*.mkv", "*.MP4", "*.AVI", "*.MOV", "*.MKV"]

            videos = []
            for ext in video_extensions:
                # Search in media directory and subdirectories
                pattern = os.path.join(media_dir, "**", ext)
                for video_path in glob.glob(pattern, recursive=True):
                    if os.path.isfile(video_path):
                        rel_path = os.path.relpath(video_path, media_dir)
                        file_size = os.path.getsize(video_path)

                        videos.append({
                            "path": rel_path,
                            "full_path": video_path,
                            "filename": os.path.basename(video_path),
                            "size_bytes": file_size,
                            "size_mb": f"{file_size / (1024 * 1024):.2f} MB",
                            "extension": os.path.splitext(video_path)[1].lower()
                        })

            # Sort by filename
            videos.sort(key=lambda x: x['filename'])

            return Response({
                "status": "success",
                "count": len(videos),
                "available_videos": videos
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

            # Check if video exists
            if not os.path.isabs(video_path):
                # Try relative path from media directory
                full_path = os.path.join(settings.MEDIA_ROOT, video_path)
            else:
                full_path = video_path

            # Try multiple locations
            possible_paths = [
                full_path,
                video_path,
                os.path.join(settings.BASE_DIR, video_path),
                os.path.join(settings.MEDIA_ROOT, os.path.basename(video_path))
            ]

            actual_path = None
            for path in possible_paths:
                if os.path.exists(path) and os.path.isfile(path):
                    actual_path = path
                    break

            if not actual_path:
                return Response({
                    "status": "error",
                    "error": f"Video file not found: {video_path}",
                    "searched_paths": possible_paths
                }, status=status.HTTP_404_NOT_FOUND)

            # Generate unique job ID
            timestamp = int(time.time())
            job_id = f"belt_{timestamp}_{camera_id}"

            logger.info(f"Starting processing job {job_id} for video: {actual_path}")

            # Start the processing job
            job = processor.start_job(job_id, actual_path, camera_id)

            return Response({
                "status": "success",
                "message": "Video processing started successfully",
                "job_id": job_id,
                "video_path": actual_path,
                "camera_id": camera_id,
                "start_time": time.strftime("%Y-%m-%d %H:%M:%S"),
                "details": {
                    "video_file": os.path.basename(actual_path),
                    "job_status_url": f"/api/vision/status/{job_id}/",
                    "websocket_url": "ws://localhost:8000/ws/vision/progress/"
                }
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
            status_data = processor.get_job_status(job_id)

            if 'error' in status_data:
                return Response({
                    "status": "error",
                    **status_data
                }, status=status.HTTP_404_NOT_FOUND)

            return Response({
                "status": "success",
                **status_data
            })

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
        """List all processing jobs from database"""
        try:
            jobs = ProcessingJob.objects.all().order_by('-created_at')

            job_list = []
            for job in jobs:
                job_list.append({
                    "job_id": job.job_id,
                    "status": job.status,
                    "progress": job.progress,
                    "video": job.video.filename if job.video else "Unknown",
                    "video_path": job.video.path if job.video else None,
                    "camera_id": job.camera_id,
                    "created_at": job.created_at,
                    "updated_at": job.updated_at,
                    "result": job.result
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


class ActiveJobs(APIView):
    def get(self, request):
        """List currently active processing jobs"""
        try:
            active_jobs = processor.list_active_jobs()

            return Response({
                "status": "success",
                "active_jobs": active_jobs,
                "count": len(active_jobs)
            })

        except Exception as e:
            logger.error(f"Error listing active jobs: {e}")
            return Response({
                "status": "error",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GetReplayFrames(APIView):
    def post(self, request):
        """Get replay frames from a completed job"""
        try:
            job_id = request.data.get("job_id")
            start_frame = request.data.get("start_frame", 0)
            end_frame = request.data.get("end_frame")

            if not job_id:
                return Response({
                    "status": "error",
                    "error": "job_id is required"
                }, status=status.HTTP_400_BAD_REQUEST)

            replay_data = processor.get_replay_frames(job_id, start_frame, end_frame)

            return Response({
                "status": "success",
                "job_id": job_id,
                **replay_data
            })

        except Exception as e:
            logger.error(f"Error getting replay frames: {e}")
            return Response({
                "status": "error",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SystemInfo(APIView):
    def get(self, request):
        """Get system information and status"""
        try:
            # Get some basic system info
            import psutil
            import platform

            system_info = {
                "python_version": platform.python_version(),
                "platform": platform.platform(),
                "processor": platform.processor(),
                "cpu_count": psutil.cpu_count(),
                "cpu_percent": psutil.cpu_percent(),
                "memory_total": psutil.virtual_memory().total,
                "memory_available": psutil.virtual_memory().available,
                "memory_percent": psutil.virtual_memory().percent,
                "disk_usage": psutil.disk_usage('/').percent,
                "media_directory": settings.MEDIA_ROOT,
                "base_directory": settings.BASE_DIR,
            }

            return Response({
                "status": "success",
                "system_info": system_info
            })

        except Exception as e:
            logger.error(f"Error getting system info: {e}")
            return Response({
                "status": "error",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)