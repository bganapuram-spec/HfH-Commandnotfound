import { API_BASE_URL } from '../config';

/**
 * Send user's spoken text to LLM; returns a single destination string for maps.
 */
export async function extractDestinationFromSpeech(text) {
  if (!text?.trim()) return '';
  try {
    const res = await fetch(`${API_BASE_URL}/api/ai/extract-destination`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim() }),
    });
    if (!res.ok) throw new Error('Failed to get destination');
    const data = await res.json();
    return (data.destination || '').trim();
  } catch (e) {
    console.error('extractDestinationFromSpeech:', e);
    return '';
  }
}
