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

module.exports = router;