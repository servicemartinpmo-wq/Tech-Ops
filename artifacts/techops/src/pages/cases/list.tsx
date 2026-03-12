import { useState } from "react";
import { useListCases, useCreateCase, useRunBatchDiagnostics } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, Button, Badge, Input } from "@/components/ui";
import { format } from "date-fns";
import { Search, Plus, Filter, PlayCircle, Briefcase } from "lucide-react";
import { motion } from "framer-motion";

export default function CasesList() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const { data: cases, isLoading } = useListCases(statusFilter ? { status: statusFilter } : undefined);
  const { mutate: runBatch, isPending: isBatchRunning } = useRunBatchDiagnostics();
  
  // Create state
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const { mutate: createCase, isPending: isCreatingCase } = useCreateCase();

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createCase(
      { data: { title: newTitle, priority: "medium" } },
      {
        onSuccess: () => {
          setIsCreating(false);
          setNewTitle("");
        }
      }
    );
  };

  const handleBatchDiagnose = () => {
    const openCases = cases?.filter(c => c.status === "open").map(c => c.id) || [];
    if (openCases.length > 0) {
      runBatch({ data: { caseIds: openCases } });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Diagnostic Cases</h1>
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
      </div>

      {isCreating && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
          <Card className="p-5 flex gap-4 items-center bg-blue-50/50 border-blue-100">
            <Input 
              placeholder="e.g. Database connection timeout in EU-West" 
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="max-w-md bg-white"
            />
            <Button onClick={handleCreate} isLoading={isCreatingCase}>Create</Button>
            <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
          </Card>
        </motion.div>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9 h-10" placeholder="Search cases..." />
          </div>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {["", "open", "in_progress", "resolved"].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  statusFilter === status 
                    ? "bg-primary text-white" 
                    : "bg-white border text-slate-600 hover:bg-slate-50"
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
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No cases found</h3>
            <p className="text-slate-500 mt-1">Create a new diagnostic case to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {cases.map((c) => (
              <Link key={c.id} href={`/cases/${c.id}`} className="block hover:bg-slate-50/80 transition-colors p-5 group">
                <div className="flex justify-between items-start">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-400">#{c.id.toString().padStart(4, '0')}</span>
                      <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors">{c.title}</h3>
                      <Badge variant={
                        c.status === 'resolved' ? 'success' : 
                        c.status === 'in_progress' ? 'warning' : 'neutral'
                      }>
                        {c.status.replace("_", " ")}
                      </Badge>
                      {c.priority === 'high' || c.priority === 'critical' ? (
                        <Badge variant="error" className="bg-red-50">Urgent</Badge>
                      ) : null}
                    </div>
                    {c.rootCause && (
                      <p className="text-sm text-slate-500 truncate max-w-2xl">
                        <span className="font-medium text-slate-700">Root Cause:</span> {c.rootCause}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-slate-400">{format(new Date(c.createdAt), "MMM d, yyyy")}</p>
                    {c.confidenceScore && (
                      <p className="text-xs font-bold text-primary mt-1">{c.confidenceScore}% Confidence</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
