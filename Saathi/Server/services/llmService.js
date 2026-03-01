const config = require('../config');

function buildContextMessage(context) {
  if (!context) return '';
  const parts = [];
  if (context.currentLocation) {
    parts.push(`User's current location: ${context.currentLocation.lat}, ${context.currentLocation.lng}.`);
  }
  if (context.safeMode !== undefined) {
    parts.push(`Safe mode (avoid stairs/ferries): ${context.safeMode ? 'on' : 'off'}.`);
  }
  if (context.detectedObjects?.length) {
    const list = context.detectedObjects
      .map((o) => `${o.class} (${(o.score * 100).toFixed(0)}% confidence, ${o.direction || 'ahead'})`)
      .join('; ');
    parts.push(`Currently detected in camera: ${list}.`);
  }
  if (!parts.length) return '';
  return `[Context for accessibility navigation app. ${parts.join(' ')}]\n\n`;
}

async function chat(messages, context = null) {
  const apiKey = config.llmApiKey || process.env.LLM_API_KEY;
  if (!apiKey) throw new Error('LLM_API_KEY not set');

  const contextBlock = buildContextMessage(context);
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: (m.role === 'user' && contextBlock && messages.indexOf(m) === 0 ? contextBlock : '') + (m.content || m.parts?.[0]?.text || '') }],
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  if (!candidate?.content?.parts?.[0]?.text) {
    throw new Error('Unexpected Gemini response shape');
  }
  return candidate.content.parts[0].text;
}

module.exports = { chat };