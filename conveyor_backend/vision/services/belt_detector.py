# vision/services/belt_detector.py
import cv2
import numpy as np
import logging

logger = logging.getLogger(__name__)


class BeltDetector:
    def __init__(self):
        self.detection_params = self._get_default_parameters()

    def _get_default_parameters(self):
        """Get default detection parameters"""
        return {
            'canny_sigma': 0.25,
            'min_area_ratio': 0.01,
            'max_area_ratio': 0.7,
            'min_aspect_ratio': 1.5,
            'max_aspect_ratio': 25.0,
            'min_solidity': 0.6,
            'min_extent': 0.5,
            'max_circularity': 0.7,
            'min_confidence': 0.3,
            'enable_debug': True
        }

    def detect_belt_with_details(self, frame):
        """Enhanced conveyor belt detection with CLAHE, median blur, adaptive threshold fallback."""
        try:
            height, width = frame.shape[:2]
            frame_center = width // 2

            # --- STEP 1: Crop ROI ---
            y1_crop = int(height * 0.15)
            y2_crop = int(height * 0.9)
            x1_crop = int(width * 0.1)
            x2_crop = int(width * 0.9)
            frame_cropped = frame[y1_crop:y2_crop, x1_crop:x2_crop]

            # --- STEP 2: Grayscale + CLAHE ---
            gray = cv2.cvtColor(frame_cropped, cv2.COLOR_BGR2GRAY)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            gray_clahe = clahe.apply(gray)

            # --- STEP 3: Median Blur ---
            blurred = cv2.medianBlur(gray_clahe, 5)

            # --- STEP 4: Canny edges ---
            sigma = 0.2
            v_median = np.median(blurred)
            lower = int(max(0, (1.0 - sigma) * v_median))
            upper = int(min(255, (1.0 + sigma) * v_median))
            edges_canny = cv2.Canny(blurred, lower, upper)

            # --- STEP 5: Morphology ---
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
            edges_closed = cv2.morphologyEx(edges_canny, cv2.MORPH_CLOSE, kernel, iterations=2)

            # --- STEP 6: Find contours ---
            contours, _ = cv2.findContours(edges_closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if not contours:
                # Adaptive threshold fallback
                adaptive = cv2.adaptiveThreshold(blurred, 255,
                                                 cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                                 cv2.THRESH_BINARY,
                                                 11, 2)
                contours, _ = cv2.findContours(adaptive, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                if not contours:
                    return self._create_empty_belt_data(height, width, frame_center, edges_canny)

            # --- STEP 7: Filter contours ---
            belt_contours = []
            min_area = frame_cropped.shape[0] * frame_cropped.shape[1] * 0.005
            max_area = frame_cropped.shape[0] * frame_cropped.shape[1] * 0.9

            for cnt in contours:
                area = cv2.contourArea(cnt)
                if area < min_area or area > max_area:
                    continue
                x, y, w, h = cv2.boundingRect(cnt)
                aspect_ratio = float(w) / h if h > 0 else 0
                if aspect_ratio < 1.0 or aspect_ratio > 30.0:
                    continue
                hull = cv2.convexHull(cnt)
                hull_area = cv2.contourArea(hull)
                solidity = float(area) / hull_area if hull_area > 0 else 0
                rect_area = w * h
                extent = float(area) / rect_area if rect_area > 0 else 0
                if solidity < 0.5 or extent < 0.4:
                    continue
                belt_contours.append({
                    'contour': cnt,
                    'area': float(area),
                    'bbox': [int(x), int(y), int(x + w), int(y + h)],
                    'aspect_ratio': aspect_ratio,
                    'solidity': solidity,
                    'extent': extent,
                    'center': (int(x + w // 2), int(y + h // 2))
                })

            if not belt_contours and contours:
                largest = max(contours, key=cv2.contourArea)
                x, y, w, h = cv2.boundingRect(largest)
                belt_contours.append({
                    'contour': largest,
                    'area': float(cv2.contourArea(largest)),
                    'bbox': [int(x), int(y), int(x + w), int(y + h)],
                    'aspect_ratio': float(w) / h if h > 0 else 1.0,
                    'solidity': 0.5,
                    'extent': 0.5,
                    'center': (int(x + w // 2), int(y + h // 2))
                })

            # --- STEP 8: Select best contour ---
            belt_contours.sort(key=lambda c: c['area'], reverse=True)
            best = belt_contours[0]
            x1, y1, x2, y2 = best['bbox']
            w, h = x2 - x1, y2 - y1
            belt_center_x = x1 + w // 2
            belt_center_y = y1 + h // 2
            alignment_deviation = belt_center_x - (frame_cropped.shape[1] // 2)

            # --- STEP 9: Create mask ---
            belt_mask = np.zeros(frame_cropped.shape[:2], dtype=np.uint8)
            cv2.drawContours(belt_mask, [best['contour']], -1, 255, -1)

            # Map contour to full frame
            contour_full = best['contour'] + [x1_crop, y1_crop]
            bbox_full = [x1 + x1_crop, y1 + y1_crop, x2 + x1_crop, y2 + y1_crop]

            rect = cv2.minAreaRect(contour_full)
            min_area_rect = cv2.boxPoints(rect)
            min_area_rect = np.int0(min_area_rect)

            convex_hull = cv2.convexHull(contour_full)
            convex_hull_area = cv2.contourArea(convex_hull)
            corners = self._find_corner_points(contour_full)

            return {
                'belt_found': True,
                'belt_bbox': bbox_full,
                'belt_center': (belt_center_x + x1_crop, belt_center_y + y1_crop),
                'belt_width': float(w),
                'belt_height': float(h),
                'belt_area_pixels': float(best['area']),
                'alignment_deviation': int(alignment_deviation),
                'frame_center': frame_center,
                'contour': contour_full,
                'convex_hull': convex_hull,
                'min_area_rect': min_area_rect,
                'edges': edges_canny,
                'edge_points': int(np.sum((edges_canny > 0) & (belt_mask > 0))),
                'belt_mask': belt_mask,
                'confidence': 0.9,
                'contour_points': len(contour_full),
                'corner_points': len(corners),
                'convex_hull_area': float(convex_hull_area),
                'min_area_rect_area': float(cv2.contourArea(min_area_rect)),
                'aspect_ratio': best['aspect_ratio'],
                'solidity': best['solidity'],
                'extent': best['extent'],
                'corners': corners,
                'belt_orientation': rect[2] if len(rect) > 2 else 0.0
            }

        except Exception as e:
            logger.error(f"Error in belt detection: {e}", exc_info=True)
            height, width = frame.shape[:2] if 'frame' in locals() else (0, 0)
            return self._create_empty_belt_data(height, width, width // 2 if width > 0 else 0, None)

    def _find_corner_points(self, contour, max_corners=20, quality=0.01, min_distance=10):
        """Find corner points in a contour"""
        if len(contour) < 4:
            return []

        points = contour.reshape(-1, 2).astype(np.float32)

        corners = cv2.goodFeaturesToTrack(points, max_corners, quality, min_distance)

        if corners is not None:
            corners = corners.reshape(-1, 2).astype(int)
            return corners.tolist()
        return []

    def set_detection_parameters(self, parameters=None):
        """Set detection parameters for debugging"""
        default_params = self._get_default_parameters()

        if parameters:
            default_params.update(parameters)

        self.detection_params = default_params
        logger.info(f"Detection parameters updated: {default_params}")
        return default_params

    def tune_detection_for_video(self, video_path):
        """Helper method to find optimal parameters for a specific video"""
        import cv2
        cap = cv2.VideoCapture(video_path)
        ret, sample_frame = cap.read()
        cap.release()

        if not ret:
            return {"error": "Could not read video"}

        # Try different parameter sets
        parameter_sets = [
            {
                'name': 'VERY_AGGRESSIVE',
                'canny_sigma': 0.15,
                'min_area_ratio': 0.005,
                'max_area_ratio': 0.8,
                'min_aspect_ratio': 1.0,
                'max_aspect_ratio': 30.0,
                'min_solidity': 0.4,
                'min_extent': 0.3,
                'max_circularity': 0.8,
                'min_confidence': 0.15,
                'enable_debug': True
            },
            {
                'name': 'AGGRESSIVE',
                'canny_sigma': 0.2,
                'min_area_ratio': 0.01,
                'max_area_ratio': 0.7,
                'min_aspect_ratio': 1.2,
                'max_aspect_ratio': 25.0,
                'min_solidity': 0.5,
                'min_extent': 0.4,
                'max_circularity': 0.75,
                'min_confidence': 0.2,
                'enable_debug': True
            },
            {
                'name': 'MODERATE',
                'canny_sigma': 0.25,
                'min_area_ratio': 0.02,
                'max_area_ratio': 0.6,
                'min_aspect_ratio': 1.5,
                'max_aspect_ratio': 20.0,
                'min_solidity': 0.6,
                'min_extent': 0.5,
                'max_circularity': 0.7,
                'min_confidence': 0.3,
                'enable_debug': True
            }
        ]

        results = []
        for params in parameter_sets:
            self.set_detection_parameters(params)
            belt_data = self.detect_belt_with_details(sample_frame)
            results.append({
                'name': params['name'],
                'belt_found': belt_data['belt_found'],
                'area': belt_data['belt_area_pixels'],
                'width': belt_data['belt_width'],
                'height': belt_data['belt_height'],
                'aspect_ratio': belt_data.get('aspect_ratio', 0),
                'confidence': belt_data.get('confidence', 0)
            })

        return results