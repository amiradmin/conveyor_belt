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
        """Enhanced conveyor belt detection with aggressive thresholds, fully fixed for shape alignment."""
        try:
            height, width = frame.shape[:2]
            frame_center = width // 2

            # --- STEP 1: Crop the ROI first ---
            y1_crop = int(height * 0.15)
            y2_crop = int(height * 0.9)
            x1_crop = int(width * 0.15)
            x2_crop = int(width * 0.85)

            frame_cropped = frame[y1_crop:y2_crop, x1_crop:x2_crop]

            # --- STEP 2: Compute grayscale and equalize ---
            gray = cv2.cvtColor(frame_cropped, cv2.COLOR_BGR2GRAY)
            equalized = cv2.equalizeHist(gray)

            # --- STEP 3: HSV saturation ---
            hsv = cv2.cvtColor(frame_cropped, cv2.COLOR_BGR2HSV)
            _, s, v = cv2.split(hsv)
            saturation = s.astype(np.uint8)

            # --- STEP 4: LAB lightness ---
            lab = cv2.cvtColor(frame_cropped, cv2.COLOR_BGR2LAB)
            lightness = lab[:, :, 0]

            # --- STEP 5: Combine channels ---
            combined = cv2.addWeighted(equalized, 0.5, saturation, 0.3, 0)
            combined = cv2.addWeighted(combined, 0.7, lightness, 0.3, 0)

            # --- STEP 6: Blur ---
            blurred = cv2.GaussianBlur(combined, (5, 5), 1)

            # --- STEP 7: Canny edges ---
            sigma = 0.15
            v_median = np.median(blurred)
            lower = int(max(0, (1.0 - 3 * sigma) * v_median))
            upper = int(min(255, (1.0 + 2 * sigma) * v_median))
            edges_canny = cv2.Canny(blurred, lower, upper, apertureSize=3, L2gradient=True)

            # --- STEP 8: Sobel edges ---
            sobel_x = cv2.Sobel(blurred, cv2.CV_64F, 1, 0, ksize=3)
            sobel_y = cv2.Sobel(blurred, cv2.CV_64F, 0, 1, ksize=3)
            sobel_edges = cv2.magnitude(sobel_x, sobel_y)
            sobel_edges = np.uint8(np.clip(sobel_edges, 0, 255))
            _, sobel_edges = cv2.threshold(sobel_edges, 30, 255, cv2.THRESH_BINARY)

            # --- STEP 9: Combine edges ---
            edges_combined = cv2.bitwise_or(edges_canny, sobel_edges)

            # --- STEP 10: Morphological ops ---
            kernel_dilate = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
            kernel_close = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
            edges_dilated = cv2.dilate(edges_combined, kernel_dilate, iterations=2)
            edges_closed = cv2.morphologyEx(edges_dilated, cv2.MORPH_CLOSE, kernel_close, iterations=2)

            # --- STEP 11: Find contours ---
            contours, _ = cv2.findContours(edges_closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if not contours:
                logger.warning("No contours found, trying Otsu fallback...")
                _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                if not contours:
                    return self._create_empty_belt_data(height, width, frame_center, edges_canny)

            # --- STEP 12: Filter contours ---
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
                    hull = cv2.convexHull(contour)
                    hull_area = cv2.contourArea(hull)
                    solidity = float(area) / hull_area if hull_area > 0 else 0
                    rect_area = w * h
                    extent = float(area) / rect_area if rect_area > 0 else 0
                    perimeter = cv2.arcLength(contour, True)
                    circularity = 4 * np.pi * area / (perimeter * perimeter) if perimeter > 0 else 0
                    belt_contours.append({
                        'contour': contour,
                        'area': float(area),
                        'bbox': [int(x), int(y), int(x + w), int(y + h)],
                        'aspect_ratio': aspect_ratio,
                        'solidity': solidity,
                        'extent': extent,
                        'circularity': circularity,
                        'perimeter': perimeter,
                        'center': (int(x + w // 2), int(y + h // 2))
                    })

            # --- STEP 13: Fallback if no contours pass ---
            if not belt_contours and contours:
                largest_contour = max(contours, key=cv2.contourArea)
                x, y, w, h = cv2.boundingRect(largest_contour)
                area = cv2.contourArea(largest_contour)
                belt_contours.append({
                    'contour': largest_contour,
                    'area': float(area),
                    'bbox': [int(x), int(y), int(x + w), int(y + h)],
                    'aspect_ratio': float(w) / h if h > 0 else 1.0,
                    'solidity': 0.5,
                    'extent': 0.5,
                    'circularity': 0.3,
                    'perimeter': cv2.arcLength(largest_contour, True),
                    'center': (int(x + w // 2), int(y + h // 2))
                })

            # --- STEP 14: Select best contour ---
            belt_contours.sort(key=lambda c: c['area'], reverse=True)
            best_contour = belt_contours[0]
            contour = best_contour['contour']
            x1, y1, x2, y2 = best_contour['bbox']
            w, h = x2 - x1, y2 - y1
            belt_center_x = x1 + w // 2
            belt_center_y = y1 + h // 2
            alignment_deviation = belt_center_x - (frame_cropped.shape[1] // 2)

            # --- STEP 15: Create mask aligned with cropped frame ---
            belt_mask = np.zeros(frame_cropped.shape[:2], dtype=np.uint8)
            cv2.drawContours(belt_mask, [contour], -1, 255, -1)
            edge_points_in_belt = np.sum((edges_canny > 0) & (belt_mask > 0))

            # --- STEP 16: Optional mapping back to full frame coordinates ---
            contour_full = contour + [x1_crop, y1_crop]
            bbox_full = [x1 + x1_crop, y1 + y1_crop, x2 + x1_crop, y2 + y1_crop]

            # Calculate additional shape properties
            convex_hull = cv2.convexHull(contour_full)
            convex_hull_area = cv2.contourArea(convex_hull)

            # Get rotated rectangle
            rect = cv2.minAreaRect(contour_full)
            min_area_rect = cv2.boxPoints(rect)
            min_area_rect = np.int0(min_area_rect)
            min_area_rect_area = cv2.contourArea(min_area_rect)

            # Find corner points
            corners = self._find_corner_points(contour_full)

            return {
                'belt_found': True,
                'belt_bbox': bbox_full,
                'belt_center': (belt_center_x + x1_crop, belt_center_y + y1_crop),
                'belt_width': float(w),
                'belt_height': float(h),
                'belt_area_pixels': float(best_contour['area']),
                'alignment_deviation': int(alignment_deviation),
                'frame_center': frame_center,
                'contour': contour_full,
                'convex_hull': convex_hull,
                'min_area_rect': min_area_rect,
                'edges': edges_canny,
                'edge_points': int(edge_points_in_belt),
                'belt_mask': belt_mask,
                'confidence': 0.8,
                'contour_points': len(contour_full),
                'corner_points': len(corners),
                'convex_hull_area': float(convex_hull_area),
                'min_area_rect_area': float(min_area_rect_area),
                'aspect_ratio': best_contour['aspect_ratio'],
                'solidity': best_contour['solidity'],
                'extent': best_contour['extent'],
                'corners': corners,
                'belt_orientation': rect[2] if len(rect) > 2 else 0.0
            }

        except Exception as e:
            logger.error(f"Error in belt detection: {e}", exc_info=True)
            height, width = frame.shape[:2] if 'frame' in locals() else (0, 0)
            return self._create_empty_belt_data(height, width, width // 2 if width > 0 else 0, None)

    def _create_empty_belt_data(self, height, width, frame_center, edges):
        """Create empty belt data structure"""
        return {
            'belt_found': False,
            'belt_bbox': [0, 0, 0, 0],
            'belt_center': (0, 0),
            'belt_width': 0.0,
            'belt_height': 0.0,
            'belt_area_pixels': 0.0,
            'belt_area_mm2': None,
            'belt_physical_width_mm': None,
            'belt_physical_height_mm': None,
            'alignment_deviation': 0,
            'frame_center': int(frame_center),
            'contour': None,
            'convex_hull': None,
            'min_area_rect': None,
            'edges': edges,
            'contour_points': 0,
            'edge_points': int(np.sum(edges > 0)) if edges is not None else 0,
            'corner_points': 0,
            'convex_hull_area': 0.0,
            'min_area_rect_area': 0.0,
            'belt_orientation': 0.0,
            'aspect_ratio': 0.0,
            'solidity': 0.0,
            'extent': 0.0,
            'corners': [],
            'belt_mask': None,
            'confidence': 0.0
        }

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