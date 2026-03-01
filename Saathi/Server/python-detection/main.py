"""
YOLOv8 object detection service for Saathi.
POST /detect with JSON { "image": "<base64>" } -> { "objects": [ { "class", "score", "bbox" } ] }
bbox is [x, y, width, height] to match the app.
"""
import base64
import io
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# Lazy load to avoid import at startup (model loads on first request)
_model = None

def get_model():
    global _model
    if _model is None:
        from ultralytics import YOLO
        # yolov8s = better accuracy than nano, especially for small objects like traffic lights
        _model = YOLO("yolov8s.pt")
    return _model


class DetectRequest(BaseModel):
    image: str  # base64


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    # cleanup if needed


app = FastAPI(title="Saathi YOLO Detection", lifespan=lifespan)


@app.post("/detect")
async def detect(req: DetectRequest):
    try:
        img_b64 = req.image
        if not img_b64:
            raise HTTPException(status_code=400, detail="Missing image")
        img_bytes = base64.b64decode(img_b64)
        if len(img_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image too large")
        from PIL import Image
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        model = get_model()
        # imgsz=640 helps small objects (e.g. traffic lights); slightly lower conf to catch more
        results = model.predict(img, conf=0.35, imgsz=640, verbose=False)
        objects = []
        for r in results:
            if r.boxes is None:
                continue
            names = r.names
            for box in r.boxes:
                xyxy = box.xyxy[0].tolist()
                x1, y1, x2, y2 = xyxy
                w = x2 - x1
                h = y2 - y1
                cls_id = int(box.cls[0])
                cls_name = names.get(cls_id, "unknown")
                score = float(box.conf[0])
                objects.append({
                    "class": cls_name,
                    "score": score,
                    "bbox": [round(x1), round(y1), round(w), round(h)],
                })
        return {"objects": objects}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
