from rest_framework.views import APIView
from rest_framework.response import Response
import cv2
import base64
import os

class ProcessVideoFile(APIView):
    def post(self, request):
        """
        دریافت مسیر فایل و پردازش فریم‌ها با نمایش تعداد فریم‌ها
        """
        video_path = request.data.get("video_path")
        if not video_path or not os.path.exists(video_path):
            return Response({"error": "Video file not found"}, status=400)

        cap = cv2.VideoCapture(video_path)
        processed_frames = []
        frame_count = 0
        selected_count = 0  # تعداد فریم‌های پردازش شده

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame_count += 1

            # فقط هر ۵امین فریم را پردازش کن
            if frame_count % 5 != 0:
                continue

            # پردازش ساده: خاکستری + کاهش رزولوشن
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            small = cv2.resize(gray, (320, 240))

            # encode فریم به base64
            _, buffer = cv2.imencode(".jpg", small)
            img_base64 = base64.b64encode(buffer).decode("utf-8")
            processed_frames.append(img_base64)
            selected_count += 1

        cap.release()
        return Response({
            "total_frames": frame_count,          # تعداد کل فریم‌ها در ویدیو
            "processed_frames_count": selected_count,  # تعداد فریم‌های پردازش شده
            "frames": processed_frames
        })
