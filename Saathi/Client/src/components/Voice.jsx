import React, { useState } from "react";
import { chatWithLLM } from "../Services/llmApi";

function Voice({ safeMode, setRoute, currentLocation, detectedObjects }) {
  const [query, setQuery] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    const q = (query || "What do you see around me? Describe obstacles and people and their direction.").trim();
    if (!q) return;
    setLoading(true);
    setReply("");
    try {
      const context = {
        currentLocation,
        safeMode,
        detectedObjects: (detectedObjects || []).map((o) => ({
          class: o.class,
          score: o.score,
          direction: o.direction ?? "ahead",
        })),
      };
      const messages = [{ role: "user", content: q }];
      const text = await chatWithLLM(messages, context);
      setReply(text);
    } catch (e) {
      setReply("Sorry, I couldn't get an answer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="voice-control" style={{ padding: "1rem", border: "1px solid #ccc", borderRadius: 8 }}>
      <h3>Voice / Assistant</h3>
      <p>Safe Mode: {safeMode ? "On" : "Off"}</p>
      
    </div>
  );
}

export default Voice;