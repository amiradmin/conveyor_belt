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
            'enable_debug': False
        }

    def set_detection_parameters(self, parameters=None):
        default_params = self._get_default_parameters()
        if parameters:
            default_params.update(parameters)
        self.detection_params = default_params
        logger.info(f"Detection parameters updated: {self.detection_params}")
        return self.detection_params

    def _create_empty_belt_data(self, height, width, frame_center, edges_img=None):
        return {
            'belt_found': False,
            'belt_bbox': None,
            'belt_center': None,
            'belt_width': 0,
            'belt_height': 0,
            'belt_area_pixels': 0.0,
            'alignment_deviation': 0,
            'frame_center': frame_center,
            'contour': None,
            'convex_hull': None,
            'min_area_rect': None,
            'edges': edges_img if edges_img is not None else np.zeros((height, width), dtype=np.uint8),
            'edge_points': 0,
            'belt_mask': np.zeros((height, width), dtype=np.uint8),
            'confidence': 0.0,
            'contour_points': 0,
            'corner_points': 0,
            'convex_hull_area': 0.0,
            'min_area_rect_area': 0.0,
            'aspect_ratio': 0.0,
            'solidity': 0.0,
            'extent': 0.0,
            'corners': [],
            'belt_orientation': 0.0
        }

    def _find_corner_points(self, contour, max_corners=20, quality=0.01, min_distance=10):
        """Find corner points in a contour"""
        if contour is None or len(contour) < 4:
            return []
        pts = contour.reshape(-1, 2).astype(np.float32)
        corners = cv2.goodFeaturesToTrack(pts, max_corners, quality, min_distance)
        if corners is not None:
            corners = corners.reshape(-1, 2).astype(int)
            return corners.tolist()
        return []

    def detect_belt_with_details(self, frame):
        """
        Enhanced conveyor belt detection.
        Returns belt data with a full-frame contour (coords in original frame),
        a full-frame belt_mask, edges (full frame), and other metrics.
        """
        try:
            height, width = frame.shape[:2]
            frame_center = width // 2

            # Crop to ROI to reduce noise (but we'll map back to full frame later)
            y1_crop = int(height * 0.12)
            y2_crop = int(height * 0.95)
            x1_crop = int(width * 0.05)
            x2_crop = int(width * 0.95)
            frame_cropped = frame[y1_crop:y2_crop, x1_crop:x2_crop]
            if frame_cropped.size == 0:
                return self._create_empty_belt_data(height, width, frame_center)

            # Grayscale + CLAHE
            gray = cv2.cvtColor(frame_cropped, cv2.COLOR_BGR2GRAY)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            gray_clahe = clahe.apply(gray)

            # Denoise
            blurred = cv2.medianBlur(gray_clahe, 5)

            # Auto Canny thresholds based on median
            sigma = self.detection_params.get('canny_sigma', 0.25)
            v = np.median(blurred)
            lower = int(max(0, (1.0 - sigma) * v))
            upper = int(min(255, (1.0 + sigma) * v))
            edges_canny = cv2.Canny(blurred, lower, upper)

            # Morphological close to connect edges
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
            edges_closed = cv2.morphologyEx(edges_canny, cv2.MORPH_CLOSE, kernel, iterations=2)

            # Find contours on the closed edges
            contours, _ = cv2.findContours(edges_closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if not contours:
                # Fallback: adaptive threshold then contours
                adaptive = cv2.adaptiveThreshold(blurred, 255,
                                                 cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                                 cv2.THRESH_BINARY,
                                                 11, 2)
                contours, _ = cv2.findContours(adaptive, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                if not contours:
                    # Return empty but include full-frame edges image (resized back)
                    edges_full = np.zeros((height, width), dtype=np.uint8)
                    # place edges_canny into full frame ROI
                    edges_full[y1_crop:y2_crop, x1_crop:x2_crop] = edges_canny
                    return self._create_empty_belt_data(height, width, frame_center, edges_full)

            # Filter plausible belt-like contours
            belt_candidates = []
            min_area = max(50, frame_cropped.shape[0] * frame_cropped.shape[1] * 0.005)
            max_area = frame_cropped.shape[0] * frame_cropped.shape[1] * 0.9

            for cnt in contours:
                area = cv2.contourArea(cnt)
                if area < min_area or area > max_area:
                    continue
                x, y, w, h = cv2.boundingRect(cnt)
                aspect_ratio = float(w) / h if h > 0 else 0
                hull = cv2.convexHull(cnt)
                hull_area = cv2.contourArea(hull) if hull is not None else 0.0
                solidity = float(area) / hull_area if hull_area > 0 else 0.0
                rect_area = max(1, w * h)
                extent = float(area) / rect_area if rect_area > 0 else 0.0

                # Heuristics for belt: elongated shape and reasonable solidity / extent
                if aspect_ratio < self.detection_params.get('min_aspect_ratio', 1.0):
                    continue
                if solidity < self.detection_params.get('min_solidity', 0.4):
                    continue
                if extent < self.detection_params.get('min_extent', 0.3):
                    continue

                belt_candidates.append({
                    'contour': cnt,
                    'area': float(area),
                    'bbox': (x, y, x + w, y + h),
                    'aspect_ratio': aspect_ratio,
                    'solidity': solidity,
                    'extent': extent
                })

            # If nothing matched the heuristics, pick the largest contour (best-effort)
            if not belt_candidates and contours:
                largest = max(contours, key=cv2.contourArea)
                area = cv2.contourArea(largest)
                x, y, w, h = cv2.boundingRect(largest)
                belt_candidates.append({
                    'contour': largest,
                    'area': float(area),
                    'bbox': (x, y, x + w, y + h),
                    'aspect_ratio': float(w) / max(1, h),
                    'solidity': 0.5,
                    'extent': 0.5
                })

            # Choose best candidate by area
            belt_candidates.sort(key=lambda c: c['area'], reverse=True)
            best = belt_candidates[0]

            # Create belt mask in cropped coordinates
            belt_mask_cropped = np.zeros(frame_cropped.shape[:2], dtype=np.uint8)
            cv2.drawContours(belt_mask_cropped, [best['contour']], -1, 255, -1)

            # Map contour and mask to full frame coordinates
            contour_full = best['contour'] + np.array([[x1_crop, y1_crop]])
            contour_full = contour_full.reshape(-1, 1, 2).astype(np.int32)

            belt_mask_full = np.zeros((height, width), dtype=np.uint8)
            belt_mask_full[y1_crop:y2_crop, x1_crop:x2_crop] = belt_mask_cropped

            x1, y1, x2, y2 = best['bbox']
            bbox_full = [x1 + x1_crop, y1 + y1_crop, x2 + x1_crop, y2 + y1_crop]
            w_full = x2 - x1
            h_full = y2 - y1
            belt_center_x = x1 + w_full // 2
            belt_center_y = y1 + h_full // 2
            alignment_deviation = int(belt_center_x - (frame_cropped.shape[1] // 2))

            # get min area rect and hull in full coords
            rect = cv2.minAreaRect(contour_full)
            min_area_rect = cv2.boxPoints(rect).astype(np.int32)
            convex_hull = cv2.convexHull(contour_full)
            convex_hull_area = float(cv2.contourArea(convex_hull)) if convex_hull is not None else 0.0

            # edges image placed back to full frame coordinates (from cropped Canny)
            edges_full = np.zeros((height, width), dtype=np.uint8)
            edges_full[y1_crop:y2_crop, x1_crop:x2_crop] = edges_canny

            # corner detection (on full contour)
            corners = self._find_corner_points(contour_full)

            edge_points = int(np.sum((edges_full > 0) & (belt_mask_full > 0)))

            return {
                'belt_found': True,
                'belt_bbox': bbox_full,
                'belt_center': (belt_center_x + x1_crop, belt_center_y + y1_crop),
                'belt_width': float(w_full),
                'belt_height': float(h_full),
                'belt_area_pixels': float(best['area']),
                'alignment_deviation': int(alignment_deviation),
                'frame_center': frame_center,
                'contour': contour_full,
                'convex_hull': convex_hull,
                'min_area_rect': min_area_rect,
                'edges': edges_full,
                'edge_points': edge_points,
                'belt_mask': belt_mask_full,
                'confidence': 0.9,
                'contour_points': int(contour_full.reshape(-1, 2).shape[0]),
                'corner_points': len(corners),
                'convex_hull_area': float(convex_hull_area),
                'min_area_rect_area': float(cv2.contourArea(min_area_rect)) if min_area_rect is not None else 0.0,
                'aspect_ratio': best['aspect_ratio'],
                'solidity': best['solidity'],
                'extent': best['extent'],
                'corners': corners,
                'belt_orientation': float(rect[2]) if rect is not None else 0.0
            }

        except Exception as e:
            logger.exception(f"Error in belt detection: {e}")
            h, w = frame.shape[:2]
            return self._create_empty_belt_data(h, w, w // 2, None)
