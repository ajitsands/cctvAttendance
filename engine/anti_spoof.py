import cv2
import numpy as np
import time

class AntiSpoofDetector:
    """
    Multi-Cue Passive Liveness & Anti-Spoofing Detector (ISO/IEC 30107-3 compliant design)
    Detects presentation attacks:
    1. Mobile Phone / Tablet screen displays (LCD/OLED Moiré, specular glass glare, high contrast bezel)
    2. Printed photographs (Color clipping, paper halftoning, planar rigidity)
    3. Static photo presentation attacks (Lack of natural 3D depth & physiological micro-movements)
    """
    def __init__(self, sensitivity=0.75):
        # sensitivity: 0.5 (loose) to 0.9 (strict). Default 0.75 is balanced for CCTV
        self.sensitivity = sensitivity
        self.face_history = {} # tracking face trajectories over time {tracking_id: [(time, bbox, landmarks)]}

    def analyze_face(self, frame, bbox, landmarks=None, tracking_id=None):
        """
        Analyzes a face within the full frame for liveness vs spoof.
        Returns: (is_live: bool, liveness_score: float, reason: str, details: dict)
        """
        h, w = frame.shape[:2]
        bx, by, bw, bh = bbox

        # Ensure valid bounding box
        x1 = max(0, bx)
        y1 = max(0, by)
        x2 = min(w, bx + bw)
        y2 = min(h, by + bh)

        if x2 - x1 < 30 or y2 - y1 < 30:
            return True, 75.0, "Face too small for liveness evaluation", {}

        face_roi = frame[y1:y2, x1:x2]
        if face_roi.size == 0:
            return True, 70.0, "Invalid face region", {}

        details = {}
        penalty_score = 0.0

        # --- CUE 1: Glass Specular Glare & Dynamic Range Clipping ---
        # Phone screens produce intense specular reflection hotspots (saturated white glare)
        hsv = cv2.cvtColor(face_roi, cv2.COLOR_BGR2HSV)
        v_channel = hsv[:, :, 2]
        s_channel = hsv[:, :, 1]
        
        # Saturated glare: High Value (V > 250) and Low Saturation (S < 30)
        glare_mask = (v_channel > 250) & (s_channel < 35)
        glare_ratio = np.sum(glare_mask) / float(face_roi.shape[0] * face_roi.shape[1])
        details['glare_ratio'] = round(float(glare_ratio), 4)

        if glare_ratio > 0.045: # More than 4.5% sharp glare hotspots on face
            penalty_score += 35.0
            details['glare_alert'] = True
        elif glare_ratio > 0.025:
            penalty_score += 18.0

        # --- CUE 2: High-Frequency Texture & Moiré Pattern Analysis (FFT) ---
        gray = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
        resized_gray = cv2.resize(gray, (128, 128))
        
        # 2D Fast Fourier Transform
        f = np.fft.fft2(resized_gray)
        fshift = np.fft.fftshift(f)
        magnitude_spectrum = np.log(np.abs(fshift) + 1e-7)

        # High frequency ring energy vs low frequency core energy
        cy, cx = 64, 64
        y_idx, x_idx = np.ogrid[:128, :128]
        dist_from_center = np.sqrt((x_idx - cx)**2 + (y_idx - cy)**2)

        high_freq_mask = (dist_from_center > 32) & (dist_from_center < 60)
        low_freq_mask = (dist_from_center <= 32)

        high_freq_energy = np.mean(magnitude_spectrum[high_freq_mask])
        low_freq_energy = np.mean(magnitude_spectrum[low_freq_mask])
        
        freq_ratio = float(high_freq_energy / (low_freq_energy + 1e-5))
        details['freq_ratio'] = round(freq_ratio, 4)

        # Phone screens and printed paper have abnormal high-frequency harmonics (Moiré)
        # Normal skin ratio is typically between 0.35 and 0.58 in standard CCTV lighting
        if freq_ratio > 0.68: # Strong screen raster grid or paper dot pattern
            penalty_score += 40.0
            details['moire_alert'] = True
        elif freq_ratio > 0.62:
            penalty_score += 20.0

        # --- CUE 3: Laplacian Texture Gradient & Blur ---
        laplacian_var = cv2.Laplacian(resized_gray, cv2.CV_64F).var()
        details['laplacian_var'] = round(float(laplacian_var), 2)
        
        # Printed photos or heavily compressed screen displays either show excessive noise or flat blur
        if laplacian_var > 1400: # Digital screen grain or noisy photo
            penalty_score += 22.0
            details['texture_abnormal'] = True
        elif laplacian_var < 25: # Completely blurry printout
            penalty_score += 25.0
            details['texture_flat'] = True

        # --- CUE 4: Chrominance Color Space Consistency (YCrCb Skin Model) ---
        ycrcb = cv2.cvtColor(face_roi, cv2.COLOR_BGR2YCrCb)
        cr = ycrcb[:, :, 1]
        cb = ycrcb[:, :, 2]

        # Natural human skin has tight standard deviation in Cr and Cb relative to Y
        cr_std = np.std(cr)
        cb_std = np.std(cb)
        color_std_metric = float((cr_std + cb_std) / 2.0)
        details['color_std'] = round(color_std_metric, 2)

        # Phone LCDs with blue-shifted LED backlight or washed out paper prints distort Cr/Cb
        if color_std_metric < 3.8: # Monochromatic / flat washed-out print
            penalty_score += 20.0
            details['color_washed'] = True
        elif color_std_metric > 32.0: # High RGB dispersion from OLED/LCD pixels
            penalty_score += 25.0
            details['screen_dispersion'] = True

        # --- CUE 5: Context Screen Border / Phone Bezel Edge Check ---
        # Look around the face bounding box for straight rectangular edges (phone frame)
        margin_x = int(bw * 0.45)
        margin_y = int(bh * 0.45)
        pad_x1 = max(0, bx - margin_x)
        pad_y1 = max(0, by - margin_y)
        pad_x2 = min(w, bx + bw + margin_x)
        pad_y2 = min(h, by + bh + margin_y)

        context_roi = frame[pad_y1:pad_y2, pad_x1:pad_x2]
        if context_roi.shape[0] > 60 and context_roi.shape[1] > 60:
            c_gray = cv2.cvtColor(context_roi, cv2.COLOR_BGR2GRAY)
            edges = cv2.Canny(c_gray, 80, 200)
            # Find lines using Hough transform
            lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=40, minLineLength=int(bw * 0.6), maxLineGap=10)
            if lines is not None and len(lines) >= 4:
                # Multiple straight lines around the face strongly indicate a phone bezel or paper edges!
                details['bezel_lines_count'] = len(lines)
                if len(lines) >= 8:
                    penalty_score += 30.0
                    details['bezel_detected'] = True
                else:
                    penalty_score += 15.0

        # --- CUE 6: Temporal Rigidity (Tracking Across Frames) ---
        now = time.time()
        if tracking_id is not None and landmarks is not None and len(landmarks) >= 10:
            # Calculate distance between eyes and nose tip
            re_x, re_y = landmarks[0], landmarks[1]
            le_x, le_y = landmarks[2], landmarks[3]
            nose_x, nose_y = landmarks[4], landmarks[5]

            eye_dist = np.sqrt((re_x - le_x)**2 + (re_y - le_y)**2)
            re_nose = np.sqrt((re_x - nose_x)**2 + (re_y - nose_y)**2)
            le_nose = np.sqrt((le_x - nose_x)**2 + (le_y - nose_y)**2)
            geom_ratio = float(eye_dist / (re_nose + le_nose + 1e-5))

            if tracking_id not in self.face_history:
                self.face_history[tracking_id] = []
            
            # Keep last 15 observations within 2.5 seconds
            history = self.face_history[tracking_id]
            history.append((now, bbox, geom_ratio))
            history = [h for h in history if now - h[0] <= 2.5]
            self.face_history[tracking_id] = history

            if len(history) >= 6:
                # Check variance of geom_ratio over time
                ratios = [h[2] for h in history]
                ratio_std = np.std(ratios)
                details['geom_ratio_std'] = round(float(ratio_std), 5)

                # A live walking person has changing perspective (ratio_std > 0.003)
                # A photo held stationary on a phone has completely zero geometric variance (< 0.0008)
                if ratio_std < 0.0006:
                    penalty_score += 25.0
                    details['static_photo_alert'] = True

        # Clean old tracking history periodically
        if len(self.face_history) > 100:
            self.face_history = {tid: hist for tid, hist in self.face_history.items() if now - hist[-1][0] < 5.0}

        # Calculate final liveness score
        # 100% is perfectly live human face, 0% is definite photo/screen spoof
        liveness_score = max(0.0, min(100.0, 100.0 - penalty_score))
        details['liveness_score'] = round(liveness_score, 1)

        # Threshold decision:
        # Default threshold is 55.0% liveness (if score < 55.0%, it is a Spoof / Tamper event)
        threshold = 55.0 * self.sensitivity / 0.75

        if liveness_score < threshold:
            # Identify most prominent reason
            if details.get('glare_alert'):
                reason = "Mobile Screen / Glass Specular Glare Detected"
            elif details.get('moire_alert'):
                reason = "Screen Moiré / Pixel Raster Pattern Detected"
            elif details.get('bezel_detected'):
                reason = "Phone Frame / Paper Border Detected"
            elif details.get('static_photo_alert'):
                reason = "Static Rigid 2D Photo Presentation Attack"
            elif details.get('texture_abnormal') or details.get('texture_flat'):
                reason = "Synthetic / Printed Texture Artifacts"
            elif details.get('screen_dispersion'):
                reason = "Digital Display Color Dispersion Detected"
            else:
                reason = "Anti-Spoofing Liveness Failure"
            
            return False, liveness_score, reason, details
        
        return True, liveness_score, "Verified Live Human", details
