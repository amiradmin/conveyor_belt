# conveyor_belt
# Conveyor Belt Vision Sensor Replacement System

A computer-vision based system designed to **replace damaged physical sensors** on a **metal factory conveyor belt** using **live camera analysis**, **OpenCV**, and **real‑time event detection**. The solution is robust against harsh industrial environments where physical sensors frequently fail.

---

## 📌 Overview

Metal factories often face repeated sensor failures due to:

* Heat
* Dust and particles
* Metal fragments
* Vibration

This project replaces those physical sensors by using **image processing**, providing:

* Object detection on conveyor belt
* Counting items
* Detecting belt stoppage or jamming
* Detecting abnormal movement
* Detecting belt misalignment
* Real‑time monitoring using live camera feed

The system is intended for **industrial use**, especially in environments where sensor replacement is expensive or unsafe.

---

## 🚀 Features

### ✔ Real‑time Camera Feed Processing

Captures and processes frames using OpenCV.

### ✔ Virtual Sensor Functions

* Presence detection (replaces proximity/inductive sensors)
* Counting objects (replaces counter sensors)
* Motion detection (replaces speed sensors)
* Stoppage detection (jam/fault)
* Belt misalignment detection

### ✔ Modular Computer Vision Pipeline

* Preprocessing (grayscale, blur, noise removal)
* Edge detection
* Background subtraction
* Optical flow analysis
* Contour detection

### ✔ Industrial Integration

* Can be connected to PLCs (e.g., via Modbus/TCP)
* Real‑time dashboard can be added
* Alerts/alarms for anomalies

---

## 📂 Project Structure

```
project-root/
├── main.py                 # Main application loop
├── camera/                 # Camera capture utilities
│   └── video_stream.py
├── processing/             # Image processing modules
│   ├── preprocessing.py
│   ├── object_detection.py
│   ├── motion_detection.py
│   ├── misalignment.py
│   └── utils.py
├── sensors/                # Virtual sensor implementations
│   ├── presence_sensor.py
│   ├── counter_sensor.py
│   ├── stoppage_sensor.py
│   └── overload_sensor.py
├── requirements.txt        # Dependencies
└── README.md               # Documentation
```

---

## 🔧 Requirements

Install required packages:

```bash
pip install -r requirements.txt
```

Or manually:

```bash
pip install opencv-python numpy imutils
```

---

## ▶️ Running the Application

Execute:

```bash
python main.py
```

Press **Q** to exit camera view.

---

## 📸 Basic Example (Live Camera Stream)

```python
import cv2

cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    cv2.imshow("Conveyor Vision", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
```

---

## 🧠 Core Algorithms Used

### 🔹 Preprocessing

* Grayscale
* Gaussian Blur
* Noise removal

### 🔹 Object Detection

* Thresholding
* Contours
* Region of Interest (ROI)

### 🔹 Motion Detection & Stoppage

* Optical Flow
* Frame differencing

### 🔹 Belt Misalignment Detection

* Canny edges
* Hough line transform
* Tracking side‑edges of the belt

---

## 🏭 Industrial Use Cases

* Metal part detection
* Monitoring conveyor belt health
* Counting manufactured components
* Detecting jams before equipment damage
* Replacing proximity, speed, and IR sensors

---

## 🧪 Testing & Calibration

Before deployment:

1. Test with different lighting conditions
2. Adjust camera angle and height
3. Tune threshold values in preprocessing
4. Validate against existing sensor readings

---

## 📡 Optional Integrations

* Modbus/TCP communication with PLC
* Django/React dashboard
* Cloud-based monitoring & analytics

---

## 🤝 Contributing

Pull requests and improvements are welcome.

---

## 📜 License

MIT License.
