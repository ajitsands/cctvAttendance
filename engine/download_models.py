import os
import urllib.request

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

MODELS = {
    'face_detection_yunet_2023mar.onnx': 'https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx',
    'face_recognition_sface_2021dec.onnx': 'https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx'
}

def download_models():
    for name, url in MODELS.items():
        path = os.path.join(MODELS_DIR, name)
        if not os.path.exists(path) or os.path.getsize(path) < 10000:
            print(f"Downloading {name} from {url}...")
            opener = urllib.request.build_opener()
            opener.addheaders = [('User-Agent', 'Mozilla/5.0')]
            urllib.request.install_opener(opener)
            urllib.request.urlretrieve(url, path)
            print(f"Downloaded {name} ({os.path.getsize(path)} bytes)")
        else:
            print(f"Model {name} already exists ({os.path.getsize(path)} bytes)")

if __name__ == '__main__':
    download_models()
