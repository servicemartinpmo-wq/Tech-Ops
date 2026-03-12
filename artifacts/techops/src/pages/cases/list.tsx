import { useState } from "react";
import { useListCases, useCreateCase, useRunBatchDiagnostics, useDeleteCase } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, Button, Badge, Input } from "@/components/ui";
import { format } from "date-fns";
import { Search, Plus, PlayCircle, Briefcase, Trash2, FileEdit } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_VARIANTS: Record<string, "success" | "warning" | "error" | "neutral"> = {
  resolved: "success",
  in_progress: "warning",
  open: "neutral",
  draft: "neutral",
  closed: "neutral",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  draft: "Draft",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

export default function CasesList() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const { data: cases, isLoading, refetch } = useListCases(statusFilter ? { status: statusFilter as "open" | "in_progress" | "resolved" | "closed" } : undefined);
  const { mutate: runBatch, isPending: isBatchRunning } = useRunBatchDiagnostics();
  const { mutate: deleteCase } = useDeleteCase();
  
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDraft, setNewDraft] = useState(false);
  const { mutate: createCase, isPending: isCreatingCase } = useCreateCase();

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createCase(
      { data: { title: newTitle, priority: "medium", status: newDraft ? "draft" : "open" } as Parameters<typeof createCase>[0]["data"] },
      { onSuccess: () => { setIsCreating(false); setNewTitle(""); setNewDraft(false); refetch(); } }
    );
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    if (!confirm("Delete this case? This cannot be undone.")) return;
    deleteCase({ id }, { onSuccess: () => refetch() });
  };

  const handleBatchDiagnose = () => {
    const openCases = cases?.filter(c => c.status === "open").map(c => c.id) || [];
    if (openCases.length > 0) runBatch({ data: { caseIds: openCases } });
  };

  const filtered = cases?.filter(c =>
    !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allStatuses = ["", "open", "draft", "in_progress", "resolved", "closed"];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white text-glow">Diagnostic Cases</h1>
          <p className="text-slate-500 mt-1">Manage and diagnose system anomalies. Draft cases are saved but not yet triaged.</p>
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

      <AnimatePresence>
        {isCreating && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card className="p-5 neon-border">
              <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Create New Case</h3>
              <div className="flex gap-4 items-start">
                <div className="flex-1 space-y-3">
                  <Input 
                    placeholder="e.g. Database connection timeout in EU-West" 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    autoFocus
                  />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newDraft}
                      onChange={e => setNewDraft(e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 accent-cyan-500"
                    />
                    <span className="text-sm text-slate-400 flex items-center gap-1.5">
                      <FileEdit className="w-3.5 h-3.5" />
                      Save as Draft (don't triage yet)
                    </span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreate} isLoading={isCreatingCase}>Create</Button>
                  <Button variant="ghost" onClick={() => { setIsCreating(false); setNewDraft(false); }}>Cancel</Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-white/[0.04] flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <Input
              className="pl-9 h-10"
              placeholder="Search cases..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {allStatuses.map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  statusFilter === status 
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" 
                    : "text-slate-500 hover:text-slate-300 border border-white/[0.04]"
                }`}
              >
                {status ? STATUS_LABELS[status] || status : "All"}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading cases...</div>
        ) : !filtered?.length ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-white/[0.03] rounded-full flex items-center justify-center mx-auto mb-4 border border-white/[0.06]">
              <Briefcase className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-bold text-white">No cases found</h3>
            <p className="text-slate-500 mt-1">Create a new diagnostic case to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {filtered.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                <Link href={`/cases/${c.id}`} className="block hover:bg-white/[0.02] transition-colors p-5 group">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-mono text-slate-600">#{c.id.toString().padStart(4, '0')}</span>
                        <h3 className="font-bold text-white group-hover:text-cyan-400 transition-colors">{c.title}</h3>
                        <Badge variant={STATUS_VARIANTS[c.status] || "neutral"}>
                          {c.status === "draft" && <FileEdit className="w-3 h-3 mr-1" />}
                          {STATUS_LABELS[c.status] || c.status}
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
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className="text-xs font-medium text-slate-600">{format(new Date(c.createdAt), "MMM d, yyyy")}</p>
                        {c.confidenceScore && (
                          <p className="text-xs font-bold text-cyan-400 mt-1">{c.confidenceScore}% Confidence</p>
                        )}
                      </div>
                      <button
                        onClick={(e) => handleDelete(e, c.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        title="Delete case"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
