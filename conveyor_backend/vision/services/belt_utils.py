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
        """Calculate belt speed using optical flow safely"""
        try:
            if not prev_belt_data['belt_found'] or not curr_belt_data['belt_found']:
                return 0.0

            height, width = prev_frame.shape[:2]

            # Convert frames to grayscale
            prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)
            curr_gray = cv2.cvtColor(curr_frame, cv2.COLOR_BGR2GRAY)

            # Debug: Check frame sizes
            logger.debug(f"Frame sizes - Prev: {prev_gray.shape}, Curr: {curr_gray.shape}")

            # Safe mask creation function
            def create_safe_mask(mask_data, ref_height, ref_width):
                """Create a safe mask that matches reference dimensions"""
                if mask_data is None:
                    return np.zeros((ref_height, ref_width), dtype=np.uint8)

                # If mask is a numpy array
                if isinstance(mask_data, np.ndarray):
                    mask = mask_data.astype(np.uint8)

                    # Check if mask needs resizing
                    if mask.shape != (ref_height, ref_width):
                        logger.debug(f"Resizing mask from {mask.shape} to {(ref_height, ref_width)}")
                        mask = cv2.resize(mask, (ref_width, ref_height),
                                          interpolation=cv2.INTER_NEAREST)
                        mask = (mask > 0).astype(np.uint8) * 255

                    return mask

                # If mask is a list or other type
                return np.zeros((ref_height, ref_width), dtype=np.uint8)

            # Create masks that match frame dimensions
            prev_mask = create_safe_mask(prev_belt_data.get('belt_mask'), height, width)
            curr_mask = create_safe_mask(curr_belt_data.get('belt_mask'), height, width)

            # Debug: Check mask sizes
            logger.debug(f"Mask sizes - Prev: {prev_mask.shape}, Curr: {curr_mask.shape}")

            # Verify mask dimensions match frame dimensions
            if prev_gray.shape != prev_mask.shape:
                logger.error(f"Mask shape mismatch: gray={prev_gray.shape}, mask={prev_mask.shape}")
                # Create proper mask
                prev_mask = np.zeros_like(prev_gray, dtype=np.uint8)

            if curr_gray.shape != curr_mask.shape:
                logger.error(f"Mask shape mismatch: gray={curr_gray.shape}, mask={curr_mask.shape}")
                # Create proper mask
                curr_mask = np.zeros_like(curr_gray, dtype=np.uint8)

            # Apply masks using bitwise operations
            try:
                prev_gray_masked = cv2.bitwise_and(prev_gray, prev_gray, mask=prev_mask)
                curr_gray_masked = cv2.bitwise_and(curr_gray, curr_gray, mask=curr_mask)
            except Exception as mask_error:
                logger.error(f"Error applying masks: {mask_error}")
                # Fallback: use unmasked frames
                prev_gray_masked = prev_gray.copy()
                curr_gray_masked = curr_gray.copy()

            # Check if we have enough non-zero pixels to compute optical flow
            non_zero_pixels = np.count_nonzero(prev_mask)
            if non_zero_pixels < 100:  # Too few pixels to compute reliable flow
                logger.debug(f"Insufficient mask pixels: {non_zero_pixels}")
                return 0.0

            # Compute optical flow with error handling
            try:
                flow = cv2.calcOpticalFlowFarneback(
                    prev_gray_masked, curr_gray_masked, None,
                    pyr_scale=0.5,
                    levels=3,
                    winsize=15,
                    iterations=3,
                    poly_n=5,
                    poly_sigma=1.2,
                    flags=0
                )
            except Exception as flow_error:
                logger.error(f"Error computing optical flow: {flow_error}")
                return 0.0

            if flow is None:
                logger.error("Optical flow computation returned None")
                return 0.0

            # Extract horizontal flow component
            flow_x = flow[..., 0]

            # Only consider pixels within the mask
            mask_indices = np.where(prev_mask > 0)

            if len(mask_indices[0]) == 0:
                logger.debug("No valid mask pixels for flow calculation")
                return 0.0

            movements = flow_x[mask_indices]

            # Filter out very small movements (noise)
            movement_threshold = 0.1
            valid_movements = movements[np.abs(movements) > movement_threshold]

            if len(valid_movements) == 0:
                return 0.0

            # Calculate average movement
            avg_movement = float(np.mean(valid_movements))

            # Convert pixels to meters
            pixel_to_meter = 0.001  # Default

            # Try to use physical calibration if available
            if curr_belt_data.get('belt_physical_width_mm') and curr_belt_data.get('belt_width'):
                try:
                    physical_width_mm = float(curr_belt_data['belt_physical_width_mm'])
                    pixel_width = float(curr_belt_data['belt_width'])

                    if pixel_width > 0:
                        pixel_to_meter = (physical_width_mm / 1000.0) / pixel_width
                        logger.debug(f"Using calibrated pixel_to_meter: {pixel_to_meter}")
                except Exception as calib_error:
                    logger.error(f"Error in calibration conversion: {calib_error}")

            # Calculate speed
            speed_m_per_sec = abs(avg_movement) * float(fps) * pixel_to_meter
            speed_m_per_min = speed_m_per_sec * 60.0

            logger.debug(f"Speed calculation: movement={avg_movement:.3f}px, "
                         f"fps={fps}, conversion={pixel_to_meter:.6f}, "
                         f"result={speed_m_per_min:.2f} m/min")

            return float(speed_m_per_min)

        except Exception as e:
            logger.error(f"Error calculating speed: {e}", exc_info=True)
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
        """Draw ONLY belt visualization without any text overlays"""
        vis_frame = frame.copy()

        if not belt_data['belt_found']:
            # Return frame without any text - just the original frame
            return vis_frame

        # Draw belt contour if available
        if belt_data.get('contour') is not None:
            contour = belt_data['contour']

            # Draw filled contour with semi-transparency
            overlay = vis_frame.copy()
            cv2.drawContours(overlay, [contour], -1, (0, 100, 255), -1)  # Orange fill
            cv2.addWeighted(overlay, 0.3, vis_frame, 0.7, 0, vis_frame)  # 30% transparency

            # Draw contour outline
            cv2.drawContours(vis_frame, [contour], -1, (0, 255, 0), 2)  # Green outline

        # Draw center alignment line (optional visual guide)
        height, width = frame.shape[:2]
        frame_center = belt_data['frame_center']
        cv2.line(vis_frame, (frame_center, 0), (frame_center, height), (200, 200, 200), 1)

        # Draw alignment arrow (optional visual guide)
        deviation = belt_data['alignment_deviation']
        arrow_y = height - 50
        alignment_color = (0, 165, 255) if abs(deviation) > 20 else (0, 255, 0)
        cv2.arrowedLine(vis_frame, (frame_center, arrow_y),
                        (frame_center + deviation, arrow_y), alignment_color, 2, tipLength=0.03)

        # OPTIONAL: Draw small corner points (visual only, no text)
        if belt_data.get('corners') is not None:
            for corner in belt_data['corners']:
                if len(corner) == 2:
                    x, y = corner
                    cv2.circle(vis_frame, (x, y), 3, (0, 0, 255), -1)  # Small red dots

        # OPTIONAL: Draw convex hull (visual only, no text)
        if belt_data.get('convex_hull') is not None:
            cv2.drawContours(vis_frame, [belt_data['convex_hull']], -1, (255, 0, 255), 1)

        # OPTIONAL: Draw rotated rectangle (visual only, no text)
        if belt_data.get('min_area_rect') is not None:
            cv2.drawContours(vis_frame, [belt_data['min_area_rect']], -1, (0, 255, 0), 1)

        # OPTIONAL: Draw some edge points (visual only, no text)
        if belt_data.get('edges') is not None:
            edges = belt_data['edges']
            y_indices, x_indices = np.where(edges > 0)
            for x, y in zip(x_indices[:100], y_indices[:100]):  # Limit to 100 points
                cv2.circle(vis_frame, (x, y), 1, (0, 255, 0), -1)  # Tiny green dots

        return vis_frame