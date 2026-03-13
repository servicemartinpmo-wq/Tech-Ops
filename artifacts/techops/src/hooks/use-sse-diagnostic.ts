import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

export interface KnowledgeSource {
  id: number;
  externalId: string;
  title: string;
  domain: string;
  subdomain: string | null;
  confidenceScore: number;
}

export interface DiagnosticEvent {
  type: "progress" | "signal" | "udo_path" | "complete" | "error" | "system_error" | "knowledge_sources";
  message?: string;
  data?: Record<string, unknown>;
  isSystemError?: boolean;
  userMessage?: string;
}

export function useSseDiagnostic(caseId: number) {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<DiagnosticEvent[]>([]);
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const queryClient = useQueryClient();

  const runDiagnostic = useCallback(async () => {
    setIsRunning(true);
    setLogs([{ type: "progress", message: "Initializing Apphia Engine diagnostic pipeline..." }]);
    setKnowledgeSources([]);

    try {
      const res = await fetch(`/api/cases/${caseId}/diagnose`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("Failed to start diagnostic");
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
            if (!dataStr) continue;

            try {
              const data = JSON.parse(dataStr);
              if (data.done || data.type === 'complete') {
                done = true;
                setLogs((prev) => [...prev, { type: "complete", message: "Diagnostic complete." }]);
              } else if (data.type === 'knowledge_sources') {
                const sources = (data.data || []) as KnowledgeSource[];
                setKnowledgeSources(sources);
                setLogs((prev) => [...prev, {
                  type: "knowledge_sources",
                  message: `Retrieved ${sources.length} knowledge source${sources.length !== 1 ? "s" : ""} from the knowledge graph.`,
                  data: data.data,
                }]);
              } else if (data.type === 'system_error') {
                done = true;
                setLogs((prev) => [...prev, {
                  type: "system_error",
                  message: data.userMessage || data.message || "A platform error occurred.",
                  isSystemError: true,
                  userMessage: data.userMessage,
                }]);
              } else {
                setLogs((prev) => [...prev, data as DiagnosticEvent]);
              }
            } catch (e) {
              console.error("Failed to parse SSE chunk", dataStr);
            }
          }
        }
      }
    } catch (error) {
      console.error("Diagnostic streaming error:", error);
      setLogs((prev) => [...prev, { type: "error", message: "Diagnostic pipeline failed." }]);
    } finally {
      setIsRunning(false);
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
    }
  }, [caseId, queryClient]);

  const clearLogs = () => { setLogs([]); setKnowledgeSources([]); };

  return { runDiagnostic, isRunning, logs, knowledgeSources, clearLogs };
}
