// client/services/llmApi.js

// Function to send messages to backend AI endpoint
const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function chatWithLLM(messages, context = null) {
  try {
    const response = await fetch(`${baseUrl}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, context }),
    });
    if (!response.ok) throw new Error(`Error calling LLM API: ${response.status}`);
    const data = await response.json();
    return data.reply;
  } catch (err) {
    console.error(err);
    return "Error: could not get response from LLM";
  }
}