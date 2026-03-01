import { API_BASE_URL } from '../config';

/**
 * Run object detection by sending a base64 image to the backend.
 * @param {string|null} imageBase64 - Base64-encoded image (e.g. from CameraView.takePictureAsync({ base64: true }))
 * @returns {Promise<Array<{ class: string, score: number, bbox: number[] }>>}
 */
export async function loadModel() {
  return null;
}

export async function detectObjects(imageBase64) {
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return [];
  }
  try {
    const response = await fetch(`${API_BASE_URL}/api/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64 }),
    });
    if (!response.ok) {
      console.warn('Detection API error:', response.status);
      return [];
    }
    const data = await response.json();
    const objects = data.objects || [];
    return objects;
  } catch (err) {
    console.warn('Detection request failed:', err?.message || err);
    return [];
  }
}
