import * as Speech from 'expo-speech';

const THROTTLE_MS = 5000;
let lastSpokenAt = 0;
let lastPhrase = '';

const OBSTACLE_CLASSES = new Set([
  'person', 'chair', 'car', 'dining table', 'couch', 'traffic light', 'stop sign',
  'bench', 'potted plant', 'bicycle', 'motorcycle', 'bus', 'truck', 'bottle',
  'backpack', 'umbrella', 'handbag', 'teddy bear', 'cell phone', 'book', 'clock'
]);

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

function getMoveInstruction(dir) {
  if (dir === 'on your left') return 'Move right.';
  if (dir === 'on your right') return 'Move left.';
  return 'Move left or right.';
}

function getMessage(obj, videoW, videoH) {
  const label = obj.class.toLowerCase();
  const humanLabel = label === 'person' ? 'Person' : label === 'traffic light' && obj.trafficLightState
    ? `Traffic light ${obj.trafficLightState}`
    : `Obstacle, ${label}`;
  const dist = getDistanceBand(obj.bbox, videoW, videoH);
  const dir = getDirection(obj.bbox, videoW);
  const distText = dist.text;
  if (obj.class.toLowerCase() === 'traffic light' && obj.trafficLightState) {
    return `${humanLabel} ${distText} ${dir}.`;
  }
  if (dist.veryClose) {
    return `${humanLabel} ${distText} ${dir}. Too close. ${getMoveInstruction(dir)}`;
  }
  return `${humanLabel} ${distText} ${dir}.`;
}

function getClosestMessages(objects, videoW, videoH) {
  if (!objects.length || !videoW || !videoH) return [];
  const obstacleOnly = objects.filter((o) =>
    o.bbox && o.bbox.length >= 4 && OBSTACLE_CLASSES.has((o.class || '').toLowerCase())
  );
  const withArea = obstacleOnly
    .map((o) => ({ ...o, area: o.bbox[2] * o.bbox[3], dist: getDistanceBand(o.bbox, videoW, videoH) }));
  withArea.sort((a, b) => b.area - a.area);
  const veryCloseOnly = withArea.filter((o) => o.dist.veryClose);
  const toAnnounce = veryCloseOnly.length ? veryCloseOnly : withArea;
  return toAnnounce.slice(0, 2).map((o) => ({ phrase: getMessage(o, videoW, videoH), veryClose: o.dist.veryClose }));
}

export function announceProximityAlerts(objects, videoWidth, videoHeight) {
  if (!objects?.length || !videoWidth || !videoHeight) return;
  const messages = getClosestMessages(objects, videoWidth, videoHeight);
  const first = messages[0];
  if (!first || !first.veryClose) return;
  const phrase = first.phrase;
  const now = Date.now();
  if (phrase === lastPhrase && now - lastSpokenAt < THROTTLE_MS) return;
  lastPhrase = phrase;
  lastSpokenAt = now;
  Speech.speak(phrase, { rate: 0.95, pitch: 1, volume: 1 });
}