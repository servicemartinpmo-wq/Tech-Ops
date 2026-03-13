import { useState, useEffect, useCallback, useRef } from "react";
import { Card, Button, Badge } from "@/components/ui";
import { format } from "date-fns";
import { Layers, Play, XCircle, ChevronRight, BarChart3, AlertTriangle, RefreshCw, CheckCircle2, Clock, Loader2, Pause, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useApiBase } from "@/hooks/use-api-base";

interface BatchCase {
  caseId: number;
  status: string;
  errorType: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

interface BatchProgress {
  batchId: number;
  status: string;
  totalCases: number;
  completedCases: number;
  failedCases: number;
  systemErrorCases: number;
  cases: BatchCase[];
}

interface Batch {
  id: number;
  name: string;
  status: string;
  totalCases: number;
  completedCases: number;
  failedCases: number;
  systemErrorCases: number;
  concurrencyLimit: number;
  crossCasePatterns: Record<string, unknown> | null;
  createdAt: string;
  completedAt: string | null;
}

export default function BatchDiagnostics() {
  const apiBase = useApiBase();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
  const [batchProgress, setBatchProgress] = useState<Record<number, BatchProgress>>({});
  const [caseActionsLoading, setCaseActionsLoading] = useState<Record<string, boolean>>({});
  const pollIntervals = useRef<Record<number, ReturnType<typeof setInterval>>>({});

  useEffect(() => {
    fetch("/api/batches")
      .then((res) => res.json())
      .then((data) => {
        setBatches(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const pollBatchProgress = useCallback((batchId: number) => {
    if (pollIntervals.current[batchId]) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/batches/${batchId}/progress`);
        if (res.ok) {
          const progress: BatchProgress = await res.json();
          setBatchProgress((prev) => ({ ...prev, [batchId]: progress }));
          setBatches((prev) =>
            prev.map((b) =>
              b.id === batchId
                ? {
                    ...b,
                    status: progress.status,
                    completedCases: progress.completedCases,
                    failedCases: progress.failedCases,
                    systemErrorCases: progress.systemErrorCases,
                  }
                : b
            )
          );

          if (progress.status !== "running") {
            clearInterval(pollIntervals.current[batchId]);
            delete pollIntervals.current[batchId];
          }
        }
      } catch {}
    };

    poll();
    pollIntervals.current[batchId] = setInterval(poll, 3000);
  }, []);

  useEffect(() => {
    batches
      .filter((b) => b.status === "running")
      .forEach((b) => pollBatchProgress(b.id));

    return () => {
      Object.values(pollIntervals.current).forEach(clearInterval);
      pollIntervals.current = {};
    };
  }, [batches.length, pollBatchProgress]);

  useEffect(() => {
    if (selectedBatch) {
      const batch = batches.find((b) => b.id === selectedBatch);
      if (batch) {
        pollBatchProgress(batch.id);
      }
    }
  }, [selectedBatch, pollBatchProgress, batches]);

  const cancelBatch = async (id: number) => {
    const res = await fetch(`${apiBase}/api/batches/${id}/cancel`, { method: "POST" });
    if (res.ok) {
      const updated = await res.json();
      setBatches((prev) => prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b)));
      if (pollIntervals.current[id]) {
        clearInterval(pollIntervals.current[id]);
        delete pollIntervals.current[id];
      }
    }
  };

  const caseAction = async (batchId: number, caseId: number, action: "pause" | "cancel" | "retry") => {
    const key = `${batchId}-${caseId}-${action}`;
    setCaseActionsLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch(`${apiBase}/api/batches/${batchId}/cases/${caseId}/${action}`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setBatchProgress((prev) => {
          const progress = prev[batchId];
          if (!progress) return prev;
          return {
            ...prev,
            [batchId]: {
              ...progress,
              cases: progress.cases.map((c) =>
                c.caseId === caseId ? { ...c, status: data.batchCase?.status ?? c.status } : c
              ),
            },
          };
        });
      }
    } finally {
      setCaseActionsLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed": return "success" as const;
      case "running": return "warning" as const;
      case "failed": return "error" as const;
      case "system_error": return "error" as const;
      case "cancelled": return "neutral" as const;
      default: return "neutral" as const;
    }
  };

  const getCaseStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "running": return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case "pending": return <Clock className="w-4 h-4 text-slate-400" />;
      case "paused": return <Pause className="w-4 h-4 text-violet-400" />;
      case "failed": return <XCircle className="w-4 h-4 text-red-500" />;
      case "cancelled": return <XCircle className="w-4 h-4 text-slate-400" />;
      case "system_error": return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const renderBatchCases = (batchId: number) => {
    const progress = batchProgress[batchId];
    if (!progress) return <div className="p-4 text-sm text-slate-500">Loading case details...</div>;

    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-500">{progress.completedCases} completed</span>
          </div>
          {progress.failedCases > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-slate-500">{progress.failedCases} failed</span>
            </div>
          )}
          {progress.systemErrorCases > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-slate-500">{progress.systemErrorCases} system errors</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-white/[0.1]" />
            <span className="text-slate-500">
              {progress.cases.filter((c) => c.status === "pending" || c.status === "running").length} in progress
            </span>
          </div>
        </div>

        {progress.systemErrorCases > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-200">Platform errors detected</p>
              <p className="text-xs text-amber-500/80 mt-0.5">
                {progress.systemErrorCases} case(s) failed due to a platform-side error. These cases have been reset and do not count against your quota. You can re-submit them at no cost.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-1">
          {progress.cases.map((c) => (
            <div
              key={c.caseId}
              className={`flex items-center justify-between p-2.5 rounded-lg text-sm ${
                c.status === "system_error" ? "bg-amber-500/5" : "bg-white/[0.02]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {getCaseStatusIcon(c.status)}
                <span className="font-mono text-xs text-slate-600">Case #{c.caseId}</span>
                <Badge variant={getStatusVariant(c.status)} className="text-xs">
                  {c.status === "system_error" ? "System Error" : c.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {c.status === "system_error" && c.errorMessage && (
                  <span className="text-xs text-amber-500/80 max-w-[160px] truncate" title={c.errorMessage}>
                    {c.errorMessage}
                  </span>
                )}
                {c.status === "pending" && (
                  <>
                    <button
                      onClick={() => caseAction(batchId, c.caseId, "pause")}
                      disabled={caseActionsLoading[`${batchId}-${c.caseId}-pause`]}
                      className="p-1 rounded text-slate-400 hover:text-violet-500 hover:bg-violet-50 transition-colors disabled:opacity-40"
                      title="Pause case"
                    >
                      <Pause className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => caseAction(batchId, c.caseId, "cancel")}
                      disabled={caseActionsLoading[`${batchId}-${c.caseId}-cancel`]}
                      className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                      title="Cancel case"
                    >
                      <XCircle className="w-3 h-3" />
                    </button>
                  </>
                )}
                {(c.status === "failed" || c.status === "system_error" || c.status === "cancelled" || c.status === "paused") && (
                  <button
                    onClick={() => caseAction(batchId, c.caseId, "retry")}
                    disabled={caseActionsLoading[`${batchId}-${c.caseId}-retry`]}
                    className="p-1 rounded text-slate-400 hover:text-sky-500 hover:bg-sky-50 transition-colors disabled:opacity-40"
                    title="Retry case"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
                {c.completedAt && (
                  <span className="text-xs text-slate-600">
                    {format(new Date(c.completedAt), "HH:mm:ss")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-display font-bold text-white text-glow">Batch Diagnostics</h1>
        <p className="text-slate-500 mt-1">Execute parallel diagnostic pipelines across multiple cases with tier-based concurrency.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Batches", value: batches.length, icon: Layers, color: "text-cyan-400", glow: "rgba(0,240,255,0.15)" },
          { label: "Completed", value: batches.filter(b => b.status === "completed").length, icon: BarChart3, color: "text-emerald-400", glow: "rgba(0,255,136,0.15)" },
          { label: "Running", value: batches.filter(b => b.status === "running").length, icon: Play, color: "text-amber-400", glow: "rgba(255,184,0,0.15)" },
          { label: "System Errors", value: batches.reduce((sum, b) => sum + (b.systemErrorCases || 0), 0), icon: AlertTriangle, color: "text-red-400", glow: "rgba(239,68,68,0.15)" },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className="p-5 hud-element">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center border border-white/[0.06]" style={{ boxShadow: `0 0 15px ${stat.glow}` }}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white font-display">{stat.value}</p>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading batch history...</div>
        ) : !batches.length ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-white/[0.03] rounded-full flex items-center justify-center mx-auto mb-4 border border-white/[0.06]">
              <Layers className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-bold text-white">No batch jobs yet</h3>
            <p className="text-slate-500 mt-1">Start a batch diagnostic from the Cases page to see results here.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            <AnimatePresence>
              {batches.map((batch) => (
                <motion.div
                  key={batch.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-5 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-slate-600">BATCH-{batch.id.toString().padStart(4, "0")}</span>
                        <h3 className="font-bold text-white">{batch.name}</h3>
                        <Badge variant={getStatusVariant(batch.status)}>{batch.status}</Badge>
                        {batch.status === "running" && (
                          <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span>{batch.totalCases} cases</span>
                        <span>{batch.completedCases} completed</span>
                        {batch.failedCases > 0 && <span className="text-red-400">{batch.failedCases} failed</span>}
                        {(batch.systemErrorCases || 0) > 0 && (
                          <span className="text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {batch.systemErrorCases} system error{batch.systemErrorCases > 1 ? "s" : ""}
                          </span>
                        )}
                        <span>Concurrency: {batch.concurrencyLimit}</span>
                      </div>
                      {batch.totalCases > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="w-64 h-1.5 bg-white/[0.04] rounded-full overflow-hidden mt-1 flex">
                            <div
                              className="h-full bg-emerald-500 transition-all duration-500"
                              style={{ width: `${(batch.completedCases / batch.totalCases) * 100}%` }}
                            />
                            <div
                              className="h-full bg-red-500 transition-all duration-500"
                              style={{ width: `${(batch.failedCases / batch.totalCases) * 100}%` }}
                            />
                            <div
                              className="h-full bg-amber-400 transition-all duration-500"
                              style={{ width: `${((batch.systemErrorCases || 0) / batch.totalCases) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-600">
                            {Math.round(((batch.completedCases + batch.failedCases + (batch.systemErrorCases || 0)) / batch.totalCases) * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-slate-600">{format(new Date(batch.createdAt), "MMM d, yyyy HH:mm")}</p>
                      {batch.status === "running" && (
                        <Button variant="outline" size="sm" onClick={() => cancelBatch(batch.id)}>
                          <XCircle className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setSelectedBatch(selectedBatch === batch.id ? null : batch.id)}>
                        <ChevronRight className={`w-4 h-4 transition-transform ${selectedBatch === batch.id ? "rotate-90" : ""}`} />
                      </Button>
                    </div>
                  </div>
                  <AnimatePresence>
                    {selectedBatch === batch.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-white/[0.04]"
                      >
                        {renderBatchCases(batch.id)}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </Card>
    </div>
  );
}
