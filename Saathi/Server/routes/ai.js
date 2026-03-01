const express = require('express');
const router = express.Router();
const llmService = require('../services/llmService');

router.post('/chat', async (req, res) => {
  try {
    const { messages, context } = req.body;
    if (!messages?.length) {
      return res.status(400).json({ error: 'messages array required' });
    }
    const reply = await llmService.chat(messages, context);
    res.json({ reply });
  } catch (err) {
    console.error('LLM error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/extract-destination — from user speech, LLM returns a single destination string
router.post('/extract-destination', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text required' });
    }
    const destination = await llmService.extractDestination(text.trim());
    console.log('destination', destination);
    res.json({ destination: destination || '' });
  } catch (err) {
    console.error('extract-destination error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;