# vision/services/belt_utils.py
import cv2
import numpy as np
import logging
import math
import json

logger = logging.getLogger(__name__)


class BeltUtils:
    def __init__(self):
        pass

    def ensure_serializable(self, obj):
        """Convert NumPy/Python types to JSON serializable types"""
        if obj is None:
            return None
        elif isinstance(obj, (np.integer, np.int64, np.int32, np.int16, np.int8)):
            return int(obj)
        elif isinstance(obj, (np.floating, np.float64, np.float32, np.float16)):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, np.bool_):
            return bool(obj)
        elif isinstance(obj, dict):
            return {key: self.ensure_serializable(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [self.ensure_serializable(item) for item in obj]
        elif isinstance(obj, tuple):
            return tuple(self.ensure_serializable(item) for item in obj)
        elif isinstance(obj, (str, int, float, bool)):
            return obj
        else:
            try:
                return str(obj)
            except:
                return None

    def calculate_speed_fast(self, prev_frame, curr_frame, prev_belt_data, curr_belt_data, fps):
        """Calculate belt speed using optical flow"""
        try:
            if not prev_belt_data['belt_found'] or not curr_belt_data['belt_found']:
                return 0.0

            height, width = prev_frame.shape[:2]

            prev_mask = prev_belt_data.get('belt_mask', np.zeros((height, width), dtype=np.uint8))
            curr_mask = curr_belt_data.get('belt_mask', np.zeros((height, width), dtype=np.uint8))

            prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)
            curr_gray = cv2.cvtColor(curr_frame, cv2.COLOR_BGR2GRAY)

            prev_gray = cv2.bitwise_and(prev_gray, prev_gray, mask=prev_mask)
            curr_gray = cv2.bitwise_and(curr_gray, curr_gray, mask=curr_mask)

            flow = cv2.calcOpticalFlowFarneback(
                prev_gray, curr_gray, None,
                pyr_scale=0.5, levels=3, winsize=15,
                iterations=3, poly_n=5, poly_sigma=1.2,
                flags=0
            )

            flow_x = flow[..., 0]

            mask_indices = np.where(prev_mask > 0)
            if len(mask_indices[0]) > 0:
                movements = flow_x[mask_indices]

                valid_movements = movements[np.abs(movements) > 0.1]

                if len(valid_movements) > 0:
                    avg_movement = float(np.mean(valid_movements))

                    pixel_to_meter = 0.001

                    if curr_belt_data.get('belt_physical_width_mm') and curr_belt_data.get('belt_width'):
                        physical_width_mm = float(curr_belt_data['belt_physical_width_mm'])
                        pixel_width = float(curr_belt_data['belt_width'])
                        if pixel_width > 0:
                            pixel_to_meter = (physical_width_mm / 1000.0) / pixel_width

                    speed_m_per_sec = abs(avg_movement) * float(fps) * pixel_to_meter
                    speed_m_per_min = speed_m_per_sec * 60.0

                    return float(speed_m_per_min)

            return 0.0

        except Exception as e:
            logger.error(f"Error calculating speed: {e}")
            return 0.0

    def calculate_vibration_from_area(self, area_history):
        """Calculate vibration from area variations"""
        try:
            if len(area_history) < 5:
                return {
                    'amplitude': 0.0,
                    'frequency': 0.0,
                    'severity': 'Low'
                }

            recent_areas = area_history[-20:] if len(area_history) >= 20 else area_history

            if len(recent_areas) > 1:
                mean_area = float(np.mean(recent_areas))
                if mean_area > 0:
                    normalized_areas = [(float(a) - mean_area) / mean_area for a in recent_areas]
                    amplitude = float(np.std(normalized_areas)) * 100.0
                else:
                    amplitude = 0.0
            else:
                amplitude = 0.0

            if amplitude < 5.0:
                severity = 'Low'
            elif amplitude < 15.0:
                severity = 'Medium'
            else:
                severity = 'High'

            return {
                'amplitude': float(amplitude),
                'frequency': 0.0,
                'severity': str(severity)
            }

        except Exception as e:
            logger.error(f"Error calculating vibration from area: {e}")
            return {
                'amplitude': 0.0,
                'frequency': 0.0,
                'severity': 'Low'
            }

    def draw_enhanced_visualizations(self, frame, belt_data, metrics):
        """Draw enhanced visualizations with area measurement display"""
        vis_frame = frame.copy()
        height, width = frame.shape[:2]

        COLOR_BLUE = (255, 0, 0)
        COLOR_GREEN = (0, 255, 0)
        COLOR_YELLOW = (0, 255, 255)
        COLOR_RED = (0, 0, 255)
        COLOR_MAGENTA = (255, 0, 255)
        COLOR_CYAN = (255, 255, 0)
        COLOR_ORANGE = (0, 165, 255)
        COLOR_WHITE = (255, 255, 255)

        if not belt_data['belt_found']:
            cv2.putText(vis_frame, "NO BELT DETECTED",
                        (width // 2 - 120, height // 2),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, COLOR_RED, 2)
            return vis_frame

        if belt_data.get('contour') is not None:
            contour = belt_data['contour']

            overlay = vis_frame.copy()
            cv2.drawContours(overlay, [contour], -1, (0, 100, 255), -1)
            cv2.addWeighted(overlay, 0.3, vis_frame, 0.7, 0, vis_frame)

            cv2.drawContours(vis_frame, [contour], -1, COLOR_YELLOW, 2)

            for point in contour[::10]:
                x, y = point[0]
                cv2.circle(vis_frame, (x, y), 2, COLOR_BLUE, -1)

            if belt_data.get('convex_hull') is not None:
                cv2.drawContours(vis_frame, [belt_data['convex_hull']], -1, COLOR_MAGENTA, 2)

            if belt_data.get('min_area_rect') is not None:
                cv2.drawContours(vis_frame, [belt_data['min_area_rect']], -1, (0, 255, 0), 2)

                rect_center = tuple(np.mean(belt_data['min_area_rect'], axis=0).astype(int))
                cv2.putText(vis_frame, "Min Area Rect",
                            (rect_center[0] - 50, rect_center[1] - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

        if belt_data.get('edges') is not None:
            edges = belt_data['edges']
            y_indices, x_indices = np.where(edges > 0)
            for x, y in zip(x_indices[:300], y_indices[:300]):
                cv2.circle(vis_frame, (x, y), 1, COLOR_GREEN, -1)

        if belt_data.get('corners') is not None:
            for corner in belt_data['corners']:
                if len(corner) == 2:
                    x, y = corner
                    cv2.circle(vis_frame, (x, y), 6, COLOR_RED, -1)

        if belt_data['belt_found'] and belt_data.get('contour') is not None:
            M = cv2.moments(belt_data['contour'])
            if M['m00'] != 0:
                centroid_x = int(M['m10'] / M['m00'])
                centroid_y = int(M['m01'] / M['m00'])
                cv2.circle(vis_frame, (centroid_x, centroid_y), 8, COLOR_CYAN, -1)
                cv2.circle(vis_frame, (centroid_x, centroid_y), 10, COLOR_CYAN, 2)

                area_text = f"Area: {belt_data['belt_area_pixels']:.0f} px²"
                if belt_data.get('belt_area_mm2'):
                    area_text += f"\n{belt_data['belt_area_mm2']:.0f} mm²"

                text_size = cv2.getTextSize(area_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)[0]
                cv2.rectangle(vis_frame,
                              (centroid_x - text_size[0] // 2 - 5, centroid_y + 20 - text_size[1] - 5),
                              (centroid_x + text_size[0] // 2 + 5, centroid_y + 20 + 5),
                              (0, 0, 0), -1)
                cv2.putText(vis_frame, area_text,
                            (centroid_x - text_size[0] // 2, centroid_y + 20),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, COLOR_WHITE, 1)

        frame_center = belt_data['frame_center']
        cv2.line(vis_frame, (frame_center, 0), (frame_center, height), (200, 200, 200), 2)

        deviation = belt_data['alignment_deviation']
        arrow_y = height - 50
        alignment_color = COLOR_ORANGE if abs(deviation) > 20 else COLOR_GREEN
        cv2.arrowedLine(vis_frame, (frame_center, arrow_y),
                        (frame_center + deviation, arrow_y), alignment_color, 3, tipLength=0.05)

        y_pos = 30
        line_height = 25

        overlay = vis_frame.copy()
        cv2.rectangle(overlay, (10, 10), (450, 300), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.6, vis_frame, 0.4, 0, vis_frame)

        cv2.putText(vis_frame, "BELT AREA ANALYSIS",
                    (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
        y_pos += line_height + 10

        cv2.putText(vis_frame, "--- AREA MEASUREMENTS ---",
                    (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 200, 100), 1)
        y_pos += line_height

        area_px = belt_data['belt_area_pixels']
        cv2.putText(vis_frame, f"Contour Area: {area_px:.0f} px²",
                    (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, COLOR_YELLOW, 2)
        y_pos += line_height

        if belt_data.get('belt_area_mm2'):
            area_mm2 = belt_data['belt_area_mm2']
            cv2.putText(vis_frame, f"Physical Area: {area_mm2:.0f} mm²",
                        (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 200), 2)
            y_pos += line_height

        hull_area = belt_data.get('convex_hull_area', 0)
        hull_efficiency = (area_px / hull_area * 100) if hull_area > 0 else 0
        cv2.putText(vis_frame, f"Convex Hull: {hull_area:.0f} px² ({hull_efficiency:.1f}% eff)",
                    (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, COLOR_MAGENTA, 2)
        y_pos += line_height

        min_rect_area = belt_data.get('min_area_rect_area', 0)
        rect_efficiency = (area_px / min_rect_area * 100) if min_rect_area > 0 else 0
        cv2.putText(vis_frame, f"Min Rect Area: {min_rect_area:.0f} px² ({rect_efficiency:.1f}% eff)",
                    (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, COLOR_GREEN, 2)
        y_pos += line_height + 5

        cv2.putText(vis_frame, "--- DIMENSIONS ---",
                    (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 255), 1)
        y_pos += line_height

        cv2.putText(vis_frame, f"Width: {belt_data['belt_width']:.1f} px",
                    (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, COLOR_CYAN, 2)
        y_pos += line_height

        cv2.putText(vis_frame, f"Height: {belt_data['belt_height']:.1f} px",
                    (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, COLOR_CYAN, 2)
        y_pos += line_height

        if belt_data.get('belt_physical_width_mm'):
            cv2.putText(vis_frame, f"Phys Width: {belt_data['belt_physical_width_mm']:.1f} mm",
                        (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 100), 2)
            y_pos += line_height

        aspect_ratio = belt_data.get('aspect_ratio', 0)
        cv2.putText(vis_frame, f"Aspect Ratio: {aspect_ratio:.2f}",
                    (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 150, 0), 2)
        y_pos += line_height

        cv2.putText(vis_frame, "--- SHAPE QUALITY ---",
                    (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 150, 255), 1)
        y_pos += line_height

        solidity = belt_data.get('solidity', 0)
        solidity_color = COLOR_GREEN if solidity > 0.85 else COLOR_ORANGE if solidity > 0.7 else COLOR_RED
        cv2.putText(vis_frame, f"Solidity: {solidity:.3f}",
                    (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, solidity_color, 2)
        y_pos += line_height

        extent = belt_data.get('extent', 0)
        extent_color = COLOR_GREEN if extent > 0.85 else COLOR_ORANGE if extent > 0.7 else COLOR_RED
        cv2.putText(vis_frame, f"Extent: {extent:.3f}",
                    (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, extent_color, 2)
        y_pos += line_height

        cv2.putText(vis_frame, "--- FEATURE COUNTS ---",
                    (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (150, 255, 255), 1)
        y_pos += line_height

        cv2.putText(vis_frame, f"Contour Points: {belt_data.get('contour_points', 0)}",
                    (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, COLOR_BLUE, 2)
        y_pos += line_height

        cv2.putText(vis_frame, f"Edge Points: {belt_data.get('edge_points', 0)}",
                    (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, COLOR_GREEN, 2)
        y_pos += line_height

        cv2.putText(vis_frame, f"Corner Points: {belt_data.get('corner_points', 0)}",
                    (20, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, COLOR_RED, 2)
        y_pos += line_height

        cv2.putText(vis_frame, f"Frame: {metrics.get('frame_number', 0)}",
                    (width - 150, height - 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, COLOR_WHITE, 2)

        warning_y = 40
        if abs(deviation) > 50:
            cv2.putText(vis_frame, "⚠ MISALIGNMENT",
                        (width - 200, warning_y),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, COLOR_ORANGE, 2)
            warning_y += 30

        if belt_data.get('solidity', 1) < 0.7:
            cv2.putText(vis_frame, "⚠ IRREGULAR SHAPE",
                        (width - 200, warning_y),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, COLOR_ORANGE, 2)
            warning_y += 30

        if area_px > 0:
            expected_area_ratio = area_px / (height * width)
            if expected_area_ratio < 0.1:
                cv2.putText(vis_frame, "⚠ SMALL BELT AREA",
                            (width - 200, warning_y),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, COLOR_ORANGE, 2)

        return vis_frame