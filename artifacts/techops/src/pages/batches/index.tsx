import { useState, useEffect } from "react";
import { Card, Button, Badge } from "@/components/ui";
import { format } from "date-fns";
import { Layers, Play, XCircle, ChevronRight, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Batch {
  id: number;
  name: string;
  status: string;
  totalCases: number;
  completedCases: number;
  failedCases: number;
  concurrencyLimit: number;
  crossCasePatterns: Record<string, unknown> | null;
  createdAt: string;
  completedAt: string | null;
}

export default function BatchDiagnostics() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/batches")
      .then((res) => res.json())
      .then((data) => {
        setBatches(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const cancelBatch = async (id: number) => {
    const res = await fetch(`/api/batches/${id}/cancel`, { method: "POST" });
    if (res.ok) {
      const updated = await res.json();
      setBatches((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed": return "success" as const;
      case "running": return "warning" as const;
      case "failed": return "error" as const;
      case "cancelled": return "neutral" as const;
      default: return "neutral" as const;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-display font-bold text-white text-glow">Batch Diagnostics</h1>
        <p className="text-slate-500 mt-1">Execute parallel diagnostic pipelines across multiple cases with tier-based concurrency.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Batches", value: batches.length, icon: Layers, color: "text-cyan-400", glow: "rgba(0,240,255,0.15)" },
          { label: "Completed", value: batches.filter(b => b.status === "completed").length, icon: BarChart3, color: "text-emerald-400", glow: "rgba(0,255,136,0.15)" },
          { label: "Running", value: batches.filter(b => b.status === "running").length, icon: Play, color: "text-amber-400", glow: "rgba(255,184,0,0.15)" },
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
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span>{batch.totalCases} cases</span>
                        <span>{batch.completedCases} completed</span>
                        {batch.failedCases > 0 && <span className="text-red-400">{batch.failedCases} failed</span>}
                        <span>Concurrency: {batch.concurrencyLimit}</span>
                      </div>
                      {batch.totalCases > 0 && (
                        <div className="w-64 h-1.5 bg-white/[0.04] rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                            style={{ width: `${((batch.completedCases + batch.failedCases) / batch.totalCases) * 100}%` }}
                          />
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
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </Card>
    </div>
  );
}
