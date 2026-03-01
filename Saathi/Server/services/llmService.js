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

const EXTRACT_SYSTEM = `You are a helper for a blind user's navigation app. Given what the user said, extract ONLY the place or address they want to go to.
Reply with just that destination: a short place name or address, nothing else. No punctuation at the end, no "The destination is", no explanation.
Examples:
- "I want to go to the coffee shop" → Coffee shop
- "Take me to Central Park" → Central Park
- "How do I get to 123 Main Street?" → 123 Main Street
If you cannot determine a destination, reply with exactly: NONE`;

function cleanExtractedDestination(raw) {
  let s = (raw || '').trim();
  const prefixes = [
    /^the destination is\s*/i,
    /^destination:\s*/i,
    /^destination is\s*/i,
    /^place:\s*/i,
    /^address:\s*/i,
  ];
  for (const p of prefixes) {
    s = s.replace(p, '').trim();
  }
  return s;
}

async function extractDestination(userText) {
  const messages = [
    { role: 'user', content: EXTRACT_SYSTEM + '\n\nUser said: ' + userText },
  ];
  const raw = await chat(messages, null);
  const trimmed = cleanExtractedDestination(raw);
  if (trimmed.toUpperCase() === 'NONE' || !trimmed) return '';
  return trimmed;
}

module.exports = { chat, extractDestination };