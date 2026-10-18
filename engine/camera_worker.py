import os
import sys
import time
import json
import base64
import threading
import urllib.parse
import cv2
import numpy as np
import requests
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

# Essential: Force TCP to eliminate H.264 packet loss & disable internal buffer delay
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|fflags;nobuffer|max_delay;500000"

from face_engine import OfflineFaceEngine

PHP_API_URL = os.environ.get("PHP_API_URL", "http://127.0.0.1:8000/api")
ENGINE_PORT = int(os.environ.get("ENGINE_PORT", 8001))

class LowLatencyCameraWorker:
    def __init__(self, camera_id=1, rtsp_url="rtsp://admin:admin%40123@192.168.100.113:554/cam/realmonitor?channel=1&subtype=0", role="IN", gate="Main Gate"):
        self.camera_id = camera_id
        self.rtsp_url = rtsp_url
        self.role = role
        self.gate = gate
        self.is_running = False
        self.engine = OfflineFaceEngine()
        self.enrolled_users = []
        self.last_punch_time = {}
        self.cooldown_seconds = 60

        # Latest annotated display frame ready for browser streaming
        self.latest_display_frame = None
        self.lock = threading.Lock()
        
        self.fps = 0
        self.frame_count = 0
        self.is_connected = False

    def sync_enrolled_users(self):
        try:
            resp = requests.get(f"{PHP_API_URL}/users.php", timeout=2)
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
                with self.lock:
                    self.enrolled_users = loaded
                print(f"[Camera {self.camera_id}] Enrolled users in memory: {len(self.enrolled_users)}")
        except Exception:
            pass

    def trigger_punch(self, user, confidence, frame_snapshot=None):
        uid = user["id"]
        now = time.time()
        
        if uid in self.last_punch_time:
            if now - self.last_punch_time[uid] < self.cooldown_seconds:
                return

        self.last_punch_time[uid] = now
        print(f"[Camera {self.camera_id}] >>> PUNCH DETECTED: {user['full_name']} ({user['user_code']}) - Conf: {confidence}%")

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
            print(f"[Camera {self.camera_id}] Punch error: {e}")

    def run_stream_loop(self):
        print(f"[Camera {self.camera_id}] Starting Real-Time Stream on {self.rtsp_url}...")
        self.is_running = True
        self.sync_enrolled_users()

        last_sync = time.time()
        fps_timer = time.time()
        fps_counter = 0

        # Persist detected faces across frames for smooth display
        current_detected = []
        face_check_interval = 2 # Check face every 2 frames for near-instant detection (<30ms)

        while self.is_running:
            cap = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

            if not cap.isOpened():
                print(f"[Camera {self.camera_id}] Reconnecting to UNV camera...")
                self.is_connected = False
                time.sleep(3)
                continue

            self.is_connected = True
            print(f"[Camera {self.camera_id}] Connected to UNV Camera 192.168.100.113 live stream!")

            while self.is_running and cap.isOpened():
                ret, frame = cap.read()
                if not ret or frame is None:
                    print(f"[Camera {self.camera_id}] Stream disconnected, reconnecting...")
                    self.is_connected = False
                    break

                self.frame_count += 1
                fps_counter += 1
                if time.time() - fps_timer >= 1.0:
                    self.fps = fps_counter
                    fps_counter = 0
                    fps_timer = time.time()

                h, w = frame.shape[:2]

                # Run fast face detection every 2 frames
                if self.frame_count % face_check_interval == 0:
                    try:
                        # Scale down to 960x540 (optimal HD for detecting faces at natural 1.5m - 3.5m distance)
                        scale_w, scale_h = 960, 540
                        scale_x = w / scale_w
                        scale_y = h / scale_h
                        small = cv2.resize(frame, (scale_w, scale_h))

                        self.engine.detector.setInputSize((scale_w, scale_h))
                        _, faces = self.engine.detector.detect(small)

                        new_detected = []
                        if faces is not None and len(faces) > 0:
                            with self.lock:
                                users_list = list(self.enrolled_users)

                            # Process up to 5 people simultaneously
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

                                aligned = self.engine.recognizer.alignCrop(frame, orig_face)
                                feature = self.engine.recognizer.feature(aligned)
                                emb = feature.flatten().tolist()

                                best_user = None
                                best_score = -1.0
                                best_conf = 0.0

                                for u in users_list:
                                    is_match, score, norm_conf = self.engine.compare_embeddings(emb, u["embedding"])
                                    if is_match and score > best_score:
                                        best_score = score
                                        best_user = u
                                        best_conf = norm_conf

                                bx = int(orig_face[0])
                                by = int(orig_face[1])
                                bw = int(orig_face[2])
                                bh = int(orig_face[3])
                                bbox = [bx, by, bw, bh]

                                if best_user:
                                    new_detected.append((bbox, best_user["full_name"], best_conf, best_user.get("user_code", "")))
                                    crop = frame[max(0, by):min(h, by+bh), max(0, bx):min(w, bx+bw)]
                                    self.trigger_punch(best_user, best_conf, crop if crop.size > 0 else None)
                                else:
                                    new_detected.append((bbox, "Unenrolled Visitor", round(conf * 100, 1), None))

                        current_detected = new_detected
                    except Exception as detect_err:
                        print(f"[Camera {self.camera_id}] Live detection notice: {detect_err}")

                # Draw high-visibility futuristic HUD & Person Name on frame
                display = frame.copy()
                for item in current_detected:
                    box = item[0]
                    name = item[1]
                    c_score = item[2]
                    user_code = item[3] if len(item) > 3 else None
                    bx, by, bw, bh = box
                    is_recognized = user_code is not None

                    if is_recognized:
                        color = (0, 235, 100) # Bright Emerald Green
                        corner_color = (0, 255, 150)
                        text_bg_color = (0, 150, 60)
                        
                        # Draw high-tech corner brackets
                        line_len = max(24, min(bw, bh) // 4)
                        thick = 3
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
                        
                        # Main box
                        cv2.rectangle(display, (bx, by), (bx + bw, by + bh), color, 2)

                        # Two-tier Prominent Name Badge
                        title_label = f" {name.upper()} "
                        sub_label = f" {user_code} | PRESENT | {int(c_score)}% "
                        
                        (tw1, th1), _ = cv2.getTextSize(title_label, cv2.FONT_HERSHEY_DUPLEX, 0.85, 2)
                        (tw2, th2), _ = cv2.getTextSize(sub_label, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)
                        badge_w = max(tw1, tw2) + 16
                        badge_h = th1 + th2 + 20
                        badge_y = max(0, by - badge_h - 6)

                        # Solid high-contrast background
                        cv2.rectangle(display, (bx, badge_y), (bx + badge_w, badge_y + badge_h), text_bg_color, -1)
                        cv2.rectangle(display, (bx, badge_y), (bx + badge_w, badge_y + badge_h), (255, 255, 255), 1)

                        # Clear white & light green text labels
                        cv2.putText(display, title_label, (bx + 4, badge_y + th1 + 6), cv2.FONT_HERSHEY_DUPLEX, 0.85, (255, 255, 255), 2)
                        cv2.putText(display, sub_label, (bx + 8, badge_y + th1 + th2 + 14), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 220), 1)
                    else:
                        color = (0, 165, 255) # Warning Amber
                        cv2.rectangle(display, (bx, by), (bx + bw, by + bh), color, 2)
                        label = f" FACE DETECTED ({int(c_score)}%) "
                        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.65, 2)
                        badge_y = max(0, by - th - 12)
                        cv2.rectangle(display, (bx, badge_y), (bx + tw + 10, by), color, -1)
                        cv2.putText(display, label, (bx + 4, by - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 0, 0), 2)

                # Store latest display frame
                with self.lock:
                    self.latest_display_frame = display

                if time.time() - last_sync > 10:
                    self.sync_enrolled_users()
                    last_sync = time.time()

                time.sleep(0.001)

            cap.release()

    def get_jpeg_frame(self, target_width=800):
        with self.lock:
            frame = self.latest_display_frame

        if frame is None:
            blank = np.zeros((450, target_width, 3), dtype=np.uint8)
            cv2.putText(blank, "Connecting to UNV Camera 192.168.100.113...", (40, 225), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            _, buf = cv2.imencode('.jpg', blank)
            return buf.tobytes()

        h, w = frame.shape[:2]
        if w != target_width:
            target_height = int(h * (target_width / w))
            frame = cv2.resize(frame, (target_width, target_height))

        # Quality 72 ensures instant <3ms network transit to browser
        _, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 72])
        return buf.tobytes()

active_worker = LowLatencyCameraWorker(
    camera_id=1,
    rtsp_url="rtsp://admin:admin%40123@192.168.100.113:554/cam/realmonitor?channel=1&subtype=0",
    role="IN",
    gate="Main Gate"
)

# Dedicated thread-safe face engine for HTTP requests (isolated from real-time stream)
http_face_engine = OfflineFaceEngine(score_threshold=0.50)
http_extract_lock = threading.Lock()

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

class StreamHandler(BaseHTTPRequestHandler):
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

        if path == '/status':
            self._set_cors(200)
            status_data = {
                'status': 'Online' if active_worker.is_connected else 'Connecting',
                'camera_ip': '192.168.100.113',
                'camera_brand': 'UNV (Uniview)',
                'fps': active_worker.fps,
                'total_frames': active_worker.frame_count,
                'enrolled_faces': len(active_worker.enrolled_users),
                'offline_ai': 'YuNet Fast (640x360) + SFace (128-D)'
            }
            self.wfile.write(json.dumps(status_data).encode('utf-8'))

        elif path.startswith('/video_feed'):
            self.send_response(200)
            self.send_header('Content-Type', 'multipart/x-mixed-replace; boundary=frame')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.end_headers()

            while True:
                try:
                    jpg_bytes = active_worker.get_jpeg_frame(target_width=800)
                    self.wfile.write(b'--frame\r\n')
                    self.wfile.write(b'Content-Type: image/jpeg\r\n\r\n' + jpg_bytes + b'\r\n')
                    time.sleep(0.033) # 30 FPS smooth real-time stream
                except (BrokenPipeError, ConnectionResetError):
                    break
                except Exception:
                    break

        elif path.startswith('/snapshot'):
            jpg_bytes = active_worker.get_jpeg_frame(target_width=960)
            self._set_cors(200, content_type='image/jpeg')
            self.wfile.write(jpg_bytes)

        elif path == '/reload_users':
            active_worker.sync_enrolled_users()
            self._set_cors(200)
            self.wfile.write(json.dumps({
                'success': True,
                'enrolled_faces': len(active_worker.enrolled_users),
                'users': [u['full_name'] for u in active_worker.enrolled_users]
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
    server = ThreadedHTTPServer(('0.0.0.0', ENGINE_PORT), StreamHandler)
    print(f"[Engine] Real-Time Zero-Lag Stream Server on http://127.0.0.1:{ENGINE_PORT}")
    server.serve_forever()

if __name__ == '__main__':
    # Start HTTP server thread
    s_thread = threading.Thread(target=run_server, daemon=True)
    s_thread.start()

    # Start Worker loop
    try:
        active_worker.run_stream_loop()
    except KeyboardInterrupt:
        print("Stopping camera worker...")
