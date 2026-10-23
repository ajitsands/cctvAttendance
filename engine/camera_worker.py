import os
import sys
import time
import json
import base64
import threading
import urllib.parse
import socket
import cv2
import numpy as np
import requests
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

# Essential low-latency settings:
# - rtsp_transport;tcp: prevents UDP packet drops
# - fflags;nobuffer: completely eliminates FFmpeg internal input buffer
# - flags;low_delay: instructs decoder to use minimal latency
# - max_delay;0: drop any accumulated network packets immediately
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|fflags;nobuffer|flags;low_delay|max_delay;0"
os.environ["OPENCV_LOG_LEVEL"] = "SILENT"

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from face_engine import OfflineFaceEngine
from anti_spoof import AntiSpoofDetector

PHP_API_URL = os.environ.get("PHP_API_URL", "http://127.0.0.1:8000/api")
ENGINE_PORT = int(os.environ.get("ENGINE_PORT", 8001))

class LowLatencyCameraWorker:
    """
    Decoupled Multi-Threaded RTSP Engine for an individual camera:
    - Thread 1 (Capture): Continuously reads RTSP frames with zero buffering.
    - Thread 2 (AI): Asynchronous YuNet face detection & SFace feature extraction.
    - Thread 3 (Render): High-contrast HUD and pre-encoded JPEG stream.
    """
    def __init__(self, camera_id=1, rtsp_url="", role="IN", gate="Main Gate", camera_name="Camera", ip="192.168.100.113"):
        self.camera_id = camera_id
        self.rtsp_url = rtsp_url
        self.role = role.upper() if role else "IN"
        self.gate = gate
        self.camera_name = camera_name
        self.ip = ip
        self.is_running = False

        # Face AI Engine (YuNet + SFace)
        self.engine = OfflineFaceEngine(score_threshold=0.50)
        self.enrolled_users = []
        self.users_lock = threading.Lock()
        self.last_punch_time = {}
        self.cooldown_seconds = 60

        # Version 2.0: Blacklist & Guest Tracking structures
        self.enrolled_blacklist = []
        self.blacklist_lock = threading.Lock()
        self.last_blacklist_alert_time = {}

        self.enrolled_guests = []
        self.guests_lock = threading.Lock()
        self.last_guest_punch_time = {}
        self.last_unknown_enroll_time = 0

        # Version 2.1: Anti-Spoofing & Tamper Detection
        self.anti_spoof = AntiSpoofDetector(sensitivity=0.75)
        self.last_tamper_alert_time = {}

        # Frame buffers & locks
        self.latest_raw_frame = None
        self.latest_frame_time = 0
        self.raw_frame_id = 0
        self.frame_lock = threading.Lock()

        # Detections
        self.current_detections = []
        self.detections_lock = threading.Lock()

        # JPEG encoded frame ready for web clients
        self.latest_jpeg = None
        self.jpeg_id = 0
        self.jpeg_lock = threading.Lock()

        # Metrics
        self.fps = 0
        self.frame_count = 0
        self.is_connected = False

    def set_enrolled_users(self, users):
        with self.users_lock:
            self.enrolled_users = list(users)

    def set_blacklisted_persons(self, blacklisted):
        with self.blacklist_lock:
            self.enrolled_blacklist = list(blacklisted)

    def set_guests(self, guests):
        with self.guests_lock:
            self.enrolled_guests = list(guests)

    def trigger_punch(self, user, confidence, frame_snapshot=None):
        uid = user["id"]
        now = time.time()

        if uid in self.last_punch_time:
            if now - self.last_punch_time[uid] < self.cooldown_seconds:
                return

        self.last_punch_time[uid] = now
        print(f"[Camera {self.camera_id} - {self.role}] >>> PUNCH DETECTED: {user['full_name']} ({user['user_code']}) as {self.role} at {self.gate} - Conf: {confidence}%")

        payload = {
            "user_id": uid,
            "camera_id": self.camera_id,
            "direction": self.role,
            "gate_name": self.gate,
            "confidence_score": confidence,
            "punch_time": time.strftime("%Y-%m-%d %H:%M:%S")
        }

        if frame_snapshot is not None:
            try:
                _, buffer = cv2.imencode('.jpg', frame_snapshot, [cv2.IMWRITE_JPEG_QUALITY, 80])
                b64_snap = base64.b64encode(buffer).decode('utf-8')
                payload["snapshot"] = f"data:image/jpeg;base64,{b64_snap}"
            except Exception:
                pass

        try:
            requests.post(f"{PHP_API_URL}/attendance.php?action=punch", json=payload, timeout=2)
        except Exception as e:
            print(f"[Camera {self.camera_id}] Punch delivery note: {e}")

    def trigger_blacklist_breach(self, person, confidence, frame_snapshot=None):
        pid = person["id"]
        now = time.time()
        if pid in self.last_blacklist_alert_time:
            if now - self.last_blacklist_alert_time[pid] < 15: # 15s cooldown
                return
        self.last_blacklist_alert_time[pid] = now
        print(f"[SECURITY ALERT] 🚨 BLACKLIST DETECTED: {person['full_name']} ({person.get('person_code')}) - Threat: {person.get('threat_level')} at {self.gate} ({self.role})!")

        payload = {
            "blacklisted_person_id": pid,
            "camera_id": self.camera_id,
            "gate_name": self.gate,
            "direction": self.role,
            "confidence_score": confidence
        }
        if frame_snapshot is not None:
            try:
                _, buffer = cv2.imencode('.jpg', frame_snapshot, [cv2.IMWRITE_JPEG_QUALITY, 85])
                b64_snap = base64.b64encode(buffer).decode('utf-8')
                payload["snapshot"] = f"data:image/jpeg;base64,{b64_snap}"
            except Exception as ex:
                print(f"[Camera {self.camera_id}] Blacklist snapshot encode error: {ex}")
        try:
            requests.post(f"{PHP_API_URL}/blacklist.php?action=log_breach", json=payload, timeout=6)
        except Exception as e:
            print(f"[Camera {self.camera_id}] Blacklist breach alert note: {e}")

    def trigger_guest_movement(self, guest, confidence, frame_snapshot=None, full_frame=None):
        gid = guest["id"]
        now = time.time()
        if gid in self.last_guest_punch_time:
            if now - self.last_guest_punch_time[gid] < 30: # 30s cooldown
                return
        self.last_guest_punch_time[gid] = now
        print(f"[Camera {self.camera_id} - {self.role}] >>> GUEST MOVEMENT: {guest.get('guest_name', 'Guest')} ({guest.get('guest_code')}) as {self.role} at {self.gate}")

        payload = {
            "guest_id": gid,
            "camera_id": self.camera_id,
            "gate_name": self.gate,
            "direction": self.role,
            "confidence_score": confidence
        }
        if frame_snapshot is not None:
            try:
                _, buffer = cv2.imencode('.jpg', frame_snapshot, [cv2.IMWRITE_JPEG_QUALITY, 85])
                b64_snap = base64.b64encode(buffer).decode('utf-8')
                payload["snapshot"] = f"data:image/jpeg;base64,{b64_snap}"
            except Exception as ex:
                print(f"[Camera {self.camera_id}] Guest snapshot encode error: {ex}")

        # Full-screen camera frame capture to identify group arrival or companions
        if full_frame is not None:
            try:
                _, full_buf = cv2.imencode('.jpg', full_frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                b64_full = base64.b64encode(full_buf).decode('utf-8')
                payload["full_snapshot"] = f"data:image/jpeg;base64,{b64_full}"
            except Exception as ex:
                print(f"[Camera {self.camera_id}] Guest full screen encode error: {ex}")

        try:
            requests.post(f"{PHP_API_URL}/guests.php?action=record_movement", json=payload, timeout=6)
        except Exception as e:
            print(f"[Camera {self.camera_id}] Guest movement note: {e}")

    def trigger_new_guest_enroll(self, embedding, confidence, frame_snapshot=None, full_frame=None):
        now = time.time()
        if now - self.last_unknown_enroll_time < 3: # Responsive 3s cooldown
            return
        self.last_unknown_enroll_time = now
        print(f"[Camera {self.camera_id} - {self.role}] >>> UNKNOWN PERSON: Auto-enrolling new Guest / Customer at {self.gate} ({self.role})...")

        payload = {
            "face_embedding": embedding,
            "camera_id": self.camera_id,
            "gate_name": self.gate,
            "direction": self.role,
            "confidence_score": confidence
        }
        if frame_snapshot is not None:
            try:
                _, buffer = cv2.imencode('.jpg', frame_snapshot, [cv2.IMWRITE_JPEG_QUALITY, 85])
                b64_snap = base64.b64encode(buffer).decode('utf-8')
                payload["snapshot"] = f"data:image/jpeg;base64,{b64_snap}"
            except Exception as ex:
                print(f"[Camera {self.camera_id}] Unknown snapshot encode error: {ex}")

        # Full-screen camera frame capture to identify group arrival or companions
        if full_frame is not None:
            try:
                _, full_buf = cv2.imencode('.jpg', full_frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                b64_full = base64.b64encode(full_buf).decode('utf-8')
                payload["full_snapshot"] = f"data:image/jpeg;base64,{b64_full}"
            except Exception as ex:
                print(f"[Camera {self.camera_id}] Unknown full screen encode error: {ex}")

        try:
            resp = requests.post(f"{PHP_API_URL}/guests.php?action=record_movement", json=payload, timeout=6)
            if resp.status_code == 201:
                threading.Thread(target=manager.sync_guests, daemon=True).start()
        except Exception as e:
            print(f"[Camera {self.camera_id}] New guest enrollment note: {e}")

    def trigger_tamper_incident(self, user, liveness_score, confidence, reason, whole_frame=None):
        uid = user.get("id") or 0
        now = time.time()
        cooldown_key = f"{uid}_{user.get('user_code')}"
        if cooldown_key in self.last_tamper_alert_time:
            if now - self.last_tamper_alert_time[cooldown_key] < 12: # 12s cooldown per targeted person
                return
        self.last_tamper_alert_time[cooldown_key] = now
        print(f"[TAMPER ALERT] 🚫 PRESENTATION ATTACK BLOCKED: {user.get('full_name')} ({user.get('user_code')}) - Liveness: {liveness_score}%, Reason: {reason} at {self.gate}!")

        payload = {
            "user_id": uid if uid > 0 else None,
            "target_name": user.get("full_name", "Unknown"),
            "target_code": user.get("user_code", ""),
            "camera_id": self.camera_id,
            "gate_name": self.gate,
            "direction": self.role,
            "event_type": "Photo / Screen Presentation Attack",
            "reason": reason,
            "liveness_score": liveness_score,
            "confidence_score": confidence,
            "detected_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }

        if whole_frame is not None:
            try:
                # Capture the WHOLE camera screen (entire frame) as requested by the user
                _, buffer = cv2.imencode('.jpg', whole_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                b64_snap = base64.b64encode(buffer).decode('utf-8')
                payload["snapshot"] = f"data:image/jpeg;base64,{b64_snap}"
            except Exception as ex:
                print(f"[Camera {self.camera_id}] Tamper whole-screen snapshot encode error: {ex}")

        try:
            requests.post(f"{PHP_API_URL}/tamper.php?action=log_tamper", json=payload, timeout=6)
        except Exception as e:
            print(f"[Camera {self.camera_id}] Tamper incident delivery note: {e}")

    def _capture_loop(self):
        """Dedicated high-speed thread: continuously reads RTSP frames to prevent socket buffer accumulation."""
        print(f"[Camera {self.camera_id}] Capture thread started on {self.rtsp_url} ({self.role} Gate)...")
        fps_counter = 0
        fps_timer = time.time()

        while self.is_running:
            if not self.rtsp_url:
                time.sleep(1.0)
                continue

            cap = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

            if not cap.isOpened():
                self.is_connected = False
                time.sleep(2.0)
                continue

            self.is_connected = True
            print(f"[Camera {self.camera_id} ({self.role})] >>> RTSP Connected: {self.ip} <<<")

            while self.is_running and cap.isOpened():
                ret, frame = cap.read()
                if not ret or frame is None:
                    self.is_connected = False
                    break

                now = time.time()
                with self.frame_lock:
                    self.latest_raw_frame = frame
                    self.latest_frame_time = now
                    self.raw_frame_id += 1

                self.frame_count += 1
                fps_counter += 1
                if now - fps_timer >= 1.0:
                    self.fps = fps_counter
                    fps_counter = 0
                    fps_timer = now

            cap.release()
            time.sleep(0.5)

    def _ai_loop(self):
        """Asynchronous face recognition thread: processes latest frame without stalling video ingest."""
        last_processed_id = -1
        scale_w, scale_h = 640, 360 # 16:9 ratio matching 1920x1080 (takes ~20ms on YuNet)

        while self.is_running:
            raw_frame = None
            curr_id = 0
            with self.frame_lock:
                if self.latest_raw_frame is not None and self.raw_frame_id != last_processed_id:
                    raw_frame = self.latest_raw_frame
                    curr_id = self.raw_frame_id

            if raw_frame is None:
                time.sleep(0.01)
                continue

            last_processed_id = curr_id
            h, w = raw_frame.shape[:2]
            scale_x = w / scale_w
            scale_y = h / scale_h

            try:
                small = cv2.resize(raw_frame, (scale_w, scale_h))
                self.engine.detector.setInputSize((scale_w, scale_h))
                _, faces = self.engine.detector.detect(small)

                new_detected = []
                if faces is not None and len(faces) > 0:
                    with self.users_lock:
                        users_list = list(self.enrolled_users)

                    for face in faces[:5]:
                        conf = float(face[-1])
                        if conf < 0.40:
                            continue

                        orig_face = face.copy()
                        orig_face[0] *= scale_x
                        orig_face[1] *= scale_y
                        orig_face[2] *= scale_x
                        orig_face[3] *= scale_y
                        for p in range(4, 14, 2):
                            orig_face[p] *= scale_x
                            orig_face[p+1] *= scale_y

                        aligned = self.engine.recognizer.alignCrop(raw_frame, orig_face)
                        feature = self.engine.recognizer.feature(aligned)
                        emb = feature.flatten().tolist()

                        bx = int(orig_face[0])
                        by = int(orig_face[1])
                        bw = int(orig_face[2])
                        bh = int(orig_face[3])
                        bbox = [bx, by, bw, bh]

                        # Add 25% padding margin around face box for optimal portrait capture
                        margin_x = int(bw * 0.25)
                        margin_y = int(bh * 0.25)
                        y1 = max(0, by - margin_y)
                        y2 = min(h, by + bh + margin_y)
                        x1 = max(0, bx - margin_x)
                        x2 = min(w, bx + bw + margin_x)
                        crop = raw_frame[y1:y2, x1:x2]
                        crop_copy = crop.copy() if crop.size > 0 else raw_frame.copy()

                        # TIER 1: Check Blacklisted Persons (Zero-Tolerance Security Priority)
                        best_blk = None
                        best_blk_score = -1.0
                        best_blk_conf = 0.0
                        with self.blacklist_lock:
                            blk_list = list(self.enrolled_blacklist)

                        for b in blk_list:
                            is_match, score, norm_conf = self.engine.compare_embeddings(emb, b["embedding"])
                            if is_match and score > best_blk_score:
                                best_blk_score = score
                                best_blk = b
                                best_blk_conf = norm_conf

                        if best_blk:
                            new_detected.append((bbox, best_blk["full_name"], best_blk_conf, "BLACKLIST", best_blk.get("threat_level", "HIGH")))
                            threading.Thread(
                                target=self.trigger_blacklist_breach,
                                args=(best_blk, best_blk_conf, crop_copy),
                                daemon=True
                            ).start()
                            continue

                        # TIER 2: Check Active Employees / Staff
                        best_user = None
                        best_user_score = -1.0
                        best_user_conf = 0.0
                        for u in users_list:
                            is_match, score, norm_conf = self.engine.compare_embeddings(emb, u["embedding"])
                            if is_match and score > best_user_score:
                                best_user_score = score
                                best_user = u
                                best_user_conf = norm_conf

                        if best_user:
                            # Version 2.1: Liveness & Anti-Spoofing presentation attack check
                            landmarks_pts = [orig_face[p] for p in range(4, 14)]
                            is_live, liveness_score, reason, details = self.anti_spoof.analyze_face(
                                raw_frame, bbox, landmarks=landmarks_pts, tracking_id=f"emp_{best_user['id']}"
                            )

                            if not is_live:
                                # Block punch, draw warning HUD, and log WHOLE camera screen frame!
                                new_detected.append((bbox, best_user["full_name"], best_user_conf, "TAMPER", reason))
                                threading.Thread(
                                    target=self.trigger_tamper_incident,
                                    args=(best_user, liveness_score, best_user_conf, reason, raw_frame.copy()),
                                    daemon=True
                                ).start()
                                continue

                            new_detected.append((bbox, best_user["full_name"], best_user_conf, "EMPLOYEE", best_user.get("user_code", "")))
                            threading.Thread(
                                target=self.trigger_punch,
                                args=(best_user, best_user_conf, crop_copy),
                                daemon=True
                            ).start()
                            continue

                        # TIER 3: Check Existing Guests / Customers
                        best_guest = None
                        best_guest_score = -1.0
                        best_guest_conf = 0.0
                        with self.guests_lock:
                            gst_list = list(self.enrolled_guests)

                        for g in gst_list:
                            is_match, score, norm_conf = self.engine.compare_embeddings(emb, g["embedding"])
                            if is_match and score > best_guest_score:
                                best_guest_score = score
                                best_guest = g
                                best_guest_conf = norm_conf

                        if best_guest:
                            g_name = best_guest.get("guest_name", "Guest")
                            g_code = best_guest.get("guest_code", "GST")
                            new_detected.append((bbox, g_name, best_guest_conf, "GUEST", g_code))
                            threading.Thread(
                                target=self.trigger_guest_movement,
                                args=(best_guest, best_guest_conf, crop_copy, raw_frame.copy()),
                                daemon=True
                            ).start()
                        else:
                            # Brand new unknown face -> Auto-enroll as Guest!
                            new_detected.append((bbox, "New Guest / Customer", round(conf * 100, 1), "NEW_GUEST", "Auto-Enrolling..."))
                            threading.Thread(
                                target=self.trigger_new_guest_enroll,
                                args=(emb, round(conf * 100, 1), crop_copy, raw_frame.copy()),
                                daemon=True
                            ).start()

                with self.detections_lock:
                    self.current_detections = new_detected
            except Exception:
                pass

            time.sleep(0.015)

    def _render_loop(self):
        """Pre-encodes live frame with futuristic HUD at ~30 FPS ready for instant client dispatch."""
        target_w, target_h = 800, 450
        role_label = f"CAMERA {self.camera_id} • {self.role} (GATE)"

        while self.is_running:
            raw_frame = None
            is_conn = False
            with self.frame_lock:
                if self.latest_raw_frame is not None:
                    raw_frame = self.latest_raw_frame.copy()
                    is_conn = self.is_connected

            if raw_frame is None or not is_conn:
                blank = np.zeros((target_h, target_w, 3), dtype=np.uint8)
                # Draw dark high-tech placeholder
                cv2.rectangle(blank, (0, 0), (target_w, target_h), (12, 16, 26), -1)
                cv2.putText(blank, f"SaNDS Lab - {self.camera_name}", (40, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                cv2.putText(blank, f"Role: {self.role} • IP: {self.ip} (Port 554 RTSP)", (40, 235), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (236, 72, 153) if self.role == 'OUT' else (52, 211, 153), 1)
                cv2.putText(blank, "Status: Reconnecting / Searching Network...", (40, 270), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (148, 163, 184), 1)
                _, buf = cv2.imencode('.jpg', blank, [cv2.IMWRITE_JPEG_QUALITY, 60])
                with self.jpeg_lock:
                    self.latest_jpeg = buf.tobytes()
                    self.jpeg_id += 1
                time.sleep(0.1)
                continue

            with self.detections_lock:
                detections = list(self.current_detections)

            display = raw_frame
            h, w = display.shape[:2]

            # High-visibility multi-tier HUD
            for item in detections:
                box = item[0]
                name = item[1]
                c_score = item[2]
                det_type = item[3] if len(item) > 3 else "UNKNOWN"
                det_code = item[4] if len(item) > 4 else ""
                bx, by, bw, bh = box

                line_len = max(24, min(bw, bh) // 4)
                thick = 3

                if det_type == "BLACKLIST":
                    # Flashing Red Alert HUD
                    color = (0, 0, 245)
                    corner_color = (0, 0, 255)
                    text_bg_color = (0, 0, 180)
                    title_label = f" ! SECURITY ALERT: {name.upper()} ! "
                    sub_label = f" BLACKLIST ({det_code}) | {self.gate} | {int(c_score)}% "
                elif det_type == "GUEST":
                    # Sky Blue / Cyan Guest HUD
                    color = (255, 185, 0)
                    corner_color = (255, 215, 60)
                    text_bg_color = (180, 110, 0)
                    title_label = f" GUEST: {name.upper()} "
                    sub_label = f" {det_code} | {self.role} LOGGED | {int(c_score)}% "
                elif det_type == "TAMPER":
                    # Warning Crimson / Red HUD: Photo Spoof Rejected
                    color = (0, 0, 255)
                    corner_color = (60, 60, 255)
                    text_bg_color = (0, 0, 160)
                    title_label = f" ! TAMPER BLOCKED: {name.upper()} ! "
                    sub_label = f" PHOTO SPOOF REJECTED | {det_code} "
                elif det_type == "EMPLOYEE":
                    # Green for IN, Vibrant Pink for OUT
                    color = (0, 235, 100) if self.role == 'IN' else (236, 72, 153)
                    corner_color = (0, 255, 150) if self.role == 'IN' else (255, 120, 190)
                    text_bg_color = (0, 150, 60) if self.role == 'IN' else (180, 20, 100)
                    title_label = f" {name.upper()} "
                    sub_label = f" {det_code} | {self.role} VERIFIED | {int(c_score)}% "
                else:
                    # New Guest Auto-Enrolling HUD (Amber)
                    color = (0, 165, 255)
                    corner_color = (0, 200, 255)
                    text_bg_color = (0, 120, 200)
                    title_label = " NEW VISITOR DETECTED "
                    sub_label = " Auto-Enrolling Guest Profile... "

                # Draw corner brackets
                # Top-left
                cv2.line(display, (bx, by), (bx + line_len, by), corner_color, thick + 2)
                cv2.line(display, (bx, by), (bx, by + line_len), corner_color, thick + 2)
                # Top-right
                cv2.line(display, (bx + bw, by), (bx + bw - line_len, by), corner_color, thick + 2)
                cv2.line(display, (bx + bw, by), (bx + bw, by + line_len), corner_color, thick + 2)
                # Bottom-left
                cv2.line(display, (bx, by + bh), (bx + line_len, by + bh), corner_color, thick + 2)
                cv2.line(display, (bx, by + bh), (bx, by + bh - line_len), corner_color, thick + 2)
                # Bottom-right
                cv2.line(display, (bx + bw, by + bh), (bx + bw - line_len, by + bh), corner_color, thick + 2)
                cv2.line(display, (bx + bw, by + bh), (bx + bw, by + bh - line_len), corner_color, thick + 2)

                cv2.rectangle(display, (bx, by), (bx + bw, by + bh), color, 2)

                (tw1, th1), _ = cv2.getTextSize(title_label, cv2.FONT_HERSHEY_DUPLEX, 0.85, 2)
                (tw2, th2), _ = cv2.getTextSize(sub_label, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)
                badge_w = max(tw1, tw2) + 16
                badge_h = th1 + th2 + 20
                badge_y = max(0, by - badge_h - 6)

                cv2.rectangle(display, (bx, badge_y), (bx + badge_w, badge_y + badge_h), text_bg_color, -1)
                cv2.rectangle(display, (bx, badge_y), (bx + badge_w, badge_y + badge_h), (255, 255, 255), 1)

                cv2.putText(display, title_label, (bx + 4, badge_y + th1 + 6), cv2.FONT_HERSHEY_DUPLEX, 0.85, (255, 255, 255), 2)
                cv2.putText(display, sub_label, (bx + 8, badge_y + th1 + th2 + 14), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 220), 1)

            if w != target_w or h != target_h:
                display = cv2.resize(display, (target_w, target_h), interpolation=cv2.INTER_LINEAR)

            _, buf = cv2.imencode('.jpg', display, [cv2.IMWRITE_JPEG_QUALITY, 72])
            with self.jpeg_lock:
                self.latest_jpeg = buf.tobytes()
                self.jpeg_id += 1

            time.sleep(0.025)

    def get_latest_jpeg(self):
        with self.jpeg_lock:
            return self.jpeg_id, self.latest_jpeg

    def get_latency_ms(self):
        if self.latest_frame_time == 0:
            return 0.0
        return max(0.0, (time.time() - self.latest_frame_time) * 1000)

    def start(self):
        self.is_running = True
        t_cap = threading.Thread(target=self._capture_loop, daemon=True)
        t_cap.start()

        t_ai = threading.Thread(target=self._ai_loop, daemon=True)
        t_ai.start()

        t_ren = threading.Thread(target=self._render_loop, daemon=True)
        t_ren.start()

    def stop(self):
        self.is_running = False

class CameraManager:
    """Manages multi-gate cameras dynamically loaded from database."""
    def __init__(self):
        self.workers = {} # { camera_id: LowLatencyCameraWorker }
        self.lock = threading.Lock()
        self.shared_enrolled_users = []
        self.users_lock = threading.Lock()
        self.shared_blacklisted_persons = []
        self.blacklist_lock = threading.Lock()
        self.shared_guests = []
        self.guests_lock = threading.Lock()

    def sync_users(self):
        try:
            resp = requests.get(f"{PHP_API_URL}/users.php", timeout=3)
            if resp.status_code == 200:
                data = resp.json()
                users = data.get("data", []) if isinstance(data, dict) else data
                loaded = []
                for u in users:
                    raw_emb = u.get("face_embedding")
                    if raw_emb:
                        try:
                            emb = json.loads(raw_emb) if isinstance(raw_emb, str) else raw_emb
                            loaded.append({
                                "id": u["id"],
                                "user_code": u["user_code"],
                                "full_name": u["full_name"],
                                "department": u.get("department", ""),
                                "profile_photo": u.get("profile_photo"),
                                "embedding": emb
                            })
                        except Exception:
                            pass
                with self.users_lock:
                    self.shared_enrolled_users = loaded

                with self.lock:
                    for w in self.workers.values():
                        w.set_enrolled_users(loaded)
                print(f"[CameraManager] Enrolled users synchronized: {len(loaded)}")
        except Exception as e:
            print(f"[CameraManager] User sync note: {e}")

    def sync_blacklist(self):
        try:
            resp = requests.get(f"{PHP_API_URL}/blacklist.php?action=sync_embeddings", timeout=3)
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("data", []) if isinstance(data, dict) else data
                loaded = []
                for p in items:
                    raw_emb = p.get("face_embedding")
                    if raw_emb:
                        try:
                            emb = json.loads(raw_emb) if isinstance(raw_emb, str) else raw_emb
                            loaded.append({
                                "id": p["id"],
                                "person_code": p["person_code"],
                                "full_name": p["full_name"],
                                "threat_level": p.get("threat_level", "High"),
                                "reason": p.get("reason", ""),
                                "embedding": emb
                            })
                        except Exception:
                            pass
                with self.blacklist_lock:
                    self.shared_blacklisted_persons = loaded

                with self.lock:
                    for w in self.workers.values():
                        w.set_blacklisted_persons(loaded)
                print(f"[CameraManager] Blacklisted persons synchronized: {len(loaded)}")
        except Exception as e:
            print(f"[CameraManager] Blacklist sync note: {e}")

    def sync_guests(self):
        try:
            resp = requests.get(f"{PHP_API_URL}/guests.php?action=sync_embeddings", timeout=3)
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("data", []) if isinstance(data, dict) else data
                loaded = []
                for g in items:
                    raw_emb = g.get("face_embedding")
                    if raw_emb:
                        try:
                            emb = json.loads(raw_emb) if isinstance(raw_emb, str) else raw_emb
                            loaded.append({
                                "id": g["id"],
                                "guest_code": g["guest_code"],
                                "guest_name": g.get("guest_name", "Guest"),
                                "guest_type": g.get("guest_type", "Visitor"),
                                "embedding": emb
                            })
                        except Exception:
                            pass
                with self.guests_lock:
                    self.shared_guests = loaded

                with self.lock:
                    for w in self.workers.values():
                        w.set_guests(loaded)
                print(f"[CameraManager] Guests synchronized: {len(loaded)}")
        except Exception as e:
            print(f"[CameraManager] Guest sync note: {e}")

    def sync_cameras(self):
        try:
            resp = requests.get(f"{PHP_API_URL}/cameras.php", timeout=3)
            if resp.status_code == 200:
                data = resp.json()
                cams = data.get("data", []) if isinstance(data, dict) else data
                current_ids = set()

                with self.lock:
                    for c in cams:
                        cid = c["id"]
                        current_ids.add(cid)
                        rtsp = c.get("rtsp_url") or f"rtsp://admin:admin123@{c.get('ip_address')}:554/live/ch0"
                        role = c.get("camera_role", "IN")
                        gate = c.get("gate_name", "Main Gate")
                        name = c.get("camera_name", f"Camera {cid}")
                        ip = c.get("ip_address", "")

                        if cid in self.workers:
                            w = self.workers[cid]
                            if w.rtsp_url != rtsp or w.role != role.upper() or w.ip != ip or w.gate != gate:
                                print(f"[CameraManager] Updating Camera {cid} -> Role: {role}, IP: {ip}")
                                w.stop()
                                new_w = LowLatencyCameraWorker(cid, rtsp, role, gate, name, ip)
                                new_w.set_enrolled_users(self.shared_enrolled_users)
                                new_w.set_blacklisted_persons(self.shared_blacklisted_persons)
                                new_w.set_guests(self.shared_guests)
                                new_w.start()
                                self.workers[cid] = new_w
                        else:
                            print(f"[CameraManager] Initializing Camera {cid} -> Role: {role}, IP: {ip}")
                            new_w = LowLatencyCameraWorker(cid, rtsp, role, gate, name, ip)
                            new_w.set_enrolled_users(self.shared_enrolled_users)
                            new_w.set_blacklisted_persons(self.shared_blacklisted_persons)
                            new_w.set_guests(self.shared_guests)
                            new_w.start()
                            self.workers[cid] = new_w

                    for cid in list(self.workers.keys()):
                        if cid not in current_ids:
                            print(f"[CameraManager] Removing inactive Camera {cid}")
                            self.workers[cid].stop()
                            del self.workers[cid]
        except Exception as e:
            print(f"[CameraManager] Camera sync error: {e}")

    def get_worker(self, camera_id=None, role=None):
        with self.lock:
            if camera_id is not None:
                try:
                    cid = int(camera_id)
                    if cid in self.workers:
                        return self.workers[cid]
                except (ValueError, TypeError):
                    pass
            if role is not None:
                r_upper = str(role).upper()
                for w in self.workers.values():
                    if w.role == r_upper:
                        return w
            # Return first available or None
            if self.workers:
                return next(iter(self.workers.values()))
            return None

    def get_all_workers(self):
        with self.lock:
            return list(self.workers.values())

    def start_background_sync(self):
        self.sync_users()
        self.sync_blacklist()
        self.sync_guests()
        self.sync_cameras()

        def _sync_loop():
            while True:
                time.sleep(10)
                self.sync_cameras()
                self.sync_users()
                self.sync_blacklist()
                self.sync_guests()

        t = threading.Thread(target=_sync_loop, daemon=True)
        t.start()

manager = CameraManager()

# Dedicated thread-safe face engine for photo enrollments via HTTP
http_face_engine = OfflineFaceEngine(score_threshold=0.50)
http_extract_lock = threading.Lock()

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

class StreamHandler(BaseHTTPRequestHandler):
    def setup(self):
        super().setup()
        try:
            self.request.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        except Exception:
            pass

    def _set_cors(self, status=200, content_type='application/json'):
        self.send_response(status)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Type', content_type)
        self.end_headers()

    def do_OPTIONS(self):
        self._set_cors(200)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == '/status':
            self._set_cors(200)
            workers = manager.get_all_workers()
            cam_list = []
            max_fps = 0
            best_lat = 0.0

            for w in workers:
                lat = round(w.get_latency_ms(), 1)
                cam_list.append({
                    'id': w.camera_id,
                    'name': w.camera_name,
                    'ip': w.ip,
                    'role': w.role,
                    'connected': w.is_connected,
                    'fps': w.fps,
                    'latency_ms': lat
                })
                if w.fps > max_fps:
                    max_fps = w.fps
                if w.is_connected and (best_lat == 0.0 or lat < best_lat):
                    best_lat = lat

            active_c = manager.get_worker()
            status_data = {
                'status': 'Online' if any(w.is_connected for w in workers) else 'Connecting',
                'camera_ip': active_c.ip if active_c else '192.168.100.113',
                'camera_brand': 'UNV (Uniview)',
                'fps': max_fps or 25,
                'latency_ms': best_lat or 25.0,
                'enrolled_faces': len(manager.shared_enrolled_users),
                'cameras': cam_list,
                'offline_ai': 'YuNet Zero-Lag Multi-Gate AI + SFace (128-D)'
            }
            self.wfile.write(json.dumps(status_data).encode('utf-8'))

        elif path.startswith('/video_feed'):
            # Parse requested camera ID or role
            # Path can be /video_feed/1, /video_feed/2, or /video_feed?role=OUT
            target_worker = None
            parts = path.strip('/').split('/')
            if len(parts) >= 2 and parts[1].isdigit():
                target_worker = manager.get_worker(camera_id=int(parts[1]))
            elif 'role' in query:
                target_worker = manager.get_worker(role=query['role'][0])
            elif 'camera_id' in query:
                target_worker = manager.get_worker(camera_id=query['camera_id'][0])
            else:
                target_worker = manager.get_worker()

            self.send_response(200)
            self.send_header('Content-Type', 'multipart/x-mixed-replace; boundary=frame')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Connection', 'close')
            self.end_headers()

            last_id = -1
            while True:
                try:
                    if target_worker is not None:
                        jid, jpg_bytes = target_worker.get_latest_jpeg()
                    else:
                        jid = 0
                        jpg_bytes = None

                    if jid != last_id and jpg_bytes is not None:
                        self.wfile.write(
                            b'--frame\r\n'
                            b'Content-Type: image/jpeg\r\n'
                            b'Content-Length: ' + str(len(jpg_bytes)).encode('ascii') + b'\r\n\r\n' +
                            jpg_bytes + b'\r\n'
                        )
                        self.wfile.flush()
                        last_id = jid
                    time.sleep(0.015)
                except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
                    break
                except Exception:
                    break

        elif path.startswith('/snapshot'):
            target_worker = manager.get_worker()
            parts = path.strip('/').split('/')
            if len(parts) >= 2 and parts[1].isdigit():
                target_worker = manager.get_worker(camera_id=int(parts[1]))

            jpg_bytes = b''
            if target_worker:
                _, jpg_bytes = target_worker.get_latest_jpeg()
            self._set_cors(200, content_type='image/jpeg')
            self.wfile.write(jpg_bytes if jpg_bytes else b'')

        elif path == '/reload_cameras':
            manager.sync_cameras()
            self._set_cors(200)
            self.wfile.write(json.dumps({
                'success': True,
                'active_cameras': len(manager.workers)
            }).encode('utf-8'))

        elif path == '/reload_users':
            manager.sync_users()
            self._set_cors(200)
            self.wfile.write(json.dumps({
                'success': True,
                'enrolled_faces': len(manager.shared_enrolled_users),
                'users': [u['full_name'] for u in manager.shared_enrolled_users]
            }).encode('utf-8'))

        elif path == '/reload_blacklist':
            manager.sync_blacklist()
            self._set_cors(200)
            self.wfile.write(json.dumps({
                'success': True,
                'blacklisted_count': len(manager.shared_blacklisted_persons)
            }).encode('utf-8'))

        elif path == '/reload_guests':
            manager.sync_guests()
            self._set_cors(200)
            self.wfile.write(json.dumps({
                'success': True,
                'guests_count': len(manager.shared_guests)
            }).encode('utf-8'))

        else:
            self._set_cors(404)
            self.wfile.write(json.dumps({'error': 'Not found'}).encode('utf-8'))

    def do_POST(self):
        if self.path == '/extract_embedding':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                data = json.loads(body)
                image_b64 = data.get('image', '')
                with http_extract_lock:
                    emb, bbox, conf = http_face_engine.extract_from_base64(image_b64)

                self._set_cors(200)
                if emb:
                    self.wfile.write(json.dumps({
                        'success': True,
                        'embedding': emb,
                        'bbox': bbox,
                        'confidence': round(conf * 100, 1)
                    }).encode('utf-8'))
                else:
                    self.wfile.write(json.dumps({
                        'success': False,
                        'message': 'No clear front face detected in photo.'
                    }).encode('utf-8'))
            except Exception as e:
                self._set_cors(200)
                self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
        else:
            self._set_cors(404)
            self.wfile.write(json.dumps({'error': 'Not found'}).encode('utf-8'))

    def log_message(self, format, *args):
        return

def run_server():
    # Start dynamic multi-camera manager
    manager.start_background_sync()

    server = ThreadedHTTPServer(('0.0.0.0', ENGINE_PORT), StreamHandler)
    print(f"[Engine] Multi-Gate Camera & AI Engine on http://127.0.0.1:{ENGINE_PORT}")
    server.serve_forever()

if __name__ == '__main__':
    run_server()
