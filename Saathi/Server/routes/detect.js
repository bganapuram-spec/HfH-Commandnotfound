// Object detection using COCO-SSD (TensorFlow.js CPU backend) + Sharp for image decode
const express = require('express');
const router = express.Router();
const sharp = require('sharp');

// Use CPU backend so we don't need native tfjs-node
require('@tensorflow/tfjs-backend-cpu');
const tf = require('@tensorflow/tfjs');
const cocoSsd = require('@tensorflow-models/coco-ssd');

let modelPromise = null;

async function getModel() {
  if (modelPromise) return modelPromise;
  modelPromise = cocoSsd.load();
  return modelPromise;
}

// POST /api/detect — body: { image: base64String }
router.post('/', async (req, res) => {
  let imageTensor = null;
  try {
    const { image: base64 } = req.body;
    if (!base64 || typeof base64 !== 'string') {
      return res.status(400).json({ error: 'Missing image (base64 string)' });
    }

    const buf = Buffer.from(base64, 'base64');
    if (buf.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image too large (max ~10MB)' });
    }

    const meta = await sharp(buf).metadata();
    const rgb = await sharp(buf).removeAlpha().raw().toBuffer();
    const [h, w] = [meta.height, meta.width];
    if (!h || !w) {
      return res.status(400).json({ error: 'Could not read image dimensions' });
    }

    imageTensor = tf.tensor3d(new Uint8Array(rgb), [h, w, 3]);
    const model = await getModel();
    const predictions = await model.detect(imageTensor);
    imageTensor.dispose();
    imageTensor = null;

    const results = (predictions || []).map((p) => ({
      class: p.class,
      score: p.score,
      bbox: p.bbox,
    }));

    res.json({ objects: results });
  } catch (err) {
    if (imageTensor) try { imageTensor.dispose(); } catch (_) {}
    console.error('Detection error:', err);
    res.status(500).json({ error: err.message || 'Detection failed' });
  }
});

module.exports = router;
