from rest_framework.views import APIView
from rest_framework.response import Response
import cv2
import base64
import os
import numpy as np

class ProcessVideoFile(APIView):
    def post(self, request):
        """
        دریافت مسیر فایل و پردازش فریم‌ها با کانتورها و ماسک نوار نقاله
        فقط هر ۵امین فریم پردازش می‌شود
        """
        video_path = request.data.get("video_path")
        if not video_path or not os.path.exists(video_path):
            return Response({"error": "Video file not found"}, status=400)

        cap = cv2.VideoCapture(video_path)
        processed_frames = []
        frame_count = 0
        processed_count = 0  # شمارنده فریم‌های پردازش شده

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame_count += 1

            # فقط هر ۵امین فریم را پردازش کنیم
            if processed_count % 5 != 0:
                processed_count += 1  # همچنان افزایش بدهیم تا شمارش درست باشد
                continue

            # تبدیل به خاکستری و Gaussian blur
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            blur = cv2.GaussianBlur(gray, (5,5), 0)

            # ماسک نوار نقاله
            mask = np.zeros_like(blur)
            h, w = blur.shape
            cv2.rectangle(mask, (50, int(h*0.3)), (w-50, int(h*0.7)), 255, -1)
            masked = cv2.bitwise_and(blur, blur, mask=mask)

            # آستانه گذاری و Canny
            _, thresh = cv2.threshold(masked, 50, 255, cv2.THRESH_BINARY)
            edges = cv2.Canny(thresh, 50, 150)

            # کانتورها
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            frame_copy = frame.copy()
            cv2.drawContours(frame_copy, contours, -1, (0, 255, 0), 2)

            # کاهش رزولوشن
            small = cv2.resize(frame_copy, (320, 240))

            # encode به base64
            _, buffer = cv2.imencode(".jpg", small)
            img_base64 = base64.b64encode(buffer).decode("utf-8")
            processed_frames.append(img_base64)
            processed_count += 1

        cap.release()

        return Response({
            "original_video_url": f"http://localhost:8000/media/{os.path.basename(video_path)}",
            "total_frames": frame_count,
            "processed_frames_count": processed_count,
            "frames": processed_frames,
        })
