// POST /api/speech — body: { audio: "<base64>" } (m4a from Expo)
// Uses GOOGLE_CLOUD_SPEECH_API_KEY from .env
const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

const GOOGLE_SPEECH_KEY = process.env.GOOGLE_CLOUD_SPEECH_API_KEY;

router.post('/', async (req, res) => {
  try {
    const { audio } = req.body;
    if (!audio) {
      return res.status(400).json({ error: 'Missing audio (base64)' });
    }
    if (!GOOGLE_SPEECH_KEY) {
      return res.status(500).json({ error: 'GOOGLE_CLOUD_SPEECH_API_KEY not set' });
    }

    const buf = Buffer.from(audio, 'base64');
    const tmpIn = path.join(os.tmpdir(), `speech-${Date.now()}.m4a`);
    const tmpOut = path.join(os.tmpdir(), `speech-${Date.now()}.flac`);

    try {
      fs.writeFileSync(tmpIn, buf);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to write temp file' });
    }

    let outBase64 = null;
    try {
      const ffmpeg = require('fluent-ffmpeg');
      try {
        const ffmpegPath = require('ffmpeg-static');
        if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
      } catch (_) {}

      await new Promise((resolve, reject) => {
        ffmpeg(tmpIn)
          .toFormat('flac')
          .audioFrequency(16000)
          .audioChannels(1)
          .on('end', resolve)
          .on('error', reject)
          .save(tmpOut);
      });
      outBase64 = fs.readFileSync(tmpOut).toString('base64');
    } catch (ffmpegErr) {
      console.error('ffmpeg error:', ffmpegErr.message);
      try { fs.unlinkSync(tmpIn); } catch (_) {}
      try { fs.unlinkSync(tmpOut); } catch (_) {}
      return res.status(500).json({
        error: 'Audio conversion failed. Run: npm install fluent-ffmpeg ffmpeg-static',
      });
    } finally {
      try { fs.unlinkSync(tmpIn); } catch (_) {}
      try { fs.unlinkSync(tmpOut); } catch (_) {}
    }

    const url = `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_SPEECH_KEY}`;
    const response = await axios.post(url, {
      config: {
        encoding: 'FLAC',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
      },
      audio: { content: outBase64 },
    });

    const text =
      response.data.results?.[0]?.alternatives?.[0]?.transcript ?? '';
    res.json({ text });
  } catch (err) {
    console.error('Speech API error:', err.response?.data || err.message);
    res.status(500).json({
      error: err.response?.data?.error?.message || err.message,
    });
  }
});

module.exports = router;
