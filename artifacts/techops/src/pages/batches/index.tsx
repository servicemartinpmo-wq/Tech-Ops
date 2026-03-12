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
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Batch Diagnostics</h1>
          <p className="text-slate-500 mt-1">Execute parallel diagnostic pipelines across multiple cases with tier-based concurrency.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 bg-gradient-to-br from-blue-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{batches.length}</p>
              <p className="text-sm text-slate-500">Total Batches</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-green-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{batches.filter(b => b.status === "completed").length}</p>
              <p className="text-sm text-slate-500">Completed</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-amber-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Play className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{batches.filter(b => b.status === "running").length}</p>
              <p className="text-sm text-slate-500">Running</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading batch history...</div>
        ) : !batches.length ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Layers className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No batch jobs yet</h3>
            <p className="text-slate-500 mt-1">Start a batch diagnostic from the Cases page to see results here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            <AnimatePresence>
              {batches.map((batch) => (
                <motion.div
                  key={batch.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-5 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-slate-400">BATCH-{batch.id.toString().padStart(4, "0")}</span>
                        <h3 className="font-bold text-slate-900">{batch.name}</h3>
                        <Badge variant={getStatusVariant(batch.status)}>{batch.status}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span>{batch.totalCases} cases</span>
                        <span>{batch.completedCases} completed</span>
                        {batch.failedCases > 0 && <span className="text-red-500">{batch.failedCases} failed</span>}
                        <span>Concurrency: {batch.concurrencyLimit}</span>
                      </div>
                      {batch.totalCases > 0 && (
                        <div className="w-64 h-2 bg-slate-100 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${((batch.completedCases + batch.failedCases) / batch.totalCases) * 100}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-slate-400">{format(new Date(batch.createdAt), "MMM d, yyyy HH:mm")}</p>
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
