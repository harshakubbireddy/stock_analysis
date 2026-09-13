"use client";

import { useState } from "react";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatComponent = {
  name: string;
  props: Record<string, unknown>;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

/**
 * useChat — sends a message to POST /api/ai/chat and streams the
 * assistant's reply back via Server-Sent Events (SSE).
 *
 * Two event types from the backend:
 *   {"type": "text", "content": "..."}                  → chat bubble
 *   {"type": "component", "component": "...", "props": {...}}  → UI panel (outside chat)
 */
export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [components, setComponents] = useState<ChatComponent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return;

    // Add the user's message right away, clear previous components
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setComponents([]);
    setIsLoading(true);

    // Add an empty assistant message we'll fill in as text arrives
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const event = JSON.parse(data);
            if (event.type === "text") {
              // Append text to the last assistant message
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = {
                  ...next[next.length - 1],
                  content: next[next.length - 1].content + event.content,
                };
                return next;
              });
            } else if (event.type === "component") {
              // Append component to the UI panel (outside chat)
              setComponents((prev) => [
                ...prev,
                { name: event.component, props: event.props },
              ]);
            }
          } catch {
            // Not valid JSON — skip
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          ...next[next.length - 1],
          content: "Sorry — couldn't reach the AI service.",
        };
        return next;
      });
    } finally {
      setIsLoading(false);
    }
  }

  return { messages, isLoading, sendMessage, components };
}
