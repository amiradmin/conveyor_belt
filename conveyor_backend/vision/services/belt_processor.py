# vision/services/belt_processor.py
import os
import time
import queue
import threading
import logging
import base64
from datetime import datetime
from collections import deque

import numpy as np
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings

from vision.models import ProcessingJob, VideoFile
import cv2

logger = logging.getLogger(__name__)


class BeltUtils:
    """Utility methods for belt processing, speed calculation, and visualization"""

    def ensure_serializable(self, obj):
        if obj is None:
            return None
        elif isinstance(obj, (np.integer,)):
            return int(obj)
        elif isinstance(obj, (np.floating,)):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, np.bool_):
            return bool(obj)
        elif isinstance(obj, dict):
            return {k: self.ensure_serializable(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self.ensure_serializable(i) for i in obj]
        elif isinstance(obj, tuple):
            return tuple(self.ensure_serializable(i) for i in obj)
        elif isinstance(obj, (str, int, float, bool)):
            return obj
        else:
            try:
                return str(obj)
            except:
                return None

    def calculate_speed_fast(self, prev_frame_gray, curr_frame_gray, prev_belt_data, curr_belt_data, fps):
        """Calculate belt speed using optical flow limited to the belt mask (m/s)"""
        try:
            if not prev_belt_data or not curr_belt_data or not prev_belt_data.get(
                    'belt_found') or not curr_belt_data.get('belt_found'):
                return 0.0
            height, width = prev_frame_gray.shape[:2]

            def safe_mask(mask):
                if mask is None:
                    return np.zeros((height, width), dtype=np.uint8)
                m = mask.astype(np.uint8)
                if m.shape != (height, width):
                    m = cv2.resize(m, (width, height), interpolation=cv2.INTER_NEAREST)
                return (m > 0).astype(np.uint8) * 255

            prev_mask = safe_mask(prev_belt_data.get('belt_mask'))
            curr_mask = safe_mask(curr_belt_data.get('belt_mask'))

            # Ensure masks are the same size as frames
            if prev_mask.shape != prev_frame_gray.shape:
                prev_mask = cv2.resize(prev_mask, (prev_frame_gray.shape[1], prev_frame_gray.shape[0]))
            if curr_mask.shape != curr_frame_gray.shape:
                curr_mask = cv2.resize(curr_mask, (curr_frame_gray.shape[1], curr_frame_gray.shape[0]))

            prev_masked = cv2.bitwise_and(prev_frame_gray, prev_frame_gray, mask=prev_mask)
            curr_masked = cv2.bitwise_and(curr_frame_gray, curr_frame_gray, mask=curr_mask)

            if np.count_nonzero(prev_mask) < 50:
                return 0.0

            flow = cv2.calcOpticalFlowFarneback(prev_masked, curr_masked, None,
                                                0.5, 3, 15, 3, 5, 1.2, 0)
            if flow is None:
                return 0.0

            flow_x = flow[..., 0]
            movements = flow_x[prev_mask > 0]
            valid = movements[np.abs(movements) > 0.05]
            if valid.size == 0:
                return 0.0

            avg_px_per_frame = float(np.mean(valid))
            pixel_to_meter = 0.001  # default 1 mm per px
            try:
                if curr_belt_data.get('belt_physical_width_mm') and curr_belt_data.get('belt_width'):
                    physical_mm = float(curr_belt_data['belt_physical_width_mm'])
                    pixel_width = float(curr_belt_data['belt_width'])
                    pixel_to_meter = (physical_mm / 1000.0) / pixel_width if pixel_width > 0 else 0.001
            except:
                pass

            return float(abs(avg_px_per_frame) * fps * pixel_to_meter)
        except Exception as e:
            logger.error(f"Error calculating speed: {e}")
            return 0.0

    def calculate_speed_kmh(self, prev_frame_gray, curr_frame_gray, prev_belt_data, curr_belt_data, fps):
        return self.calculate_speed_fast(prev_frame_gray, curr_frame_gray, prev_belt_data, curr_belt_data, fps) * 3.6

    def draw_enhanced_visualizations(self, frame, belt_data, metrics, alert_active=False):
        """Draw contours, edges, speed, alignment, and overlay metrics with spillage/damage alarms"""
        vis = frame.copy()
        h, w = vis.shape[:2]
        COLOR_GREEN = (0, 255, 0)
        COLOR_RED = (0, 0, 255)
        COLOR_BLUE = (255, 0, 0)
        COLOR_CYAN = (255, 255, 0)
        COLOR_YELLOW = (0, 255, 255)
        COLOR_ORANGE = (0, 165, 255)
        COLOR_WHITE = (255, 255, 255)
        COLOR_PURPLE = (255, 0, 255)  # For damage points
        COLOR_LIME = (0, 255, 0)  # For spillage points

        if not belt_data.get('belt_found', False):
            cv2.putText(vis, "NO BELT DETECTED", (w // 2 - 150, h // 2),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, COLOR_RED, 2, cv2.LINE_AA)
            return vis

        # Draw contours, hull, min area rect
        contour = belt_data.get('contour')
        if contour is not None and len(contour) > 2:
            cv2.drawContours(vis, [contour], -1, COLOR_GREEN, 2)
        if belt_data.get('convex_hull') is not None:
            cv2.drawContours(vis, [belt_data['convex_hull']], -1, COLOR_CYAN, 2)
        if belt_data.get('min_area_rect') is not None:
            cv2.drawContours(vis, [belt_data['min_area_rect']], -1, COLOR_BLUE, 2)

        # Draw edges inside belt - safely
        edges = belt_data.get('edges')
        mask = belt_data.get('belt_mask')
        if edges is not None and mask is not None:
            # Ensure same size
            if edges.shape[:2] == mask.shape[:2] and edges.shape[:2] == (h, w):
                ys, xs = np.where(np.logical_and(edges > 0, mask > 0))
                for x, y in zip(xs[:1000], ys[:1000]):
                    if 0 <= x < w and 0 <= y < h:
                        vis[y, x] = COLOR_RED
            elif edges.shape[:2] == mask.shape[:2]:
                # Resize to match frame
                edges_resized = cv2.resize(edges, (w, h), interpolation=cv2.INTER_NEAREST)
                mask_resized = cv2.resize(mask, (w, h), interpolation=cv2.INTER_NEAREST)
                ys, xs = np.where(np.logical_and(edges_resized > 0, mask_resized > 0))
                for x, y in zip(xs[:1000], ys[:1000]):
                    if 0 <= x < w and 0 <= y < h:
                        vis[y, x] = COLOR_RED

        # Draw left/right edges
        left_edge = belt_data.get('left_edge') or []
        right_edge = belt_data.get('right_edge') or []
        if len(left_edge) > 2:
            left_edge_array = np.array(left_edge).reshape(-1, 1, 2)
            cv2.polylines(vis, [left_edge_array.astype(np.int32)], False, COLOR_BLUE, 3)
        if len(right_edge) > 2:
            right_edge_array = np.array(right_edge).reshape(-1, 1, 2)
            cv2.polylines(vis, [right_edge_array.astype(np.int32)], False, COLOR_CYAN, 3)

        # Draw damaged points - using purple color (only if alert is not active to reduce clutter)
        if not alert_active:
            damaged = belt_data.get('damaged_points') or []
            for x, y in damaged[:30]:  # Limit to 30 points for performance
                if 0 <= x < w and 0 <= y < h:
                    cv2.circle(vis, (x, y), 5, COLOR_PURPLE, -1)
                    cv2.circle(vis, (x, y), 6, COLOR_RED, 1)

            # Draw spillage points - using lime green color
            spillage_points = belt_data.get('spillage_points') or []
            for x, y in spillage_points[:30]:  # Limit to 30 points for performance
                if 0 <= x < w and 0 <= y < h:
                    cv2.circle(vis, (x, y), 8, COLOR_LIME, -1)
                    cv2.circle(vis, (x, y), 9, COLOR_YELLOW, 1)

            # Draw edge tear points specifically
            edge_tears = belt_data.get('edge_tear_points') or []
            for x, y in edge_tears[:20]:  # Limit to 20 points
                if 0 <= x < w and 0 <= y < h:
                    cv2.circle(vis, (x, y), 6, COLOR_RED, -1)
                    cv2.drawMarker(vis, (x, y), COLOR_RED, cv2.MARKER_TRIANGLE_UP, 10, 2)

        # Alignment arrow
        deviation = int(belt_data.get('alignment_deviation', 0))
        frame_center = belt_data.get('frame_center', w // 2)
        arrow_end = frame_center + deviation
        arrow_end = max(0, min(w - 1, arrow_end))  # Clamp to frame boundaries
        cv2.arrowedLine(vis, (frame_center, h - 40), (arrow_end, h - 40),
                        COLOR_ORANGE if abs(deviation) > 30 else COLOR_GREEN, 3, tipLength=0.05)

        # Overlay metrics with spillage and damage counts
        y0, dy = 20, 22
        total_damage = len(belt_data.get('damaged_points', [])) + len(belt_data.get('edge_tear_points', []))
        total_spillage = len(belt_data.get('spillage_points', []))

        metrics_lines = [
            f"Speed: {metrics.get('speed', 0):.2f} km/h",
            f"Avg Speed: {metrics.get('avg_speed', 0):.2f} km/h",
            f"Alignment: {deviation} px",
            f"Area: {belt_data.get('belt_area_pixels', 0):.0f} px",
            f"Total Damage: {total_damage} pts",
            f"Spillage: {total_spillage} pts",
            f"Status: {'ALERT!' if alert_active else 'Normal'}",
            f"Confidence: {belt_data.get('confidence', 0):.1%}"
        ]

        # Background for metrics
        bg_color = (0, 0, 0) if not alert_active else (0, 0, 200)
        border_color = COLOR_WHITE if not alert_active else COLOR_RED
        cv2.rectangle(vis, (5, 5), (400, 5 + len(metrics_lines) * dy + 10), bg_color, -1)
        cv2.rectangle(vis, (5, 5), (400, 5 + len(metrics_lines) * dy + 10), border_color, 2)

        # Draw metrics with different colors based on severity
        for i, line in enumerate(metrics_lines):
            color = COLOR_WHITE
            if "ALERT!" in line:
                color = COLOR_RED
            elif "Damage" in line and total_damage > 5:
                color = COLOR_ORANGE
            elif "Spillage" in line and total_spillage > 10:
                color = COLOR_YELLOW

            cv2.putText(vis, line, (10, y0 + i * dy), cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 1, cv2.LINE_AA)

        # Show STOP warning only when alert is active
        if alert_active:
            # Create semi-transparent red overlay
            overlay = vis.copy()
            cv2.rectangle(overlay, (0, 0), (w, h), (0, 0, 255), -1)
            vis = cv2.addWeighted(overlay, 0.2, vis, 0.8, 0)

            # Draw STOP warning
            cv2.putText(vis, "!!! STOP !!!", (w // 2 - 200, h // 2),
                        cv2.FONT_HERSHEY_SIMPLEX, 3.0, COLOR_RED, 8, cv2.LINE_AA)
            cv2.putText(vis, "MAINTENANCE REQUIRED", (w // 2 - 250, h // 2 + 100),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.5, COLOR_RED, 4, cv2.LINE_AA)

            # Add details
            warning_text = f"Damage: {total_damage} pts, Spillage: {total_spillage} pts"
            cv2.putText(vis, warning_text, (w // 2 - 200, h // 2 + 150),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, COLOR_RED, 2, cv2.LINE_AA)

            # Add timer for how long the alert has been active
            if 'alert_start_time' in metrics:
                alert_duration = time.time() - metrics['alert_start_time']
                timer_text = f"Alert active: {alert_duration:.1f}s"
                cv2.putText(vis, timer_text, (w // 2 - 150, h // 2 + 200),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, COLOR_RED, 2, cv2.LINE_AA)

        return vis


class BeltDetector:
    """Detect conveyor belt contours, mask, and key metrics with spillage and damage detection"""

    def __init__(self):
        self.detection_params = self._get_default_parameters()

    def _get_default_parameters(self):
        return {
            'canny_sigma': 0.25,
            'min_area_ratio': 0.01,
            'max_area_ratio': 0.7,
            'min_aspect_ratio': 1.5,
            'max_aspect_ratio': 25.0,
            'min_solidity': 0.6,
            'min_extent': 0.5,
            'enable_debug': False,
            # New parameters for spillage and damage detection
            'spillage_threshold': 0.10,
            'damage_threshold': 0.15,
            'edge_tear_sensitivity': 1.5,
            'min_spillage_area': 250,  # Increased to reduce false positives
            'min_damage_area': 80,  # Increased to reduce false positives
            'edge_tear_detection_enabled': False,
            'spillage_detection_enabled': True,
            'damage_detection_enabled': False,
            # Confidence thresholds
            'damage_confidence_threshold': 0.7,
            'spillage_confidence_threshold': 0.9
        }

    def set_detection_parameters(self, parameters=None):
        if parameters:
            self.detection_params.update(parameters)
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
            'belt_orientation': 0.0,
            # New fields for damage and spillage detection
            'damaged_points': [],
            'spillage_points': [],
            'edge_tear_points': [],
            'damage_severity': 0.0,
            'spillage_severity': 0.0,
            'has_edge_tear': False,
            'has_spillage': False,
            'has_damage': False,
            'damage_confidence': 0.0,
            'spillage_confidence': 0.0
        }

    def _find_corner_points(self, contour, max_corners=20, quality=0.01, min_distance=10):
        if contour is None or len(contour) < 4:
            return []
        pts = contour.reshape(-1, 2).astype(np.float32)
        corners = cv2.goodFeaturesToTrack(pts, max_corners, quality, min_distance)
        if corners is not None:
            return corners.reshape(-1, 2).astype(int).tolist()
        return []

    def _detect_damage_points(self, frame, belt_mask, contour, edges):
        """Detect potential damage points (edge tears, holes) on the belt"""
        damaged_points = []
        damage_confidence = 0.0

        if contour is None or len(contour) < 4:
            return damaged_points, damage_confidence

        try:
            # Convert mask to binary
            mask_binary = (belt_mask > 0).astype(np.uint8)

            # Find edges within the belt mask
            belt_edges = cv2.bitwise_and(edges, edges, mask=mask_binary)

            # Apply morphological operations to highlight irregular edges
            kernel = np.ones((3, 3), np.uint8)
            dilated_edges = cv2.dilate(belt_edges, kernel, iterations=1)
            eroded_edges = cv2.erode(dilated_edges, kernel, iterations=1)

            # The difference highlights potential damage/tears
            damage_mask = cv2.absdiff(dilated_edges, eroded_edges)

            # Find strong gradient changes within the belt (potential holes/tears)
            if len(frame.shape) == 3:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            else:
                gray = frame.copy()

            # Apply Sobel edge detection for more sensitive damage detection
            sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
            sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
            gradient_magnitude = np.sqrt(sobelx ** 2 + sobely ** 2)
            gradient_magnitude = np.uint8(np.clip(gradient_magnitude, 0, 255))

            # Ensure damage_mask and gradient_magnitude have same size
            if damage_mask.shape != gradient_magnitude.shape:
                damage_mask = cv2.resize(damage_mask, (gradient_magnitude.shape[1], gradient_magnitude.shape[0]))

            # Combine with damage mask
            combined_damage = cv2.bitwise_and(gradient_magnitude, gradient_magnitude, mask=damage_mask)

            # Find points with high gradient within damage areas
            _, damage_thresh = cv2.threshold(combined_damage, 60, 255, cv2.THRESH_BINARY)  # Increased threshold

            # Get coordinates of potential damage points
            damage_points_y, damage_points_x = np.where(damage_thresh > 0)

            # Filter points to avoid too many false positives
            min_damage_area = self.detection_params.get('min_damage_area', 80)
            valid_points = 0

            for y, x in zip(damage_points_y[:100], damage_points_x[:100]):  # Limit points
                # Ensure point is inside belt contour
                if cv2.pointPolygonTest(contour, (x, y), False) >= 0:
                    # Check if it's near the edges (more likely to be damage)
                    distance_to_contour = cv2.pointPolygonTest(contour, (x, y), True)
                    if abs(distance_to_contour) < 15:  # Reduced to 15 pixels
                        # Check if this is a cluster of points (more likely to be real damage)
                        damaged_points.append((x, y))
                        valid_points += 1

            # Calculate confidence based on number of valid points and clustering
            if valid_points > 0:
                # Higher confidence if we have clustered points
                if valid_points > 5:
                    damage_confidence = min(1.0, valid_points / 20.0)
                else:
                    damage_confidence = 0.3  # Low confidence for few points

        except Exception as e:
            logger.error(f"Error detecting damage points: {e}")

        return damaged_points[:30], damage_confidence  # Limit to 30 points

    def _detect_spillage_points(self, frame, belt_mask, contour):
        """Detect potential spillage (material outside the belt)"""
        spillage_points = []
        spillage_confidence = 0.0

        try:
            if len(frame.shape) == 3:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            else:
                gray = frame.copy()

            # Create inverse mask (areas outside the belt)
            inverse_mask = cv2.bitwise_not(belt_mask)

            # Apply CLAHE to enhance contrast
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            enhanced = clahe.apply(gray)

            # Detect edges outside the belt with higher thresholds
            edges_outside = cv2.Canny(enhanced, 70, 180)  # Increased thresholds
            edges_outside = cv2.bitwise_and(edges_outside, edges_outside, mask=inverse_mask)

            # Apply morphological operations to connect nearby edges
            kernel = np.ones((5, 5), np.uint8)
            edges_outside = cv2.morphologyEx(edges_outside, cv2.MORPH_CLOSE, kernel, iterations=2)

            # Find contours outside the belt
            contours, _ = cv2.findContours(edges_outside, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            min_spillage_area = self.detection_params.get('min_spillage_area', 150)
            total_spillage_area = 0

            for cnt in contours:
                area = cv2.contourArea(cnt)
                # Filter small noise
                if area < min_spillage_area:
                    continue

                # Get bounding box
                x, y, w, h = cv2.boundingRect(cnt)

                # Check if contour is near the belt (adjacent to belt edges)
                # Create a small expanded belt mask to check proximity
                expanded_belt = cv2.dilate(belt_mask, np.ones((20, 20), np.uint8), iterations=1)  # Increased dilation

                # Check overlap with expanded belt
                roi_mask = np.zeros_like(belt_mask)
                cv2.drawContours(roi_mask, [cnt], -1, 255, -1)
                overlap = cv2.bitwise_and(roi_mask, expanded_belt)

                overlap_area = np.sum(overlap > 0)
                if overlap_area > 20:  # Increased minimum overlap
                    total_spillage_area += area

                    # Get center point of the spillage contour
                    M = cv2.moments(cnt)
                    if M['m00'] != 0:
                        cx = int(M['m10'] / M['m00'])
                        cy = int(M['m01'] / M['m00'])
                        spillage_points.append((cx, cy))

                        # Limit number of points per contour
                        for i in range(0, len(cnt), max(1, len(cnt) // 3)):
                            point = cnt[i][0]
                            spillage_points.append(tuple(point))

                # Limit total number of points
                if len(spillage_points) > 40:
                    break

            # Calculate confidence based on total spillage area
            if total_spillage_area > 0:
                belt_area = np.sum(belt_mask > 0)
                if belt_area > 0:
                    relative_area = total_spillage_area / belt_area
                    spillage_confidence = min(1.0, relative_area * 10)  # Scale to 0-1

        except Exception as e:
            logger.error(f"Error detecting spillage points: {e}")

        return spillage_points[:40], spillage_confidence  # Limit to 40 points

    def _detect_edge_tears(self, contour, edges, mask):
        """Specifically detect edge tears along belt edges"""
        edge_tear_points = []
        edge_tear_confidence = 0.0

        try:
            if contour is None or len(contour) < 4:
                return edge_tear_points, edge_tear_confidence

            # Reshape contour for processing
            contour_points = contour.reshape(-1, 2)

            # Sample points along contour
            num_samples = min(80, len(contour_points))  # Reduced samples
            step = max(1, len(contour_points) // num_samples)

            tear_clusters = []

            for i in range(0, len(contour_points), step):
                x, y = contour_points[i]

                # Check a larger region around each contour point
                roi_size = 15  # Increased ROI
                x1 = max(0, x - roi_size)
                x2 = min(mask.shape[1], x + roi_size)
                y1 = max(0, y - roi_size)
                y2 = min(mask.shape[0], y + roi_size)

                if x1 >= x2 or y1 >= y2:
                    continue

                # Extract ROI from edges
                roi_edges = edges[y1:y2, x1:x2]
                roi_mask = mask[y1:y2, x1:x2]

                # Calculate edge density in ROI
                mask_area = np.sum(roi_mask > 0)
                if mask_area > 0:
                    edge_density = np.sum(roi_edges > 0) / mask_area

                    # Higher threshold for edge tears
                    sensitivity = self.detection_params.get('edge_tear_sensitivity', 1.5)
                    if edge_density > sensitivity * 0.2:  # Increased threshold
                        # Find strongest edge point in ROI
                        edge_points = np.where(roi_edges > 0)
                        if len(edge_points[0]) > 0:
                            # Take the strongest edge point
                            local_y, local_x = edge_points[0][0], edge_points[1][0]
                            global_x, global_y = x1 + local_x, y1 + local_y
                            edge_tear_points.append((global_x, global_y))
                            tear_clusters.append((global_x, global_y))

            # Calculate confidence based on clustering
            if len(tear_clusters) > 2:
                # Higher confidence if tears are clustered
                edge_tear_confidence = min(1.0, len(tear_clusters) / 10.0)
            elif len(tear_clusters) > 0:
                edge_tear_confidence = 0.4

        except Exception as e:
            logger.error(f"Error detecting edge tears: {e}")

        return edge_tear_points[:20], edge_tear_confidence  # Limit to 20 points

    def detect_belt_with_details(self, frame):
        try:
            height, width = frame.shape[:2]
            frame_center = width // 2

            # Crop ROI
            y1, y2 = int(height * 0.12), int(height * 0.95)
            x1, x2 = int(width * 0.05), int(width * 0.95)
            crop = frame[y1:y2, x1:x2]
            if crop.size == 0:
                return self._create_empty_belt_data(height, width, frame_center)

            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            gray = clahe.apply(gray)
            blurred = cv2.medianBlur(gray, 5)

            # Auto Canny
            sigma = self.detection_params.get('canny_sigma', 0.25)
            v = np.median(blurred)
            edges = cv2.Canny(blurred, int(max(0, (1 - sigma) * v)), int(min(255, (1 + sigma) * v)))
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
            edges_closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel, iterations=2)

            contours, _ = cv2.findContours(edges_closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if not contours:
                return self._create_empty_belt_data(height, width, frame_center, edges)

            # Belt candidates
            belt_candidates = []
            min_area = max(50, crop.shape[0] * crop.shape[1] * 0.005)
            max_area = crop.shape[0] * crop.shape[1] * 0.9
            for cnt in contours:
                area = cv2.contourArea(cnt)
                if area < min_area or area > max_area:
                    continue
                x, y, w, h = cv2.boundingRect(cnt)
                aspect_ratio = w / h if h > 0 else 0
                hull = cv2.convexHull(cnt)
                solidity = area / cv2.contourArea(hull) if hull is not None else 0
                extent = area / (w * h) if w * h > 0 else 0
                if aspect_ratio < self.detection_params.get('min_aspect_ratio', 1.0):
                    continue
                if solidity < self.detection_params.get('min_solidity', 0.4):
                    continue
                if extent < self.detection_params.get('min_extent', 0.3):
                    continue
                belt_candidates.append({'contour': cnt, 'area': area, 'bbox': (x, y, x + w, y + h),
                                        'aspect_ratio': aspect_ratio, 'solidity': solidity, 'extent': extent})

            if not belt_candidates and contours:
                largest = max(contours, key=cv2.contourArea)
                x, y, w, h = cv2.boundingRect(largest)
                belt_candidates.append({'contour': largest, 'area': cv2.contourArea(largest),
                                        'bbox': (x, y, x + w, y + h), 'aspect_ratio': w / max(1, h),
                                        'solidity': 0.5, 'extent': 0.5})

            best = sorted(belt_candidates, key=lambda c: c['area'], reverse=True)[0]
            mask_crop = np.zeros(crop.shape[:2], np.uint8)
            cv2.drawContours(mask_crop, [best['contour']], -1, 255, -1)

            contour_full = best['contour'] + np.array([[x1, y1]])
            contour_full = contour_full.reshape(-1, 1, 2).astype(np.int32)
            mask_full = np.zeros((height, width), np.uint8)
            mask_full[y1:y2, x1:x2] = mask_crop

            x1b, y1b, x2b, y2b = best['bbox']
            w_full, h_full = x2b - x1b, y2b - y1b
            belt_center_x, belt_center_y = x1b + w_full // 2, y1b + h_full // 2
            alignment_deviation = belt_center_x - crop.shape[1] // 2

            rect = cv2.minAreaRect(contour_full)
            min_area_rect = cv2.boxPoints(rect).astype(np.int32)
            convex_hull = cv2.convexHull(contour_full)
            convex_hull_area = float(cv2.contourArea(convex_hull)) if convex_hull is not None else 0.0

            # Base belt data
            belt_data = {
                'belt_found': True,
                'belt_bbox': [x1b + x1, y1b + y1, x2b + x1, y2b + y1],
                'belt_center': (belt_center_x, belt_center_y),
                'belt_width': float(w_full),
                'belt_height': float(h_full),
                'belt_area_pixels': float(best['area']),
                'alignment_deviation': int(alignment_deviation),
                'frame_center': frame_center,
                'contour': contour_full,
                'convex_hull': convex_hull,
                'min_area_rect': min_area_rect,
                'edges': edges,
                'edge_points': int(np.sum((edges > 0) & (mask_crop > 0))),
                'belt_mask': mask_full,
                'confidence': 0.9,
                'contour_points': int(contour_full.reshape(-1, 2).shape[0]),
                'corner_points': len(self._find_corner_points(contour_full)),
                'convex_hull_area': convex_hull_area,
                'min_area_rect_area': float(cv2.contourArea(min_area_rect)) if min_area_rect is not None else 0.0,
                'aspect_ratio': best['aspect_ratio'],
                'solidity': best['solidity'],
                'extent': best['extent'],
                'corners': self._find_corner_points(contour_full),
                'belt_orientation': float(rect[2]) if rect else 0.0,
                # Initialize new fields
                'damaged_points': [],
                'spillage_points': [],
                'edge_tear_points': [],
                'damage_severity': 0.0,
                'spillage_severity': 0.0,
                'has_edge_tear': False,
                'has_spillage': False,
                'has_damage': False,
                'damage_confidence': 0.0,
                'spillage_confidence': 0.0,
                'edge_tear_confidence': 0.0
            }

            # Detect damage points if enabled
            if self.detection_params.get('damage_detection_enabled', True):
                damaged_points, damage_confidence = self._detect_damage_points(frame, mask_full, contour_full, edges)
                belt_data['damaged_points'] = damaged_points
                belt_data['damage_confidence'] = damage_confidence
                belt_data['has_damage'] = damage_confidence > self.detection_params.get('damage_confidence_threshold',
                                                                                        0.7)
                belt_data['damage_severity'] = damage_confidence

            # Detect edge tears if enabled
            if self.detection_params.get('edge_tear_detection_enabled', True):
                edge_tear_points, edge_tear_confidence = self._detect_edge_tears(contour_full, edges, mask_full)
                belt_data['edge_tear_points'] = edge_tear_points
                belt_data['edge_tear_confidence'] = edge_tear_confidence
                belt_data['has_edge_tear'] = edge_tear_confidence > self.detection_params.get(
                    'damage_confidence_threshold', 0.7)

            # Detect spillage points if enabled
            if self.detection_params.get('spillage_detection_enabled', True):
                spillage_points, spillage_confidence = self._detect_spillage_points(frame, mask_full, contour_full)
                belt_data['spillage_points'] = spillage_points
                belt_data['spillage_confidence'] = spillage_confidence
                belt_data['has_spillage'] = spillage_confidence > self.detection_params.get(
                    'spillage_confidence_threshold', 0.7)
                belt_data['spillage_severity'] = spillage_confidence

            return belt_data
        except Exception as e:
            logger.error(f"Belt detection error: {e}")
            return self._create_empty_belt_data(*frame.shape[:2], frame.shape[1] // 2)


class BeltProcessor:
    """Process video streams, detect belts, compute metrics, send via WebSocket"""

    def __init__(self):
        self.jobs = {}
        self.replay_buffers = {}
        self.frame_queues = {}
        self.processing_threads = {}
        self.job_lock = threading.Lock()
        self.calibration_data = {}
        self.detector = BeltDetector()
        self.utils = BeltUtils()

    def _ensure_serializable(self, obj):
        return self.utils.ensure_serializable(obj)

    def _prepare_serializable_metrics(self, metrics_dict):
        return self._ensure_serializable(metrics_dict)

    def calibrate_belt_area(self, job_id, reference_width_mm=1000, reference_height_mm=200):
        with self.job_lock:
            self.calibration_data[job_id] = {
                'reference_width_mm': float(reference_width_mm),
                'reference_height_mm': float(reference_height_mm),
                'calibrated': False,
                'pixels_per_mm': None,
                'calibration_timestamp': time.time()
            }
        return {"status": "calibration_data_set", "job_id": job_id}

    def start_job(self, job_id, video_path, camera_id="default"):
        """Start processing video in a separate thread"""
        if not os.path.isabs(video_path):
            video_path = os.path.join(settings.MEDIA_ROOT, video_path)
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")

        video_obj, _ = VideoFile.objects.get_or_create(
            path=video_path,
            defaults={'filename': os.path.basename(video_path), 'size': os.path.getsize(video_path)}
        )
        job = ProcessingJob.objects.create(
            job_id=job_id,
            video=video_obj,
            camera_id=camera_id,
            status="processing"
        )

        with self.job_lock:
            self.jobs[job_id] = {
                'db_id': int(job.id),
                'video_path': video_path,
                'camera_id': camera_id,
                'start_time': time.time(),
                'is_running': True,
                'fps': 0.0,
                'frame_count': 0,
                'total_frames': 0,
                'processing_started': False,
                'alert_state': {
                    'active': False,
                    'start_time': None,
                    'trigger_count': 0,
                    'last_trigger_time': None,
                    'cooldown_until': 0
                }
            }
            # Initialize replay buffer with 'alerts' key
            self.replay_buffers[job_id] = {
                'frames': [],
                'timestamps': [],
                'speeds': [],
                'alignments': [],
                'alerts': []  # Added this key
            }
            self.frame_queues[job_id] = queue.Queue(maxsize=30)

        thread = threading.Thread(target=self._process_video_stream, args=(job_id, video_path),
                                  name=f"BeltProcessor-{job_id}")
        thread.daemon = True
        thread.start()

        with self.job_lock:
            self.processing_threads[job_id] = thread

        return job

    def _update_alert_state(self, job_id, belt_data, current_time):
        """Update alert state with persistence logic"""
        with self.job_lock:
            alert_state = self.jobs[job_id].get('alert_state', {
                'active': False,
                'start_time': None,
                'trigger_count': 0,
                'last_trigger_time': None,
                'cooldown_until': 0
            })

            # Check if in cooldown period
            if current_time < alert_state['cooldown_until']:
                return alert_state

            # Calculate total issues
            total_damage = len(belt_data.get('damaged_points', [])) + len(belt_data.get('edge_tear_points', []))
            total_spillage = len(belt_data.get('spillage_points', []))

            # Check conditions for triggering alert
            damage_threshold = 8
            spillage_threshold = 15
            confidence_threshold = 0.7

            has_confident_damage = (belt_data.get('damage_confidence', 0) > confidence_threshold or
                                    belt_data.get('edge_tear_confidence', 0) > confidence_threshold)
            has_confident_spillage = belt_data.get('spillage_confidence', 0) > confidence_threshold

            should_trigger = ((total_damage >= damage_threshold and has_confident_damage) or
                              (total_spillage >= spillage_threshold and has_confident_spillage))

            if should_trigger:
                # Increment trigger count
                alert_state['trigger_count'] += 1
                alert_state['last_trigger_time'] = current_time

                # Only activate alert if triggered multiple times in short period
                if alert_state['trigger_count'] >= 3:  # Need 3 consecutive triggers
                    if not alert_state['active']:
                        alert_state['active'] = True
                        alert_state['start_time'] = current_time
                        logger.warning(
                            f"ALERT ACTIVATED for job {job_id}: Damage={total_damage}, Spillage={total_spillage}")
                else:
                    # Reset if too much time between triggers
                    if (alert_state['last_trigger_time'] and
                            current_time - alert_state['last_trigger_time'] > 2.0):  # 2 second window
                        alert_state['trigger_count'] = 1
            else:
                # Decrement trigger count when conditions not met
                if alert_state['trigger_count'] > 0:
                    alert_state['trigger_count'] -= 1
                    if alert_state['trigger_count'] == 0:
                        alert_state['last_trigger_time'] = None

            # Deactivate alert if no triggers for a while
            if alert_state['active']:
                time_since_last_trigger = current_time - (alert_state['last_trigger_time'] or 0)
                if time_since_last_trigger > 5.0:  # 5 seconds without triggers
                    alert_state['active'] = False
                    alert_state['trigger_count'] = 0
                    alert_state['start_time'] = None
                    alert_state['cooldown_until'] = current_time + 10.0  # 10 second cooldown
                    logger.info(f"Alert deactivated for job {job_id} after {time_since_last_trigger:.1f}s")

            # Update job state
            self.jobs[job_id]['alert_state'] = alert_state

            return alert_state

    def _process_video_stream(self, job_id, video_path):
        """Internal processing loop for frames"""
        channel_layer = get_channel_layer()
        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise RuntimeError(f"Cannot open video: {video_path}")

            original_fps = float(cap.get(cv2.CAP_PROP_FPS)) or 30.0
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            frame_interval = 1.0 / min(original_fps, 30.0)

            with self.job_lock:
                self.jobs[job_id].update(
                    {'total_frames': total_frames, 'original_fps': original_fps, 'processing_started': True})

            frame_no = 0
            prev_frame_gray = None
            prev_belt_data = None
            prev_time = time.time()
            fps_start_time = time.time()
            fps_frame_count = 0

            # Use deque for efficient sliding window
            speed_history = deque(maxlen=50)
            alignment_history = deque(maxlen=50)
            area_history = deque(maxlen=50)
            damage_history = deque(maxlen=30)
            spillage_history = deque(maxlen=30)
            confidence_history = deque(maxlen=20)

            while self.jobs.get(job_id, {}).get('is_running', False):
                ret, frame = cap.read()
                if not ret:
                    break
                frame_no += 1
                fps_frame_count += 1
                current_time = time.time()

                if current_time - fps_start_time >= 1.0:
                    current_fps = fps_frame_count / (current_time - fps_start_time)
                    with self.job_lock:
                        self.jobs[job_id]['fps'] = float(current_fps)
                    fps_start_time = current_time
                    fps_frame_count = 0

                with self.job_lock:
                    self.jobs[job_id]['frame_count'] = frame_no

                elapsed = current_time - prev_time
                time.sleep(max(0, frame_interval - elapsed))

                belt_data = self.detector.detect_belt_with_details(frame)
                frame_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

                speed_kmh = self.utils.calculate_speed_kmh(prev_frame_gray, frame_gray, prev_belt_data, belt_data,
                                                           self.jobs[job_id][
                                                               'fps']) if prev_frame_gray is not None else 0.0

                if belt_data.get('belt_found', False):
                    speed_history.append(speed_kmh)
                    alignment_history.append(abs(belt_data.get('alignment_deviation', 0)))
                    area_history.append(float(belt_data.get('belt_area_pixels', 0)))

                    # Track damage and spillage
                    damage_count = len(belt_data.get('damaged_points', [])) + len(belt_data.get('edge_tear_points', []))
                    spillage_count = len(belt_data.get('spillage_points', []))
                    damage_history.append(damage_count)
                    spillage_history.append(spillage_count)

                    # Track confidence
                    confidence_history.append(
                        belt_data.get('damage_confidence', 0) + belt_data.get('spillage_confidence', 0))

                # Update alert state with persistence
                alert_state = self._update_alert_state(job_id, belt_data, current_time)

                # Prepare metrics
                avg_speed = np.mean(list(speed_history)) if speed_history else 0.0
                avg_alignment = np.mean(list(alignment_history)) if alignment_history else 0.0
                avg_area = np.mean(list(area_history)) if area_history else 0.0
                avg_damage = np.mean(list(damage_history)) if damage_history else 0.0
                avg_spillage = np.mean(list(spillage_history)) if spillage_history else 0.0
                avg_confidence = np.mean(list(confidence_history)) if confidence_history else 0.0

                metrics = {
                    'speed': speed_kmh,
                    'avg_speed': float(avg_speed),
                    'alignment_deviation': int(belt_data.get('alignment_deviation', 0)),
                    'avg_alignment': float(avg_alignment),
                    'belt_area_pixels': float(belt_data.get('belt_area_pixels', 0)),
                    'avg_belt_area': float(avg_area),
                    'belt_found': belt_data.get('belt_found', False),
                    # Damage and spillage metrics
                    'damage_points': len(belt_data.get('damaged_points', [])),
                    'edge_tear_points': len(belt_data.get('edge_tear_points', [])),
                    'spillage_points': len(belt_data.get('spillage_points', [])),
                    'avg_damage': float(avg_damage),
                    'avg_spillage': float(avg_spillage),
                    'has_edge_tear': belt_data.get('has_edge_tear', False),
                    'has_spillage': belt_data.get('has_spillage', False),
                    'has_damage': belt_data.get('has_damage', False),
                    'damage_severity': belt_data.get('damage_severity', 0.0),
                    'spillage_severity': belt_data.get('spillage_severity', 0.0),
                    'damage_confidence': belt_data.get('damage_confidence', 0.0),
                    'spillage_confidence': belt_data.get('spillage_confidence', 0.0),
                    'avg_confidence': float(avg_confidence),
                    # Alert state
                    'alert_active': alert_state['active'],
                    'alert_start_time': alert_state['start_time'],
                    'alert_trigger_count': alert_state['trigger_count'],
                    'in_cooldown': current_time < alert_state.get('cooldown_until', 0)
                }

                # Draw visualization with alert state
                annotated_frame = self.utils.draw_enhanced_visualizations(frame, belt_data, metrics,
                                                                          alert_state['active'])
                _, buffer = cv2.imencode('.jpg', annotated_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
                frame_base64 = base64.b64encode(buffer).decode('utf-8')

                progress = int((frame_no / total_frames) * 100) if total_frames else 0

                with self.job_lock:
                    replay_buffer = self.replay_buffers[job_id]
                    if len(replay_buffer['frames']) < 300:
                        replay_buffer['frames'].append(frame_base64)
                        replay_buffer['timestamps'].append(float(current_time))
                        replay_buffer['speeds'].append(speed_kmh)
                        replay_buffer['alignments'].append(int(belt_data.get('alignment_deviation', 0)))
                        replay_buffer['alerts'].append(alert_state['active'])  # Now this key exists

                # Send via WebSocket
                try:
                    async_to_sync(channel_layer.group_send)("frame_progress", {
                        "type": "progress_message",
                        "frame": frame_no,
                        "progress": progress,
                        "belt_metrics": self._prepare_serializable_metrics(metrics),
                        "frame_image": frame_base64,
                        "fps": float(self.jobs[job_id].get('fps', 0)),
                        "is_final": False,
                        "alert_triggered": alert_state['active'],
                        "alert_details": {
                            "active": alert_state['active'],
                            "duration": current_time - alert_state['start_time'] if alert_state['start_time'] else 0,
                            "trigger_count": alert_state['trigger_count'],
                            "cooldown_remaining": max(0, alert_state.get('cooldown_until', 0) - current_time)
                        }
                    })
                except Exception as e:
                    logger.error(f"WebSocket send error: {e}")

                prev_frame_gray = frame_gray.copy()
                prev_belt_data = belt_data
                prev_time = current_time

            cap.release()
            with self.job_lock:
                self.jobs[job_id]['is_running'] = False

            ProcessingJob.objects.filter(job_id=job_id).update(status="completed", progress=100)

        except Exception as e:
            logger.exception(f"Error processing video {video_path}: {e}")
            ProcessingJob.objects.filter(job_id=job_id).update(status="error", progress=0)
            try:
                async_to_sync(channel_layer.group_send)("frame_progress", {"type": "error_message", "error": str(e)})
            except:
                pass


# Singleton instance
processor = BeltProcessor()