import { useState } from "react";
import { useListCases, useCreateCase, useRunBatchDiagnostics } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, Button, Badge, Input } from "@/components/ui";
import { format } from "date-fns";
import { Search, Plus, PlayCircle, Briefcase } from "lucide-react";
import { motion } from "framer-motion";

export default function CasesList() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const { data: cases, isLoading } = useListCases(statusFilter ? { status: statusFilter as "open" | "in_progress" | "resolved" | "closed" } : undefined);
  const { mutate: runBatch, isPending: isBatchRunning } = useRunBatchDiagnostics();
  
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const { mutate: createCase, isPending: isCreatingCase } = useCreateCase();

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createCase(
      { data: { title: newTitle, priority: "medium" } },
      { onSuccess: () => { setIsCreating(false); setNewTitle(""); } }
    );
  };

  const handleBatchDiagnose = () => {
    const openCases = cases?.filter(c => c.status === "open").map(c => c.id) || [];
    if (openCases.length > 0) runBatch({ data: { caseIds: openCases } });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white text-glow">Diagnostic Cases</h1>
          <p className="text-slate-500 mt-1">Manage and diagnose system anomalies.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleBatchDiagnose} variant="secondary" disabled={isBatchRunning || !cases?.some(c => c.status === "open")}>
            <PlayCircle className="w-4 h-4 mr-2" />
            {isBatchRunning ? "Batching..." : "Batch Diagnose Open"}
          </Button>
          <Button onClick={() => setIsCreating(!isCreating)}>
            <Plus className="w-4 h-4 mr-2" />
            New Case
          </Button>
        </div>
      </motion.div>

      {isCreating && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
          <Card className="p-5 flex gap-4 items-center neon-border">
            <Input 
              placeholder="e.g. Database connection timeout in EU-West" 
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="max-w-md"
            />
            <Button onClick={handleCreate} isLoading={isCreatingCase}>Create</Button>
            <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
          </Card>
        </motion.div>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-white/[0.04] flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <Input className="pl-9 h-10" placeholder="Search cases..." />
          </div>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {["", "open", "in_progress", "resolved"].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  statusFilter === status 
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" 
                    : "text-slate-500 hover:text-slate-300 border border-white/[0.04]"
                }`}
              >
                {status ? status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()) : "All"}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading cases...</div>
        ) : !cases?.length ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-white/[0.03] rounded-full flex items-center justify-center mx-auto mb-4 border border-white/[0.06]">
              <Briefcase className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-bold text-white">No cases found</h3>
            <p className="text-slate-500 mt-1">Create a new diagnostic case to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {cases.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                <Link href={`/cases/${c.id}`} className="block hover:bg-white/[0.02] transition-colors p-5 group">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-slate-600">#{c.id.toString().padStart(4, '0')}</span>
                        <h3 className="font-bold text-white group-hover:text-cyan-400 transition-colors">{c.title}</h3>
                        <Badge variant={
                          c.status === 'resolved' ? 'success' : 
                          c.status === 'in_progress' ? 'warning' : 'neutral'
                        }>
                          {c.status.replace("_", " ")}
                        </Badge>
                        {(c.priority === 'high' || c.priority === 'critical') && (
                          <Badge variant="error">Urgent</Badge>
                        )}
                      </div>
                      {c.rootCause && (
                        <p className="text-sm text-slate-500 truncate max-w-2xl">
                          <span className="font-medium text-slate-400">Root Cause:</span> {c.rootCause}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-slate-600">{format(new Date(c.createdAt), "MMM d, yyyy")}</p>
                      {c.confidenceScore && (
                        <p className="text-xs font-bold text-cyan-400 mt-1">{c.confidenceScore}% Confidence</p>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
