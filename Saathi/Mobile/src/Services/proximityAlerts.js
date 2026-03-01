import * as Speech from 'expo-speech';

const THROTTLE_MS = 5000;
let lastSpokenAt = 0;
let lastPhrase = '';

function getDistanceBand(bbox, videoW, videoH) {
  const [x, y, w, h] = bbox;
  const areaFrac = (w * h) / (videoW * videoH);
  if (areaFrac >= 0.12) return { text: 'less than 1 metre', veryClose: true };
  if (areaFrac >= 0.05) return { text: 'about 1 metre', veryClose: true };
  if (areaFrac >= 0.02) return { text: 'about 2 metres', veryClose: false };
  if (areaFrac >= 0.008) return { text: 'about 3 metres', veryClose: false };
  return { text: 'ahead', veryClose: false };
}

function getDirection(bbox, videoW) {
  const [x, y, w] = bbox;
  const centerX = x + w / 2;
  if (centerX < videoW / 3) return 'on your left';
  if (centerX > (2 * videoW) / 3) return 'on your right';
  return 'ahead';
}

export function getDirectionFromBbox(bbox, videoWidth) {
  if (!bbox || bbox.length < 4) return 'ahead';
  const [x, , w] = bbox;
  const centerX = x + w / 2;
  if (centerX < videoWidth / 3) return 'left';
  if (centerX > (2 * videoWidth) / 3) return 'right';
  return 'ahead';
}

function getMessage(obj, videoW, videoH) {
  const label = obj.class.toLowerCase();
  const humanLabel = label === 'person' ? 'Person' : `Obstacle, ${label}`;
  const dist = getDistanceBand(obj.bbox, videoW, videoH);
  const dir = getDirection(obj.bbox, videoW);
  const distText = dist.text;
  if (dist.veryClose) return `${humanLabel} ${distText} ${dir}. Too close.`;
  return `${humanLabel} ${distText} ${dir}.`;
}

function getClosestMessages(objects, videoW, videoH) {
  if (!objects.length || !videoW || !videoH) return [];
  const withArea = objects
    .filter((o) => o.bbox && o.bbox.length >= 4)
    .map((o) => ({ ...o, area: o.bbox[2] * o.bbox[3] }));
  withArea.sort((a, b) => b.area - a.area);
  return withArea.slice(0, 2).map((o) => getMessage(o, videoW, videoH));
}

export function announceProximityAlerts(objects, videoWidth, videoHeight) {
  if (!objects?.length || !videoWidth || !videoHeight) return;
  const messages = getClosestMessages(objects, videoWidth, videoHeight);
  const phrase = messages[0];
  if (!phrase) return;
  const now = Date.now();
  if (phrase === lastPhrase && now - lastSpokenAt < THROTTLE_MS) return;
  lastPhrase = phrase;
  lastSpokenAt = now;
  Speech.speak(phrase, { rate: 0.95, pitch: 1 });
}
