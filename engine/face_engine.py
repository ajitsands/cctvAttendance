import os
import sys
import json
import base64
import time
import numpy as np
import cv2

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
YUNET_PATH = os.path.join(MODELS_DIR, 'face_detection_yunet_2023mar.onnx')
SFACE_PATH = os.path.join(MODELS_DIR, 'face_recognition_sface_2021dec.onnx')

class OfflineFaceEngine:
    def __init__(self, score_threshold=0.55, nms_threshold=0.3, top_k=5000):
        if not os.path.exists(YUNET_PATH) or not os.path.exists(SFACE_PATH):
            raise FileNotFoundError(f"Model files not found in {MODELS_DIR}. Run download_models.py first.")
        
        self.detector = cv2.FaceDetectorYN.create(
            model=YUNET_PATH,
            config="",
            input_size=(320, 320),
            score_threshold=score_threshold,
            nms_threshold=nms_threshold,
            top_k=top_k
        )
        self.recognizer = cv2.FaceRecognizerSF.create(
            model=SFACE_PATH,
            config=""
        )
        self.cosine_threshold = 0.34 # Optimal for CCTV camera face matching
        self.l2_threshold = 1.128

    def extract_embedding_from_frame(self, frame):
        """
        Detects primary face in frame, aligns it, and returns 128-d embedding as list of floats.
        Returns: (embedding_list, face_bbox, confidence) or (None, None, 0.0)
        """
        if frame is None or frame.size == 0:
            return None, None, 0.0

        try:
            h, w = frame.shape[:2]
            self.detector.setInputSize((w, h))
            _, faces = self.detector.detect(frame)

            # If no face detected, try normalized 640x640 scale for high-res phone uploads
            if (faces is None or len(faces) == 0) and (w > 640 or h > 640):
                scale = min(640.0 / w, 640.0 / h)
                nw, nh = max(16, int(w * scale)), max(16, int(h * scale))
                resized = cv2.resize(frame, (nw, nh))
                self.detector.setInputSize((nw, nh))
                _, faces_scaled = self.detector.detect(resized)
                if faces_scaled is not None and len(faces_scaled) > 0:
                    faces = faces_scaled
                    for f in faces:
                        f[0] /= scale
                        f[1] /= scale
                        f[2] /= scale
                        f[3] /= scale
                        for p in range(4, 14, 2):
                            f[p] /= scale
                            f[p+1] /= scale

            if faces is None or len(faces) == 0:
                return None, None, 0.0

            # Pick the most prominent face (highest confidence or largest bbox area)
            primary_face = faces[0]
            confidence = float(primary_face[-1])
            bbox = [int(x) for x in primary_face[:4]] # [x, y, w, h]

            # Align crop and extract 128-d feature
            aligned_face = self.recognizer.alignCrop(frame, primary_face)
            feature = self.recognizer.feature(aligned_face) # 1x128 float32
            embedding = feature.flatten().tolist()

            return embedding, bbox, confidence
        except Exception as e:
            print(f"[FaceEngine] Notice: {e}")
            return None, None, 0.0

    def extract_from_image_file(self, image_path):
        if not os.path.exists(image_path):
            return None, None, 0.0
        frame = cv2.imread(image_path)
        if frame is None:
            return None, None, 0.0
        return self.extract_embedding_from_frame(frame)

    def extract_from_base64(self, b64_str):
        if ',' in b64_str:
            b64_str = b64_str.split(',', 1)[1]
        img_bytes = base64.b64decode(b64_str)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            return None, None, 0.0
        return self.extract_embedding_from_frame(frame)

    def compare_embeddings(self, feat1, feat2):
        """
        Compares two 128-d embeddings using SFace cosine similarity.
        Returns: (is_match, similarity_score_0_to_1)
        """
        f1 = np.array(feat1, dtype=np.float32).reshape(1, -1)
        f2 = np.array(feat2, dtype=np.float32).reshape(1, -1)

        # OpenCV match: COSINE similarity score
        score = float(self.recognizer.match(f1, f2, cv2.FaceRecognizerSF_FR_COSINE))
        
        # SFace cosine similarity threshold: 0.34 is optimal for CCTV camera real-world conditions
        is_match = score >= self.cosine_threshold
        if is_match:
            normalized_conf = min(99.9, 82.0 + ((score - self.cosine_threshold) / 0.28) * 17.9)
        else:
            normalized_conf = max(10.0, (score / self.cosine_threshold) * 75.0)

        return is_match, score, round(normalized_conf, 1)

if __name__ == '__main__':
    # CLI mode for enrollment or comparison
    engine = OfflineFaceEngine()
    if len(sys.argv) > 1:
        cmd = sys.argv[1]
        if cmd == 'enroll' and len(sys.argv) > 2:
            img_path = sys.argv[2]
            emb, bbox, conf = engine.extract_from_image_file(img_path)
            if emb:
                print(json.dumps({'success': True, 'embedding': emb, 'bbox': bbox, 'confidence': round(conf, 4)}))
            else:
                print(json.dumps({'success': False, 'message': 'No face detected in image'}))
        elif cmd == 'test':
            print(json.dumps({'success': True, 'message': 'Face Engine Ready and Loaded Offline'}))
    else:
        print("Usage: python face_engine.py [enroll <path> | test]")
