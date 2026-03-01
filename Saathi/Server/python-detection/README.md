# YOLOv8 detection service (Saathi)

Better object detection using YOLOv8. The Node server calls this when available and falls back to COCO-SSD if not.

## Setup

```bash
cd python-detection
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

First run will download the YOLOv8n model (~6MB).

## Run

```bash
python main.py
```

Listens on **http://localhost:8001**. Keep this running while using the app; the Node server (port 8000) will use it for `/api/detect`. If the Python service is not running, Node falls back to COCO-SSD.

## Optional: better accuracy, slower

In `main.py` change `YOLO("yolov8n.pt")` to `YOLO("yolov8s.pt")` for a more accurate (slightly slower) model.
