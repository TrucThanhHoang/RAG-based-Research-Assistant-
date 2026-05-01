"use client";

import { FormEvent, useState } from "react";

import { sendChat } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ChatResponse } from "@/lib/types";

export function ChatPanel() {
  const { token, user } = useAuth();
  const [message, setMessage] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [responses, setResponses] = useState<ChatResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("You must sign in first.");
      return;
    }

    setError(null);
    try {
      const response = await sendChat(token, { session_id: sessionId, message });
      setSessionId(response.session_id);
      setResponses((current) => [...current, response]);
      setMessage("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Chat failed");
    }
  }

  if (!user) {
    return <p>Please sign in to start chatting.</p>;
  }

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <div style={{ padding: 20, border: "1px solid #334155", borderRadius: 16 }}>
        <h2 style={{ marginTop: 0 }}>Ask your indexed documents</h2>
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
          <textarea rows={4} value={message} onChange={(event) => setMessage(event.target.value)} />
          <button type="submit">Send question</button>
        </form>
        {error ? <p style={{ color: "#fca5a5" }}>{error}</p> : null}
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {responses.map((response, index) => (
          <article key={`${response.session_id}-${index}`} style={{ padding: 20, border: "1px solid #334155", borderRadius: 16 }}>
            <p style={{ whiteSpace: "pre-wrap" }}>{response.answer}</p>
            <div style={{ display: "grid", gap: 10 }}>
              {response.citations.map((citation) => (
                <div key={`${citation.document_id}-${citation.chunk_index}`} style={{ padding: 12, background: "#111827", borderRadius: 12 }}>
                  <strong>{citation.filename}</strong>
                  <p style={{ margin: "8px 0 0", color: "#cbd5e1" }}>{citation.snippet}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
