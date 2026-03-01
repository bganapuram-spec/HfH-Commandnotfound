// Object detection using TensorFlow.js COCO-SSD (runs in browser)
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";

let model = null;

export async function loadModel() {
  if (model) return model;
  model = await cocoSsd.load();
  return model;
}

/**
 * Run detection on a video element. Returns class, score, and bbox [x, y, width, height].
 * @param {HTMLVideoElement} video
 * @returns {Promise<Array<{ class: string, score: number, bbox: number[] }>>}
 */
export async function detectObjects(video) {
  if (!video || video.readyState < 2) return [];
  const m = await loadModel();
  const predictions = await m.detect(video);
  return predictions.map((p) => ({
    class: p.class,
    score: Math.round(p.score * 100) / 100,
    bbox: p.bbox, // [x, y, width, height] in pixels
  }));
}