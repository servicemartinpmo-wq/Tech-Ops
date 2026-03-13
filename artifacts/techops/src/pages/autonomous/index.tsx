import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, Button, Badge } from "@/components/ui";
import { motion, AnimatePresence } from "framer-motion";
import { useApiBase } from "@/hooks/use-api-base";
import {
  Cpu, CheckCircle2, Play, AlertTriangle, Clock, ChevronRight,
  RefreshCw, Zap, ShieldCheck, BarChart3, Info
} from "lucide-react";

interface CaseItem {
  id: number;
  title: string;
  status: string;
  priority: string;
  resolution: string | null;
  rootCause: string | null;
  confidenceScore: number | null;
  createdAt: string;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .trim();
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: "text-red-600 bg-red-50 border-red-200",
  high:     "text-orange-600 bg-orange-50 border-orange-200",
  medium:   "text-sky-600 bg-sky-50 border-sky-200",
  low:      "text-slate-500 bg-slate-50 border-slate-200",
};

export default function AutonomousSupport() {
  const apiBase = useApiBase();
  const [cases, setCases]       = useState<CaseItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [deploying, setDeploying] = useState<Record<number, boolean>>({});
  const [resolved, setResolved]  = useState<Set<number>>(new Set());

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/cases?limit=50`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCases(Array.isArray(data) ? data : (data.cases ?? []));
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchCases(); }, []);

  const readyCases = cases.filter(
    c => c.resolution && c.status !== "resolved" && !resolved.has(c.id)
  );
  const resolvedCases = cases.filter(
    c => c.status === "resolved" || resolved.has(c.id)
  );

  const applyFix = async (c: CaseItem) => {
    setDeploying(prev => ({ ...prev, [c.id]: true }));
    try {
      await fetch(`${apiBase}/api/cases/${c.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      });
      setResolved(prev => new Set([...prev, c.id]));
    } catch {}
    setDeploying(prev => ({ ...prev, [c.id]: false }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Cpu className="w-7 h-7 text-violet-600" />
              Autonomous Support
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              When Apphia has a high-confidence fix ready, you can apply it here — one click, no guesswork.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchCases} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* How it works banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <div className="flex items-start gap-3 p-4 rounded-xl bg-violet-50 border border-violet-100">
          <Info className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
          <div className="text-sm text-violet-700 space-y-1">
            <p className="font-semibold">How autonomous support works</p>
            <p className="text-violet-600 text-xs leading-relaxed">
              After Apphia analyses a ticket, it may produce a recommended fix. If the confidence is high enough,
              the fix appears here. You review it and press <strong>Apply Fix</strong> — Apphia marks the ticket resolved
              and logs what it did. You stay in control at all times.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Ready to fix",   value: readyCases.length,   icon: Zap,        color: "text-violet-600" },
          { label: "Already fixed",  value: resolvedCases.length, icon: CheckCircle2, color: "text-emerald-600" },
          { label: "High confidence",
            value: readyCases.filter(c => (c.confidenceScore ?? 0) >= 75).length,
            icon: ShieldCheck, color: "text-sky-600" },
        ].map(s => (
          <Card key={s.label} className="p-4 bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Ready cases */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-violet-500" />
          Fixes ready to apply
          {readyCases.length > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold">
              {readyCases.length}
            </span>
          )}
        </h2>

        {loading ? (
          <Card className="p-10 text-center">
            <RefreshCw className="w-6 h-6 text-slate-300 animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-400">Loading tickets...</p>
          </Card>
        ) : readyCases.length === 0 ? (
          <Card className="p-10 text-center border-dashed">
            <Cpu className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-500">No fixes ready yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Run the Apphia Pipeline on a ticket — once a fix is found it will appear here.
            </p>
            <Link href="/cases" className="inline-flex items-center gap-1 mt-4 text-xs text-violet-600 font-medium hover:underline">
              View my tickets <ChevronRight className="w-3 h-3" />
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {readyCases.map(c => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                >
                  <Card className="p-5 bg-white border border-slate-200 shadow-sm hover:border-violet-200 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            #{c.id}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border capitalize ${PRIORITY_COLORS[c.priority] || PRIORITY_COLORS.medium}`}>
                            {c.priority}
                          </span>
                          {(c.confidenceScore ?? 0) >= 75 && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded border text-emerald-700 bg-emerald-50 border-emerald-200 flex items-center gap-1">
                              <ShieldCheck className="w-2.5 h-2.5" />
                              High confidence
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-slate-800">{c.title}</p>

                        {c.resolution && (
                          <div className="mt-2 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                            <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-1">Recommended fix</p>
                            <p className="text-xs text-slate-700 leading-relaxed line-clamp-3">
                              {stripMarkdown(c.resolution)}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {c.confidenceScore != null && (
                          <div className="text-right">
                            <p className="text-lg font-bold text-slate-800">{c.confidenceScore}%</p>
                            <p className="text-[10px] text-slate-400">confidence</p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Link href={`/cases/${c.id}`}>
                            <Button variant="outline" size="sm" className="text-xs">
                              View ticket
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            className="text-xs bg-violet-600 hover:bg-violet-500 text-white"
                            onClick={() => applyFix(c)}
                            isLoading={deploying[c.id]}
                          >
                            <Play className="w-3 h-3 mr-1.5" />
                            Apply Fix
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Recently resolved */}
      {resolvedCases.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Resolved tickets
          </h2>
          <Card className="divide-y divide-slate-50 border border-slate-200">
            {resolvedCases.slice(0, 8).map(c => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">{c.title}</p>
                    <p className="text-[11px] text-slate-400">#{c.id} · {c.priority}</p>
                  </div>
                </div>
                <Link href={`/cases/${c.id}`}>
                  <span className="text-xs text-violet-500 hover:underline cursor-pointer">View</span>
                </Link>
              </div>
            ))}
          </Card>
        </motion.div>
      )}

    </div>
  );
}
