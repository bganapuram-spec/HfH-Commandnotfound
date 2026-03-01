// Proximity alerts for accessibility: TTS when person or obstacle is near
const speech = typeof window !== "undefined" ? window.speechSynthesis : null;

// Throttle: don't repeat the same phrase for this many ms
const THROTTLE_MS = 5000;
let lastSpokenAt = 0;
let lastPhrase = "";

/**
 * Estimate distance band from bbox size (no real depth; bigger in frame = closer).
 * bbox: [x, y, width, height], videoW/videoH in pixels.
 */
function getDistanceBand(bbox, videoW, videoH) {
  const [x, y, w, h] = bbox;
  const areaFrac = (w * h) / (videoW * videoH);
  if (areaFrac >= 0.12) return { text: "less than 1 metre", veryClose: true };
  if (areaFrac >= 0.05) return { text: "about 1 metre", veryClose: true };
  if (areaFrac >= 0.02) return { text: "about 2 metres", veryClose: false };
  if (areaFrac >= 0.008) return { text: "about 3 metres", veryClose: false };
  return { text: "ahead", veryClose: false };
}

/**
 * Get direction from bbox center X.
 */
function getDirection(bbox, videoW) {
  const [x, y, w] = bbox;
  const centerX = x + w / 2;
  if (centerX < videoW / 3) return "on your left";
  if (centerX > (2 * videoW) / 3) return "on your right";
  return "ahead";
}

/**
 * Get direction from bbox center X. Returns "left" | "right" | "ahead".
 */
export function getDirectionFromBbox(bbox, videoWidth) {
    if (!bbox || bbox.length < 4) return "ahead";
    const [x, , w] = bbox;
    const centerX = x + w / 2;
    if (centerX < videoWidth / 3) return "left";
    if (centerX > (2 * videoWidth) / 3) return "right";
    return "ahead";
  }
/**
 * Build a short, screen-reader friendly phrase for one detection.
 */
function getMessage(obj, videoW, videoH) {
  const label = obj.class.toLowerCase();
  const humanLabel = label === "person" ? "Person" : `Obstacle, ${label}`;
  const dist = getDistanceBand(obj.bbox, videoW, videoH);
  const dir = getDirection(obj.bbox, videoW);
  const distText = dist.text;
  if (dist.veryClose) {
    return `${humanLabel} ${distText} ${dir}. Too close.`;
  }
  return `${humanLabel} ${distText} ${dir}.`;
}

/**
 * Sort by closeness (larger bbox area = closer) and return up to 2 messages.
 */
function getClosestMessages(objects, videoW, videoH) {
  if (!objects.length || !videoW || !videoH) return [];
  const withArea = objects
    .filter((o) => o.bbox && o.bbox.length >= 4)
    .map((o) => ({
      ...o,
      area: o.bbox[2] * o.bbox[3],
    }));
  withArea.sort((a, b) => b.area - a.area);
  return withArea.slice(0, 2).map((o) => getMessage(o, videoW, videoH));
}

/**
 * Speak one phrase. Uses Web Speech API so it works for blind users.
 */
function speak(text) {
  if (!speech) return;
  speech.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95;
  u.pitch = 1;
  speech.speak(u);
}

/**
 * Call this when you have new detections and video size.
 * Throttles so the same phrase is not repeated within THROTTLE_MS.
 * Speaks the single most important alert (closest obstacle/person).
 */
export function announceProximityAlerts(objects, videoWidth, videoHeight) {
  if (!objects?.length || !videoWidth || !videoHeight) return;
  const messages = getClosestMessages(objects, videoWidth, videoHeight);
  const phrase = messages[0];
  if (!phrase) return;
  const now = Date.now();
  if (phrase === lastPhrase && now - lastSpokenAt < THROTTLE_MS) return;
  lastPhrase = phrase;
  lastSpokenAt = now;
  speak(phrase);
}