# vision/services/belt_detection.py
import cv2
import numpy as np
import logging

logger = logging.getLogger(__name__)

def detect_belt_with_details(frame):
    """Enhanced conveyor belt detection with aggressive thresholds, fully fixed for shape alignment."""
    try:
        height, width = frame.shape[:2]
        frame_center = width // 2

        # --- Crop the ROI ---
        y1_crop = int(height * 0.15)
        y2_crop = int(height * 0.9)
        x1_crop = int(width * 0.15)
        x2_crop = int(width * 0.85)
        frame_cropped = frame[y1_crop:y2_crop, x1_crop:x2_crop]

        # --- Preprocessing: grayscale, HSV, LAB ---
        gray = cv2.cvtColor(frame_cropped, cv2.COLOR_BGR2GRAY)
        equalized = cv2.equalizeHist(gray)
        hsv = cv2.cvtColor(frame_cropped, cv2.COLOR_BGR2HSV)
        _, s, _ = cv2.split(hsv)
        saturation = s.astype(np.uint8)
        lab = cv2.cvtColor(frame_cropped, cv2.COLOR_BGR2LAB)
        lightness = lab[:, :, 0]

        # --- Combine channels ---
        combined = cv2.addWeighted(equalized, 0.5, saturation, 0.3, 0)
        combined = cv2.addWeighted(combined, 0.7, lightness, 0.3, 0)
        blurred = cv2.GaussianBlur(combined, (5, 5), 1)

        # --- Edge detection ---
        sigma = 0.15
        v_median = np.median(blurred)
        lower = int(max(0, (1.0 - 3 * sigma) * v_median))
        upper = int(min(255, (1.0 + 2 * sigma) * v_median))
        edges_canny = cv2.Canny(blurred, lower, upper, apertureSize=3, L2gradient=True)
        sobel_x = cv2.Sobel(blurred, cv2.CV_64F, 1, 0, ksize=3)
        sobel_y = cv2.Sobel(blurred, cv2.CV_64F, 0, 1, ksize=3)
        sobel_edges = cv2.magnitude(sobel_x, sobel_y)
        sobel_edges = np.uint8(np.clip(sobel_edges, 0, 255))
        _, sobel_edges = cv2.threshold(sobel_edges, 30, 255, cv2.THRESH_BINARY)
        edges_combined = cv2.bitwise_or(edges_canny, sobel_edges)

        # --- Morphological ops ---
        kernel_dilate = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
        kernel_close = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
        edges_dilated = cv2.dilate(edges_combined, kernel_dilate, iterations=2)
        edges_closed = cv2.morphologyEx(edges_dilated, cv2.MORPH_CLOSE, kernel_close, iterations=2)

        # --- Contours ---
        contours, _ = cv2.findContours(edges_closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            logger.warning("No contours found, using Otsu fallback")
            _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if not contours:
                return None  # or empty belt data

        # --- Filter contours ---
        belt_contours = []
        min_area = frame_cropped.shape[0] * frame_cropped.shape[1] * 0.005
        max_area = frame_cropped.shape[0] * frame_cropped.shape[1] * 0.9

        for contour in contours:
            area = cv2.contourArea(contour)
            if area < min_area or area > max_area:
                continue
            x, y, w, h = cv2.boundingRect(contour)
            aspect_ratio = float(w) / h if h > 0 else 0
            if w > 50 and h > 20 and 0.8 < aspect_ratio < 50.0:
                belt_contours.append(contour)

        if not belt_contours:
            belt_contours = [max(contours, key=cv2.contourArea)]

        best_contour = belt_contours[0]

        # --- Mask & edge points ---
        belt_mask = np.zeros(frame_cropped.shape[:2], dtype=np.uint8)
        cv2.drawContours(belt_mask, [best_contour], -1, 255, -1)
        edge_points_in_belt = np.sum((edges_canny > 0) & (belt_mask > 0))

        return {
            'contour': best_contour,
            'belt_mask': belt_mask,
            'edge_points': edge_points_in_belt,
            'edges_canny': edges_canny
        }

    except Exception as e:
        logger.error(f"Error in belt detection: {e}", exc_info=True)
        return None
