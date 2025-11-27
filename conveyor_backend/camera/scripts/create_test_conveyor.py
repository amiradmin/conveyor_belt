import cv2
import numpy as np
import os

# Directory to save video (user home)
home_dir = os.path.expanduser("~")
video_path = os.path.join(home_dir, "Videos", "synthetic_conveyor.avi")

# Make sure the folder exists
os.makedirs(os.path.dirname(video_path), exist_ok=True)

# Video parameters
width, height = 640, 480
fps = 30
duration_sec = 30
total_frames = fps * duration_sec

# Video writer
fourcc = cv2.VideoWriter_fourcc(*'XVID')
out = cv2.VideoWriter(video_path, fourcc, fps, (width, height))

# Generate synthetic frames (replace this with your AI-generated frames)
for i in range(total_frames):
    # Example: gray background + moving white rectangle to simulate conveyor
    frame = np.zeros((height, width, 3), dtype=np.uint8)
    x_pos = int((i / total_frames) * width)
    cv2.rectangle(frame, (x_pos, 200), (x_pos + 50, 300), (255, 255, 255), -1)
    out.write(frame)

out.release()
print(f"Video saved to {video_path}")
