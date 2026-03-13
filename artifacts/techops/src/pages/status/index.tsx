import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Activity, Clock, Server } from "lucide-react";
import { useApiBase } from "@/hooks/use-api-base";

type CheckStatus = "operational" | "degraded" | "unconfigured";
interface Check { status: CheckStatus; latencyMs?: number; detail?: string }
interface StatusData {
  status: string; version: string; uptimeSeconds: number;
  responseTimeMs: number; checks: Record<string, Check>; timestamp: string;
}

const CHECK_LABELS: Record<string, string> = {
  database: "Database",
  knowledgeBase: "Knowledge Base",
  caseEngine: "Case Engine",
  auth: "Authentication",
  apphiaEngine: "Apphia Engine",
};

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === "operational") return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  if (status === "degraded") return <XCircle className="w-4 h-4 text-red-400" />;
  return <AlertTriangle className="w-4 h-4 text-amber-400" />;
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${seconds % 60}s`;
}

export default function StatusPage() {
  const apiBase = useApiBase();
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/status`);
      if (res.ok) setData(await res.json() as StatusData);
    } finally {
      setLoading(false);
      setLastChecked(new Date());
    }
  }, [apiBase]);

  useEffect(() => { void load(); const t = setInterval(() => void load(), 30000); return () => clearInterval(t); }, [load]);

  const overallColor = data?.status === "operational"
    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    : data?.status === "degraded"
    ? "text-red-400 bg-red-500/10 border-red-500/20"
    : "text-amber-400 bg-amber-500/10 border-amber-500/20";

  return (
    <div className="min-h-screen bg-[#08090c] text-slate-300">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">System Status</h1>
                <p className="text-xs text-slate-500">Tech-Ops by Martin PMO</p>
              </div>
            </div>
            <button onClick={() => void load()} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 border border-white/[0.08] rounded-lg hover:text-white transition-colors disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {data && (
            <>
              <div className={`flex items-center gap-3 p-4 rounded-2xl border mb-8 ${overallColor}`}>
                <StatusIcon status={data.status as CheckStatus} />
                <div>
                  <p className="font-semibold capitalize">{data.status === "operational" ? "All Systems Operational" : data.status === "degraded" ? "Partial Degradation" : "Partial Outage"}</p>
                  <p className="text-xs opacity-70">v{data.version} · Uptime {formatUptime(data.uptimeSeconds)} · Response {data.responseTimeMs}ms</p>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                {Object.entries(data.checks).map(([key, check], i) => (
                  <motion.div key={key} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <StatusIcon status={check.status} />
                      <div>
                        <p className="text-sm font-medium text-white">{CHECK_LABELS[key] ?? key}</p>
                        {check.detail && <p className="text-xs text-slate-500">{check.detail}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {check.latencyMs !== undefined && (
                        <span className="text-xs text-slate-600">{check.latencyMs}ms</span>
                      )}
                      <span className={`text-xs font-medium capitalize px-2 py-0.5 rounded-md border ${
                        check.status === "operational" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                        : check.status === "degraded" ? "text-red-400 bg-red-500/10 border-red-500/20"
                        : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                      }`}>{check.status}</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { label: "Uptime", value: formatUptime(data.uptimeSeconds), icon: Clock },
                  { label: "Response", value: `${data.responseTimeMs}ms`, icon: Activity },
                  { label: "Version", value: `v${data.version}`, icon: Server },
                ].map(m => (
                  <div key={m.label} className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06] text-center">
                    <m.icon className="w-4 h-4 text-slate-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-white">{m.value}</p>
                    <p className="text-xs text-slate-600">{m.label}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {loading && !data && (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {lastChecked && (
            <p className="text-center text-xs text-slate-600">
              Last checked: {lastChecked.toLocaleTimeString()} · Auto-refreshes every 30s
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
