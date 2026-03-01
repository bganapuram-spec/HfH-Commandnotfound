import { API_BASE_URL } from '../config';
import * as FileSystem from 'expo-file-system';

/**
 * Send recorded audio URI to backend for Google Speech-to-Text; returns transcript text.
 */
export async function transcribeAudio(uri) {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const res = await fetch(`${API_BASE_URL}/api/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio: base64 }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText || 'Transcription failed');
  }
  const data = await res.json();
  return data.text || '';
}
