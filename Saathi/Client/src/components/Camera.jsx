import React, { useRef, useState, useEffect, useCallback } from "react";
import { detectObjects } from "../Services/detection";
import { announceProximityAlerts, getDirectionFromBbox } from "../Services/proximityAlerts";

function Camera({ setDetectedObjects, detectedObjects = [] }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [permission, setPermission] = useState("prompt");
  const [detecting, setDetecting] = useState(false);
  const detectionIntervalRef = useRef(null);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setStream(mediaStream);
      setPermission("granted");
    } catch (err) {
      setError(err.message || "Could not access camera");
      setPermission("denied");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    setDetecting(false);
    setDetectedObjects?.([]);
  }, [stream, setDetectedObjects]);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (!stream || !videoRef.current || !setDetectedObjects) return;
    const video = videoRef.current;
    const runDetection = async () => {
      const results = await detectObjects(video);
      setDetectedObjects(results);
      const vw = video.videoWidth || video.clientWidth;
      const vh = video.videoHeight || video.clientHeight;
      const enriched = results.map((r) => ({
        ...r,
        direction: getDirectionFromBbox(r.bbox, vw),
      }));
      setDetectedObjects(enriched);
      if (vw && vh && enriched.length) announceProximityAlerts(enriched, vw, vh);
    };
    detectionIntervalRef.current = setInterval(runDetection, 1500);
    setDetecting(true);
    return () => {
      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    };
  }, [stream, setDetectedObjects]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // Draw bounding boxes on canvas overlay
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !detectedObjects.length) {
      if (canvas && canvas.getContext) {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const cw = video.clientWidth;
    const ch = video.clientHeight;
    if (cw === 0 || ch === 0) return;
    const scaleX = cw / vw;
    const scaleY = ch / vh;
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, cw, ch);
    detectedObjects.forEach((obj, i) => {
      if (!obj.bbox || obj.bbox.length < 4) return;
      const [x, y, w, h] = obj.bbox;
      const sx = x * scaleX;
      const sy = y * scaleY;
      const sw = w * scaleX;
      const sh = h * scaleY;
      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, sw, sh);
      ctx.font = "12px sans-serif";
      ctx.fillStyle = "#00ff00";
      const label = `${obj.class} ${(obj.score * 100).toFixed(0)}%`;
      ctx.fillText(label, sx, sy - 4);
    });
  }, [detectedObjects]);

  return (
    <div className="camera" style={{ padding: "1rem" }}>
      <h3>Camera</h3>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {permission === "prompt" && (
        <button
          type="button"
          onClick={startCamera}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            cursor: "pointer",
            borderRadius: 8,
            border: "1px solid #333",
            background: "#e0e0e0",
          }}
        >
          Allow camera access
        </button>
      )}
      {(permission === "granted" || stream) && (
        <>
          <div style={{ position: "relative", display: "inline-block" }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                maxWidth: 400,
                backgroundColor: "#000",
                borderRadius: 8,
                display: "block",
              }}
            />
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: "100%",
                maxWidth: 400,
                height: "100%",
                pointerEvents: "none",
                borderRadius: 8,
              }}
            />
          </div>
          {detecting && (
            <p style={{ fontSize: "0.9rem", color: "#666" }}>Detecting objects…</p>
          )}
          <div style={{ marginTop: "0.5rem" }}>
            <strong>Detected objects:</strong>
            {detectedObjects.length === 0 ? (
              <p style={{ fontSize: "0.9rem", color: "#888" }}>None</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.9rem" }}>
                {detectedObjects.map((obj, i) => (
  <li key={`${obj.class}-${i}`}>
    {obj.class} — {(obj.score * 100).toFixed(0)}% — {obj.direction ?? "—"}
  </li>
))}
              </ul>
            )}
          </div>
          <button
            type="button"
            onClick={stopCamera}
            style={{
              marginTop: "0.5rem",
              padding: "0.5rem 1rem",
              fontSize: "0.9rem",
              cursor: "pointer",
              borderRadius: 8,
              border: "1px solid #333",
              background: "#f5f5f5",
            }}
          >
            Stop camera
          </button>
        </>
      )}
    </div>
  );
}

export default Camera;