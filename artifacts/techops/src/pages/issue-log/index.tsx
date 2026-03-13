import { useState } from "react";
import { useListCases } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui";
import {
  ClipboardList, Filter, Search, CheckCircle2, Clock, AlertCircle,
  ArrowRight, Zap, TrendingUp, Shield, RefreshCw, ChevronDown
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const STATUS_CONFIG = {
  open: { label: "Open", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", dot: "#f59e0b", icon: AlertCircle },
  in_progress: { label: "In Progress", color: "text-sky-600", bg: "bg-sky-50", border: "border-sky-200", dot: "#0ea5e9", icon: RefreshCw },
  resolved: { label: "Resolved", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", dot: "#10b981", icon: CheckCircle2 },
  closed: { label: "Closed", color: "text-slate-500", bg: "bg-slate-50", border: "border-slate-200", dot: "#94a3b8", icon: CheckCircle2 },
  draft: { label: "Draft", color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200", dot: "#8b5cf6", icon: Clock },
};

const PRIORITY_CONFIG = {
  critical: { color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
  high: { color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
  medium: { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  low: { color: "text-slate-500", bg: "bg-slate-50", border: "border-slate-200" },
};

function ResolutionBar({ value }: { value: number }) {
  const color = value >= 80 ? "#10b981" : value >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.8, ease: "easeOut" }} style={{ background: color }} />
      </div>
      <span className="text-xs font-bold" style={{ color }}>{value}%</span>
    </div>
  );
}

export default function IssueLog() {
  const { data: cases, isLoading } = useListCases();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = (cases || []).filter(c => {
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || c.status === statusFilter;
    const matchPriority = !priorityFilter || c.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const stats = {
    total: (cases || []).length,
    open: (cases || []).filter(c => c.status === "open" || c.status === "in_progress").length,
    resolved: (cases || []).filter(c => c.status === "resolved" || c.status === "closed").length,
    autoResolved: (cases || []).filter(c => c.status === "resolved" && (c.confidenceScore || 0) > 70).length,
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/20"
              style={{ animation: "float-3d 4s ease-in-out infinite" }}>
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">Issue Activity Log</h1>
              <p className="text-slate-400 text-sm font-medium">Complete record of all submitted issues and their resolution history.</p>
            </div>
          </div>
        </div>
        <Link href="/cases/submit">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white text-sm font-bold shadow-md shadow-sky-500/20 hover:from-sky-400 hover:to-indigo-400 transition-all">
            <Zap className="w-4 h-4" />
            Submit New Issue
          </button>
        </Link>
      </motion.div>

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Issues", value: stats.total, icon: ClipboardList, from: "#0ea5e9", to: "#38bdf8" },
          { label: "Active", value: stats.open, icon: AlertCircle, from: "#f59e0b", to: "#fbbf24" },
          { label: "Resolved", value: stats.resolved, icon: CheckCircle2, from: "#10b981", to: "#34d399" },
          { label: "Auto-Resolved", value: stats.autoResolved, icon: Zap, from: "#8b5cf6", to: "#a78bfa" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="card-3d">
            <div className="stat-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                  <p className="text-3xl font-extrabold text-slate-900">{isLoading ? "—" : s.value}</p>
                </div>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${s.from}20, ${s.to}10)`, border: `1px solid ${s.from}25`, boxShadow: `0 4px 12px ${s.from}15` }}>
                  <s.icon className="w-4 h-4" style={{ color: s.from }} />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Search & Filters ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search issues..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/10 transition-all font-medium placeholder:text-slate-400"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-colors ${showFilters ? "bg-sky-50 border-sky-200 text-sky-600" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"}`}
            >
              <Filter className="w-4 h-4" />
              Filters
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>
            {(statusFilter || priorityFilter || search) && (
              <button onClick={() => { setStatusFilter(""); setPriorityFilter(""); setSearch(""); }}
                className="text-xs text-slate-400 hover:text-red-500 font-semibold transition-colors">
                Clear all
              </button>
            )}
          </div>
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="flex gap-3 flex-wrap mt-4 pt-4 border-t border-slate-100">
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1.5">Status</label>
                <div className="flex gap-2 flex-wrap">
                  {["", "open", "in_progress", "resolved", "closed", "draft"].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className={`px-2.5 py-1 text-xs rounded-lg border font-semibold transition-all ${statusFilter === s ? "bg-sky-500 text-white border-sky-500" : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"}`}>
                      {s ? s.replace("_", " ") : "All"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1.5">Priority</label>
                <div className="flex gap-2">
                  {["", "critical", "high", "medium", "low"].map(p => (
                    <button key={p} onClick={() => setPriorityFilter(p)}
                      className={`px-2.5 py-1 text-xs rounded-lg border font-semibold transition-all ${priorityFilter === p ? "bg-sky-500 text-white border-sky-500" : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"}`}>
                      {p || "All"}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* ── Issue list ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <div className="glass-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="relative w-10 h-10">
                <div className="w-10 h-10 border-2 border-sky-200 rounded-full" />
                <div className="w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin absolute inset-0" />
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <ClipboardList className="w-10 h-10 text-slate-300" />
              <p className="text-slate-500 font-semibold">No issues found</p>
              <p className="text-sm text-slate-400 font-medium">{search || statusFilter || priorityFilter ? "Try adjusting your filters" : "Submit your first issue to get started"}</p>
              {!search && !statusFilter && !priorityFilter && (
                <Link href="/cases/submit">
                  <button className="mt-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white text-sm font-bold">Submit Issue</button>
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-12 px-5 py-3 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span className="col-span-1">#</span>
                <span className="col-span-4">Issue</span>
                <span className="col-span-2">Status</span>
                <span className="col-span-1">Priority</span>
                <span className="col-span-2">Confidence</span>
                <span className="col-span-1">Created</span>
                <span className="col-span-1"></span>
              </div>
              <div className="divide-y divide-slate-50">
                {filtered.map((c, i) => {
                  const st = STATUS_CONFIG[c.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.open;
                  const pr = PRIORITY_CONFIG[c.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;
                  const StIcon = st.icon;
                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="grid grid-cols-12 items-center px-5 py-4 hover:bg-slate-50/80 transition-colors group"
                    >
                      <span className="col-span-1 text-xs font-bold text-slate-400 font-mono">#{c.id}</span>
                      <div className="col-span-4 pr-4">
                        <p className="text-sm font-bold text-slate-800 truncate group-hover:text-sky-600 transition-colors">{c.title}</p>
                        {c.description && <p className="text-xs text-slate-400 font-medium truncate mt-0.5">{c.description}</p>}
                      </div>
                      <div className="col-span-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold ${st.color} ${st.bg} ${st.border}`}>
                          <StIcon className="w-3 h-3" />
                          {st.label}
                        </span>
                      </div>
                      <div className="col-span-1">
                        <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold capitalize ${pr.color} ${pr.bg} ${pr.border}`}>
                          {c.priority || "medium"}
                        </span>
                      </div>
                      <div className="col-span-2">
                        {c.confidenceScore ? (
                          <ResolutionBar value={c.confidenceScore} />
                        ) : (
                          <span className="text-xs text-slate-300 font-medium">Not run</span>
                        )}
                      </div>
                      <div className="col-span-1">
                        <span className="text-[10px] text-slate-400 font-medium">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Link href={`/cases/${c.id}`}>
                          <button className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-500 hover:bg-sky-100 transition-colors opacity-0 group-hover:opacity-100">
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </Link>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-400 font-medium">Showing {filtered.length} of {stats.total} issues</p>
                <div className="flex items-center gap-2 text-xs text-emerald-600 font-bold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {stats.resolved > 0 ? `${Math.round((stats.resolved / stats.total) * 100)}% resolution rate` : "No resolved issues yet"}
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
