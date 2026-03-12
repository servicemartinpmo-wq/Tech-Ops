import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useSseChat(conversationId: number | null) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const queryClient = useQueryClient();

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId) return;

      setIsStreaming(true);
      setStreamedText("");

      try {
        // Optimistically add user message if desired, but here we just rely on the server 
        // returning the stream for the assistant. The server saves the user message.
        const res = await fetch(`/api/openai/conversations/${conversationId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });

        if (!res.ok) throw new Error("Failed to send message");
        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let done = false;

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          if (readerDone) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim();
              if (!dataStr || dataStr === "[DONE]") continue;

              try {
                const data = JSON.parse(dataStr);
                if (data.done) {
                  done = true;
                } else if (data.content) {
                  setStreamedText((prev) => prev + data.content);
                }
              } catch (e) {
                console.error("Failed to parse SSE chunk", dataStr);
              }
            }
          }
        }
      } catch (error) {
        console.error("Chat streaming error:", error);
      } finally {
        setIsStreaming(false);
        // Refresh the message list to get the fully persisted messages
        queryClient.invalidateQueries({ queryKey: [`/api/openai/conversations/${conversationId}`] });
      }
    },
    [conversationId, queryClient]
  );

  return { sendMessage, isStreaming, streamedText };
}
