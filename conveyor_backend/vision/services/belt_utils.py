import cv2
import numpy as np
import logging
import math

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

    def calculate_speed_fast(self, prev_frame_gray, curr_frame_gray, prev_belt_data, curr_belt_data, fps):
        """
        Calculate belt speed using optical flow limited to the belt mask.
        Returns speed in meters/second (m/s).
        Inputs prev_frame_gray and curr_frame_gray must be grayscale images (same dims).
        prev_belt_data and curr_belt_data should contain 'belt_mask' (full-frame uint8 mask)
        and optionally calibrated 'belt_physical_width_mm' / 'belt_width' for pixel->meter mapping.
        """
        try:
            # Basic checks
            if prev_belt_data is None or curr_belt_data is None:
                return 0.0
            if not prev_belt_data.get('belt_found') or not curr_belt_data.get('belt_found'):
                return 0.0
            if prev_frame_gray is None or curr_frame_gray is None:
                return 0.0

            # Ensure masks exist and match frames
            height, width = prev_frame_gray.shape[:2]

            def safe_mask(mask):
                if mask is None:
                    return np.zeros((height, width), dtype=np.uint8)
                if isinstance(mask, np.ndarray):
                    m = mask.astype(np.uint8)
                    if m.shape != (height, width):
                        try:
                            m = cv2.resize(m, (width, height), interpolation=cv2.INTER_NEAREST)
                        except Exception:
                            m = np.zeros((height, width), dtype=np.uint8)
                    # Ensure binary 0/255
                    m = (m > 0).astype(np.uint8) * 255
                    return m
                return np.zeros((height, width), dtype=np.uint8)

            prev_mask = safe_mask(prev_belt_data.get('belt_mask'))
            curr_mask = safe_mask(curr_belt_data.get('belt_mask'))

            # Apply masks
            try:
                prev_masked = cv2.bitwise_and(prev_frame_gray, prev_frame_gray, mask=prev_mask)
                curr_masked = cv2.bitwise_and(curr_frame_gray, curr_frame_gray, mask=curr_mask)
            except Exception as e:
                logger.error(f"Mask application error: {e}")
                prev_masked = prev_frame_gray.copy()
                curr_masked = curr_frame_gray.copy()

            # Check enough pixels
            non_zero = np.count_nonzero(prev_mask)
            if non_zero < 50:
                return 0.0

            # Optical flow (Farneback)
            try:
                flow = cv2.calcOpticalFlowFarneback(prev_masked, curr_masked, None,
                                                    pyr_scale=0.5, levels=3, winsize=15,
                                                    iterations=3, poly_n=5, poly_sigma=1.2, flags=0)
            except Exception as e:
                logger.error(f"Optical flow error: {e}")
                return 0.0

            if flow is None:
                return 0.0

            flow_x = flow[..., 0]

            # Only use flow where prev_mask > 0
            mask_idx = prev_mask > 0
            if np.count_nonzero(mask_idx) == 0:
                return 0.0

            movements = flow_x[mask_idx]

            # Filter tiny movements (noise)
            movement_threshold = 0.05
            valid = movements[np.abs(movements) > movement_threshold]
            if valid.size == 0:
                return 0.0

            avg_px_per_frame = float(np.mean(valid))

            # Convert pixels/frame -> meters/sec
            # Determine pixel_to_meter from calibration if available, otherwise default guess:
            pixel_to_meter = 0.001  # default meters per pixel (1 mm per px)
            try:
                if curr_belt_data.get('belt_physical_width_mm') and curr_belt_data.get('belt_width'):
                    physical_mm = float(curr_belt_data['belt_physical_width_mm'])
                    pixel_width = float(curr_belt_data['belt_width'])
                    if pixel_width > 0:
                        pixel_to_meter = (physical_mm / 1000.0) / pixel_width
                elif curr_belt_data.get('belt_height') and curr_belt_data.get('belt_physical_height_mm'):
                    physical_mm = float(curr_belt_data['belt_physical_height_mm'])
                    pixel_height = float(curr_belt_data['belt_height'])
                    if pixel_height > 0:
                        pixel_to_meter = (physical_mm / 1000.0) / pixel_height
            except Exception as e:
                logger.debug(f"Calibration parse error: {e}")

            # pixels/frame * fps = pixels/sec -> * pixel_to_meter = meters/sec
            speed_m_s = abs(avg_px_per_frame) * float(fps) * pixel_to_meter

            logger.debug(f"Optical flow avg_px/frame={avg_px_per_frame:.4f}, fps={fps}, px->m={pixel_to_meter:.6f}, speed_m/s={speed_m_s:.4f}")
            return float(speed_m_s)

        except Exception as e:
            logger.exception(f"Error calculating speed: {e}")
            return 0.0

    def calculate_speed_kmh(self, prev_frame_gray, curr_frame_gray, prev_belt_data, curr_belt_data, fps, calibration_data=None):
        """Wrapper returning km/h"""
        try:
            speed_m_s = self.calculate_speed_fast(prev_frame_gray, curr_frame_gray, prev_belt_data, curr_belt_data, fps)
            return float(speed_m_s * 3.6)
        except Exception as e:
            logger.error(f"Error calculating speed_kmh: {e}")
            return 0.0

    def calculate_vibration_from_area(self, area_history):
        """Calculate vibration from area variations"""
        try:
            if len(area_history) < 5:
                return {'amplitude': 0.0, 'frequency': 0.0, 'severity': 'Low'}
            recent = area_history[-20:] if len(area_history) >= 20 else area_history
            mean_area = float(np.mean(recent))
            amplitude = float(np.std([(a - mean_area) / mean_area for a in recent])) * 100.0 if mean_area > 0 else 0.0
            if amplitude < 5.0:
                severity = 'Low'
            elif amplitude < 15.0:
                severity = 'Medium'
            else:
                severity = 'High'
            return {'amplitude': float(amplitude), 'frequency': 0.0, 'severity': severity}
        except Exception as e:
            logger.error(f"Error calculating vibration from area: {e}")
            return {'amplitude': 0.0, 'frequency': 0.0, 'severity': 'Low'}

    def draw_enhanced_visualizations(self, frame, belt_data, metrics):
        """Draw robust visualizations on the provided BGR frame with dark background for text."""
        try:
            vis = frame.copy()
            h, w = vis.shape[:2]

            # Colors
            COLOR_GREEN = (0, 255, 0)
            COLOR_RED = (0, 0, 255)
            COLOR_BLUE = (255, 0, 0)
            COLOR_CYAN = (255, 255, 0)
            COLOR_YELLOW = (0, 255, 255)
            COLOR_ORANGE = (0, 165, 255)
            COLOR_WHITE = (255, 255, 255)
            COLOR_BG = (0, 0, 0)  # dark background

            # If no belt, show message
            if not belt_data.get('belt_found', False):
                cv2.putText(vis, "NO BELT DETECTED", (w // 2 - 150, h // 2),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.0, COLOR_RED, 2, cv2.LINE_AA)
                return vis

            # Draw contours, edges, lines, etc. (existing logic)
            contour = belt_data.get('contour')
            if contour is not None and len(contour) > 2:
                try:
                    cv2.drawContours(vis, [contour], -1, COLOR_GREEN, 2)
                except Exception:
                    cnt = np.array(contour, dtype=np.int32).reshape(-1, 1, 2)
                    cv2.drawContours(vis, [cnt], -1, COLOR_GREEN, 2)

            if belt_data.get('convex_hull') is not None:
                cv2.drawContours(vis, [belt_data['convex_hull']], -1, COLOR_CYAN, 2)
            if belt_data.get('min_area_rect') is not None:
                try:
                    cv2.drawContours(vis, [belt_data['min_area_rect']], -1, COLOR_BLUE, 2)
                except Exception:
                    pass

            edges = belt_data.get('edges')
            mask = belt_data.get('belt_mask')
            if edges is not None and mask is not None and edges.shape == mask.shape:
                edges_mask = np.logical_and(edges > 0, mask > 0)
                ys, xs = np.where(edges_mask)
                for x, y in zip(xs[:1000], ys[:1000]):
                    if 0 <= x < w and 0 <= y < h:
                        vis[y, x] = COLOR_RED

            left_edge = belt_data.get('left_edge') or []
            right_edge = belt_data.get('right_edge') or []
            if len(left_edge) > 2:
                pts = np.array(left_edge).reshape(-1, 1, 2).astype(np.int32)
                cv2.polylines(vis, [pts], isClosed=False, color=COLOR_BLUE, thickness=3)
            if len(right_edge) > 2:
                pts = np.array(right_edge).reshape(-1, 1, 2).astype(np.int32)
                cv2.polylines(vis, [pts], isClosed=False, color=COLOR_CYAN, thickness=3)

            damaged = belt_data.get('damaged_points') or []
            for (x, y) in damaged:
                if 0 <= x < w and 0 <= y < h:
                    cv2.circle(vis, (x, y), 4, COLOR_RED, -1)

            if contour is not None:
                try:
                    M = cv2.moments(contour)
                    if M.get('m00', 0) != 0:
                        cx = int(M['m10'] / M['m00'])
                        cy = int(M['m01'] / M['m00'])
                        cv2.circle(vis, (cx, cy), 6, COLOR_YELLOW, -1)
                        cv2.circle(vis, (cx, cy), 8, COLOR_YELLOW, 2)
                except Exception:
                    pass

            frame_center = belt_data.get('frame_center', w // 2)
            cv2.line(vis, (frame_center, 0), (frame_center, h), (200, 200, 200), 1)
            deviation = int(belt_data.get('alignment_deviation', 0))
            arrow_y = h - 40
            color_align = COLOR_ORANGE if abs(deviation) > 30 else COLOR_GREEN
            cv2.arrowedLine(vis, (frame_center, arrow_y), (frame_center + deviation, arrow_y), color_align, 3,
                            tipLength=0.05)

            # Metrics text overlay with dark background
            y0 = 20
            dy = 22
            metrics_lines = [
                f"Speed: {metrics.get('speed', 0.0):.2f} km/h",
                f"Avg Speed: {metrics.get('avg_speed', 0.0):.2f} km/h",
                f"Alignment: {deviation} px",
                f"Area: {belt_data.get('belt_area_pixels', 0):.0f} px",
                f"Edges (pts): {belt_data.get('edge_points', 0)}",
                f"Contour pts: {belt_data.get('contour_points', 0)}",
                f"Damaged pts: {len(damaged)}"
            ]

            # Dark rectangle
            rect_height = len(metrics_lines) * dy + 10
            cv2.rectangle(vis, (5, 5), (320, 5 + rect_height), (0, 0, 0), -1)  # filled dark rectangle
            overlay_alpha = 0.6
            vis[5:5 + rect_height, 5:320] = cv2.addWeighted(vis[5:5 + rect_height, 5:320], overlay_alpha,
                                                            np.zeros_like(vis[5:5 + rect_height, 5:320]), 0, 0)

            for i, line in enumerate(metrics_lines):
                cv2.putText(vis, line, (10, y0 + i * dy), cv2.FONT_HERSHEY_SIMPLEX, 0.55, COLOR_WHITE, 1, cv2.LINE_AA)

            # Warnings
            wy = y0 + len(metrics_lines) * dy + 8
            if abs(deviation) > 50:
                cv2.putText(vis, "⚠ MISALIGNMENT", (10, wy), cv2.FONT_HERSHEY_SIMPLEX, 0.7, COLOR_ORANGE, 2,
                            cv2.LINE_AA)
                wy += 28
            try:
                hull_area = float(belt_data.get('convex_hull_area', 0.0)) or 0.0
                contour_area = float(belt_data.get('belt_area_pixels', 0.0)) or 0.0
                if hull_area > 0 and contour_area / hull_area < 0.8:
                    cv2.putText(vis, "⚠ EDGE DAMAGE SUSPECTED", (10, wy), cv2.FONT_HERSHEY_SIMPLEX, 0.7, COLOR_RED, 2,
                                cv2.LINE_AA)
            except Exception:
                pass

            return vis

        except Exception as e:
            logger.exception(f"Error drawing visualizations: {e}")
            return frame
