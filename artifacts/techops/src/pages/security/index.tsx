import { useState, useEffect, useCallback } from "react";
import { Card, Badge, Button } from "@/components/ui";
import { motion } from "framer-motion";
import {
  ShieldCheck, ShieldAlert, Lock, Eye, AlertTriangle, CheckCircle2,
  XCircle, Clock, Activity, RefreshCw, FileText
} from "lucide-react";
import { useApiBase } from "@/hooks/use-api-base";

interface PrivacyCheck { label: string; status: "pass" | "warn" | "fail"; note?: string }
interface ConnectorIssue { name: string; checks: number; failures: number; uptime: number }
interface AuditEvent { id: number; action: string; resourceType: string; resourceId?: string; details?: Record<string, unknown>; createdAt: string }
interface SecurityData {
  score: number;
  period: { days: number };
  auditEvents: { total: number; recent: AuditEvent[] };
  alerts: { bySeverity: Record<string, number>; total: number };
  cases: { total: number; breached: number; critical: number; slaRate: number };
  connectorIssues: ConnectorIssue[];
  privacyChecks: PrivacyCheck[];
}

function RadialGauge({ score, size = 140 }: { score: number; size?: number }) {
  const color = score >= 80 ? "#00ff88" : score >= 50 ? "#ffb800" : "#ff3355";
  const circumference = 2 * Math.PI * 58;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 130 130" className="w-full h-full -rotate-90">
        <circle cx="65" cy="65" r="58" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
        <motion.circle cx="65" cy="65" r="58" fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: `drop-shadow(0 0 8px ${color}60)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white font-display">{score}</span>
        <span className="text-xs text-slate-500">/ 100</span>
      </div>
    </div>
  );
}

const statusIcon = (s: string) => s === "pass"
  ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
  : s === "warn"
    ? <AlertTriangle className="w-4 h-4 text-amber-400" />
    : <XCircle className="w-4 h-4 text-rose-400" />;

const sevColor: Record<string, string> = {
  critical: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  high:     "bg-orange-500/10 text-orange-400 border-orange-500/20",
  medium:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low:      "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

export default function Security() {
  const apiBase = useApiBase();
  const [data, setData]       = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<"overview" | "audit" | "connectors">("overview");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/security/dashboard`, { credentials: "include" });
      if (res.ok) setData(await res.json() as SecurityData);
    } finally { setLoading(false); }
  }, [apiBase]);

  useEffect(() => { void load(); }, [load]);

  const scoreLabel = !data ? "—" : data.score >= 80 ? "Strong" : data.score >= 50 ? "Fair" : "At Risk";
  const scoreColor = !data ? "text-slate-400" : data.score >= 80 ? "text-emerald-400" : data.score >= 50 ? "text-amber-400" : "text-rose-400";

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white text-glow">Security Dashboard</h1>
          <p className="text-slate-500 mt-1">Live security posture computed from audit logs, alerts, and SLA data.</p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading} size="sm" className="flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </motion.div>

      {/* Top strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Security Score", value: loading ? "—" : String(data?.score ?? 0), sub: scoreLabel, color: scoreColor, Icon: ShieldCheck },
          { label: "Audit Events (30d)", value: loading ? "—" : String(data?.auditEvents.total ?? 0), sub: "logged actions", color: "text-sky-400", Icon: FileText },
          { label: "Active Alerts", value: loading ? "—" : String(data?.alerts.total ?? 0), sub: `${data?.alerts.bySeverity.critical ?? 0} critical`, color: "text-amber-400", Icon: AlertTriangle },
          { label: "SLA Compliance", value: loading ? "—" : `${data?.cases.slaRate ?? 0}%`, sub: "last 30d", color: data?.cases.slaRate && data.cases.slaRate >= 90 ? "text-emerald-400" : "text-rose-400", Icon: Activity },
        ].map(({ label, value, sub, color, Icon }) => (
          <Card key={label} className="p-5 bg-[#0d0f17] border border-white/[0.06]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{label}</p>
                <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
                {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
              </div>
              <Icon className={`w-5 h-5 ${color} mt-1`} />
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-white/[0.02] border border-white/[0.04] rounded-xl w-fit">
        {(["overview", "audit", "connectors"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}>
            {t === "overview" ? "Overview" : t === "audit" ? "Audit Log" : "Connector Issues"}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gauge */}
          <Card className="p-6 bg-[#0d0f17] border border-white/[0.06] flex flex-col items-center justify-center gap-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Security Posture</h3>
            {loading ? <div className="w-[140px] h-[140px] bg-white/[0.04] rounded-full animate-pulse" /> : <RadialGauge score={data?.score ?? 0} />}
            <p className={`text-lg font-bold ${scoreColor}`}>{scoreLabel}</p>
            <p className="text-xs text-slate-600 text-center">Computed from audit events, alert severity, SLA compliance, and critical case rate.</p>
          </Card>

          {/* Privacy / Compliance Checks */}
          <Card className="lg:col-span-2 p-6 bg-[#0d0f17] border border-white/[0.06]">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Compliance Checks</h3>
            {loading ? (
              <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-9 bg-white/[0.04] rounded-lg animate-pulse" />)}</div>
            ) : (
              <div className="space-y-2">
                {(data?.privacyChecks || []).map((c) => (
                  <div key={c.label} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-3">
                      {statusIcon(c.status)}
                      <span className="text-sm text-slate-300">{c.label}</span>
                    </div>
                    {c.note && <span className="text-xs text-slate-500">{c.note}</span>}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Alert breakdown */}
          <Card className="lg:col-span-3 p-6 bg-[#0d0f17] border border-white/[0.06]">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Alert Severity Breakdown (30d)</h3>
            {loading ? <div className="h-16 bg-white/[0.04] rounded-lg animate-pulse" /> : (
              Object.keys(data?.alerts.bySeverity || {}).length === 0
                ? <p className="text-sm text-slate-500 text-center py-6">No alerts in last 30 days.</p>
                : <div className="flex flex-wrap gap-3">
                    {Object.entries(data?.alerts.bySeverity || {}).map(([sev, cnt]) => (
                      <div key={sev} className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium ${sevColor[sev] || sevColor.low}`}>
                        <span className="capitalize">{sev}</span>
                        <span className="font-bold">{cnt}</span>
                      </div>
                    ))}
                  </div>
            )}
          </Card>
        </div>
      )}

      {tab === "audit" && (
        <Card className="p-6 bg-[#0d0f17] border border-white/[0.06]">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Recent Audit Events</h3>
          {loading ? (
            <div className="space-y-3">{[...Array(8)].map((_, i) => <div key={i} className="h-12 bg-white/[0.04] rounded-lg animate-pulse" />)}</div>
          ) : (data?.auditEvents.recent || []).length === 0 ? (
            <div className="text-center py-12">
              <Lock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No audit events recorded yet.</p>
              <p className="text-xs text-slate-600 mt-1">Events appear as you use the platform.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
              {data?.auditEvents.recent.map((e) => (
                <div key={e.id} className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                  <Eye className="w-4 h-4 text-slate-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-300 truncate"><span className="font-mono text-violet-400">{e.action}</span> on {e.resourceType}{e.resourceId ? ` #${e.resourceId}` : ""}</p>
                  </div>
                  <span className="text-xs text-slate-600 shrink-0">{new Date(e.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === "connectors" && (
        <Card className="p-6 bg-[#0d0f17] border border-white/[0.06]">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Connector Health Issues (7d)</h3>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white/[0.04] rounded-lg animate-pulse" />)}</div>
          ) : (data?.connectorIssues || []).length === 0 ? (
            <div className="text-center py-12">
              <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-sm text-slate-300 font-medium">All connectors healthy</p>
              <p className="text-xs text-slate-500 mt-1">No failures detected in the past 7 days.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data?.connectorIssues.map((c) => (
                <div key={c.name} className="flex items-center gap-4 p-4 rounded-lg bg-rose-500/5 border border-rose-500/20">
                  <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-200">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.failures} failure{c.failures !== 1 ? "s" : ""} out of {c.checks} checks</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${c.uptime >= 95 ? "text-emerald-400" : c.uptime >= 80 ? "text-amber-400" : "text-rose-400"}`}>{c.uptime}%</p>
                    <p className="text-xs text-slate-500">uptime</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
