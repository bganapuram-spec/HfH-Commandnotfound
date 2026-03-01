import { API_BASE_URL } from '../config';

export async function chatWithLLM(messages, context = null) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, context }),
    });
    console.log('response', response);
    if (!response.ok) throw new Error(`Error calling LLM API: ${response.status}`);
    const data = await response.json();
    return data.reply;
  } catch (err) {
    console.error(err);
    return 'Error: could not get response from LLM';
  }
}
