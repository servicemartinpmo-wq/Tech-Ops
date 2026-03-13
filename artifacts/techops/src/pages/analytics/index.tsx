import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui";
import { useApiBase } from "@/hooks/use-api-base";
import {
  BarChart3, TrendingUp, TrendingDown, Clock, CheckCircle2, AlertTriangle,
  Zap, Target, Activity, RefreshCw, ShieldCheck, Wifi, Lock, ArrowUpRight,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";

interface KPI {
  cases30d: number; cases7d: number;
  resolved30d: number; resolved7d: number;
  resolutionRate30d: number; resolutionRate7d: number;
  avgConfidence30d: number; slaBreaches30d: number;
}

interface CaseMetrics {
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byDay: Array<{ day: string; total: string; resolved: string; critical: string }>;
  confidence: { avg: number; max: number; min: number };
  resolution: { avgMinutes: number; resolvedCount: number };
  slaBreaches: number;
}

interface PipelinePerf {
  overall: { avgDurationMs: number; avgConfidenceScore: number; totalRuns: number; avgTokensPerRun: number; errorCount: number; attemptCount: number };
  stageBreakdown: Array<{ stage: number; avgDurationMs: string; avgTokens: string; count: string }>;
}

interface ErrorTrends {
  topPatterns: Array<{ id: number; domain: string; title: string; occurrenceCount: number; avgConfidence: number; lastSeen: string }>;
  domainTrends: Array<{ domain: string; totalOccurrences: string; patternCount: string; avgConfidence?: string }>;
  escalationBreakdown: Record<string, number>;
}

interface CaseVolume {
  data: Array<{ day: string; total: string; critical: string; high: string; medium: string; low: string }>;
}

interface ResolutionTimes {
  data: Array<{ priority: string; avg_hours: string; min_hours: string; max_hours: string; count: string }>;
}

interface SlaCompliance {
  total: number; compliant: number; breached: number; resolved: number;
  openCases: number; inProgress: number; complianceRate: number;
}

interface ConnectorHealth {
  connectors: Record<string, Array<{ status: string; latencyMs: number | null; checkedAt: string }>>;
}

interface ErrorCategories {
  totalCases: number;
  categories: Array<{ domain: string; label: string; count: number; percentage: number }>;
}

type Period = "7" | "30" | "90";
type Tab = "overview" | "cases" | "pipeline" | "errors" | "connectors";

const COLORS = {
  violet: "#7c3aed", sky: "#0ea5e9", emerald: "#10b981", amber: "#f59e0b",
  rose: "#f43f5e", slate: "#94a3b8", indigo: "#6366f1", teal: "#14b8a6",
};

const PIE_COLORS = [COLORS.emerald, COLORS.sky, COLORS.amber, COLORS.rose, COLORS.slate, COLORS.violet];

const STATUS_COLORS: Record<string, string> = {
  resolved: COLORS.emerald, open: COLORS.sky, in_progress: COLORS.amber,
  escalated: COLORS.rose, closed: COLORS.slate,
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: COLORS.rose, high: "#f97316", medium: COLORS.amber, low: COLORS.slate,
};

const STAGE_NAMES: Record<number, string> = {
  1: "Classification", 2: "Quick-Fix", 3: "KB Retrieval",
  4: "UDO Traversal", 5: "Root Cause", 6: "Hypothesis",
  7: "Guardrails", 8: "Cost Gate", 9: "Action Plan",
  10: "Resolution", 11: "Self-Assess", 12: "Translation",
};

function StatCard({ label, value, sub, icon: Icon, color, trend }: {
  label: string; value: string | number; sub?: string;
  icon: React.ComponentType<{ className?: string }>; color: string; trend?: "up" | "down" | "neutral";
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="p-5 bg-white border border-slate-200 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-3xl font-bold ${color} tabular-nums`}>{value}</p>
            {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-xl bg-slate-100`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1 text-xs">
            {trend === "up" ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : trend === "down" ? <TrendingDown className="w-3 h-3 text-rose-500" /> : null}
            <span className={trend === "up" ? "text-emerald-600" : trend === "down" ? "text-rose-600" : "text-slate-400"}>
              {trend === "up" ? "Improving" : trend === "down" ? "Needs attention" : "Stable"}
            </span>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-semibold text-slate-700">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function TierBlockedBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 px-6 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mb-5">
        <Lock className="w-8 h-8 text-violet-600" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Analytics require a Professional plan or higher</h2>
      <p className="text-sm text-slate-500 max-w-md mb-6">
        Detailed case analytics, pipeline performance, SLA compliance tracking, and connector health history are available on the Professional, Compliance, and Enterprise plans.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 w-full max-w-lg text-xs">
        {[
          { plan: "Professional", price: "$349/mo", features: ["Case analytics", "Pipeline metrics", "SLA tracking"] },
          { plan: "Compliance",   price: "$749/mo", features: ["All Professional features", "Connector health history", "Full diagnostics"] },
          { plan: "Enterprise",   price: "Custom",  features: ["All features", "Priority support", "Custom SLA"] },
        ].map(p => (
          <div key={p.plan} className="border border-slate-200 rounded-xl p-4 bg-white text-left">
            <p className="font-semibold text-slate-800 mb-0.5">{p.plan}</p>
            <p className="text-violet-600 font-bold mb-2">{p.price}</p>
            {p.features.map(f => (
              <p key={f} className="text-slate-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" />{f}</p>
            ))}
          </div>
        ))}
      </div>
      <a href="/billing" className="inline-flex items-center gap-2 bg-violet-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors">
        Upgrade Plan <ArrowUpRight className="w-4 h-4" />
      </a>
    </motion.div>
  );
}

function ConnectorTimeline({ connectors }: { connectors: Record<string, Array<{ status: string; latencyMs: number | null; checkedAt: string }>> }) {
  const entries = Object.entries(connectors);
  if (entries.length === 0) return null;

  const statusColor: Record<string, string> = {
    healthy:  "bg-emerald-500",
    degraded: "bg-amber-400",
    down:     "bg-rose-500",
    unknown:  "bg-slate-300",
  };
  const statusLabel: Record<string, string> = {
    healthy: "Healthy", degraded: "Degraded", down: "Down", unknown: "Unknown",
  };

  return (
    <Card className="p-5 bg-white border border-slate-200 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700 mb-1">Connector Status Timeline</h3>
      <p className="text-xs text-slate-400 mb-4">Each cell represents one health check. Hover for details.</p>
      <div className="space-y-4">
        {entries.map(([name, checks]) => {
          const sorted = [...checks].sort((a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime());
          const uptime = sorted.length > 0
            ? Math.round((sorted.filter(c => c.status === "healthy").length / sorted.length) * 100)
            : 0;
          const lastStatus = sorted[sorted.length - 1]?.status || "unknown";

          return (
            <div key={name}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${statusColor[lastStatus] || statusColor.unknown}`} />
                  <span className="text-xs font-semibold text-slate-700">{name}</span>
                  <span className="text-[10px] text-slate-400">{sorted.length} checks</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                  <span className={`font-semibold ${uptime >= 95 ? "text-emerald-600" : uptime >= 80 ? "text-amber-600" : "text-rose-600"}`}>
                    {uptime}% uptime
                  </span>
                  <span className="text-slate-400">{statusLabel[lastStatus] || "Unknown"}</span>
                </div>
              </div>
              <div className="flex gap-0.5 flex-wrap">
                {sorted.map((check, idx) => {
                  const color = statusColor[check.status] || statusColor.unknown;
                  const ts    = new Date(check.checkedAt).toLocaleString();
                  const lat   = check.latencyMs != null ? `${check.latencyMs}ms` : "—";
                  return (
                    <div
                      key={idx}
                      title={`${ts}\nStatus: ${statusLabel[check.status] || check.status}\nLatency: ${lat}`}
                      className={`${color} rounded-sm cursor-default transition-opacity hover:opacity-70`}
                      style={{ width: 12, height: 20 }}
                    />
                  );
                })}
                {sorted.length === 0 && (
                  <p className="text-xs text-slate-400 italic">No checks recorded yet</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Healthy</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> Degraded</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" /> Down</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-slate-300 inline-block" /> Unknown</span>
      </div>
    </Card>
  );
}

export default function Analytics() {
  const apiBase = useApiBase();
  const [period, setPeriod] = useState<Period>("30");
  const [tab, setTab] = useState<Tab>("overview");
  const [tierBlocked, setTierBlocked] = useState(false);
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [metrics, setMetrics] = useState<CaseMetrics | null>(null);
  const [pipeline, setPipeline] = useState<PipelinePerf | null>(null);
  const [trends, setTrends] = useState<ErrorTrends | null>(null);
  const [caseVolume, setCaseVolume] = useState<CaseVolume | null>(null);
  const [resTimes, setResTimes] = useState<ResolutionTimes | null>(null);
  const [sla, setSla] = useState<SlaCompliance | null>(null);
  const [connHealth, setConnHealth] = useState<ConnectorHealth | null>(null);
  const [errorCats, setErrorCats] = useState<ErrorCategories | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchAll() {
    setLoading(true);
    try {
      const opts = { credentials: "include" as const };
      const [kR, mR, pR, tR, cvR, rtR, slaR, chR, ecR] = await Promise.all([
        fetch(`${apiBase}/api/analytics/kpi`, opts),
        fetch(`${apiBase}/api/analytics/case-metrics?days=${period}`, opts),
        fetch(`${apiBase}/api/analytics/pipeline-performance?days=${period}`, opts),
        fetch(`${apiBase}/api/analytics/error-trends?days=${period}`, opts),
        fetch(`${apiBase}/api/analytics/case-volume?days=${period}`, opts),
        fetch(`${apiBase}/api/analytics/resolution-times?days=${period}`, opts),
        fetch(`${apiBase}/api/analytics/sla-compliance?days=${period}`, opts),
        fetch(`${apiBase}/api/analytics/connector-health?days=${period}`, opts),
        fetch(`${apiBase}/api/analytics/error-categories?days=${period}`, opts),
      ]);

      // Detect tier block — kpi and all gated endpoints returning 403
      const gated = [kR, mR, pR, tR, cvR, rtR, slaR, chR, ecR];
      if (gated.some(r => r.status === 403)) {
        setTierBlocked(true);
        setLoading(false);
        return;
      }
      setTierBlocked(false);

      const parse = async (r: Response) => r.ok ? r.json().catch(() => null) : null;
      const [kpiD, mD, pD, tD, cvD, rtD, slaD, chD, ecD] = await Promise.all([
        parse(kR), parse(mR), parse(pR), parse(tR), parse(cvR), parse(rtR), parse(slaR), parse(chR), parse(ecR),
      ]);
      setKpi(kpiD); setMetrics(mD); setPipeline(pD); setTrends(tD);
      setCaseVolume(cvD); setResTimes(rtD); setSla(slaD); setConnHealth(chD); setErrorCats(ecD);
    } catch (err) {
      console.error("[analytics] fetchAll error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, [period]);

  const volumeData = useMemo(() =>
    (caseVolume?.data || []).map(d => ({
      day: new Date(d.day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      total: Number(d.total), critical: Number(d.critical),
      high: Number(d.high), medium: Number(d.medium), low: Number(d.low),
    })), [caseVolume]);

  const statusPieData = useMemo(() =>
    Object.entries(metrics?.byStatus || {}).map(([name, value]) => ({
      name: name.replace(/_/g, " "), value: Number(value),
      color: STATUS_COLORS[name] || COLORS.slate,
    })), [metrics]);

  const priorityPieData = useMemo(() =>
    Object.entries(metrics?.byPriority || {}).map(([name, value]) => ({
      name, value: Number(value),
      color: PRIORITY_COLORS[name] || COLORS.slate,
    })), [metrics]);

  const stageData = useMemo(() =>
    (pipeline?.stageBreakdown || []).map(s => ({
      name: STAGE_NAMES[s.stage] || `S${s.stage}`,
      duration: Number(s.avgDurationMs),
      tokens: Number(s.avgTokens),
      runs: Number(s.count),
    })), [pipeline]);

  const domainData = useMemo(() =>
    (trends?.domainTrends || []).map((d) => ({
      domain: String(d.domain),
      occurrences: Number(d.totalOccurrences),
      patterns: Number(d.patternCount),
      confidence: Number(d.avgConfidence || 0),
    })), [trends]);

  const resTimeData = useMemo(() =>
    (resTimes?.data || []).map(d => ({
      priority: d.priority,
      avg: Number(d.avg_hours),
      min: Number(d.min_hours),
      max: Number(d.max_hours),
      count: Number(d.count),
    })), [resTimes]);

  const connectorData = useMemo(() => {
    const c = connHealth?.connectors || {};
    return Object.entries(c).map(([name, checks]) => ({
      name,
      uptime: checks.length > 0
        ? Math.round((checks.filter(ch => ch.status === "healthy").length / checks.length) * 100)
        : 0,
      avgLatency: checks.length > 0
        ? Math.round(checks.reduce((sum, ch) => sum + (ch.latencyMs || 0), 0) / checks.length)
        : 0,
      checks: checks.length,
      lastStatus: checks[checks.length - 1]?.status || "unknown",
    }));
  }, [connHealth]);

  const tabs: Array<{ id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "cases", label: "Cases", icon: Activity },
    { id: "pipeline", label: "Pipeline", icon: Zap },
    { id: "errors", label: "Errors", icon: AlertTriangle },
    { id: "connectors", label: "Connectors", icon: Wifi },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-violet-600" />
            Analytics & Performance
          </h1>
          <p className="text-slate-500 text-sm mt-1">Diagnostic performance, case metrics, and operational intelligence</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex border border-slate-200 rounded-lg overflow-hidden text-xs font-medium">
            {(["7", "30", "90"] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 transition-colors ${period === p ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                {p}d
              </button>
            ))}
          </div>
          <button onClick={fetchAll} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors" title="Refresh">
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              tab === t.id
                ? "border-violet-600 text-violet-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-40">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <motion.div key={i} className="w-2 h-2 bg-violet-500 rounded-full"
                animate={{ y: [0, -8, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }} />
            ))}
          </div>
        </div>
      )}

      {!loading && tierBlocked && <TierBlockedBanner />}

      {!loading && !tierBlocked && (
        <>
          {tab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Cases (30d)" value={kpi?.cases30d ?? 0} sub={`${kpi?.cases7d ?? 0} this week`} icon={Activity} color="text-slate-700" />
                <StatCard label="Resolution Rate" value={`${kpi?.resolutionRate30d ?? 0}%`} sub={`${kpi?.resolutionRate7d ?? 0}% this week`}
                  icon={CheckCircle2} color="text-emerald-600" trend={(kpi?.resolutionRate30d ?? 0) >= 70 ? "up" : "down"} />
                <StatCard label="Avg Confidence" value={`${kpi?.avgConfidence30d ?? 0}%`} sub="30-day average"
                  icon={Target} color="text-violet-600" trend={(kpi?.avgConfidence30d ?? 0) >= 75 ? "up" : "neutral"} />
                <StatCard label="SLA Compliance" value={sla ? `${sla.complianceRate}%` : "—"} sub={sla ? `${sla.breached} breaches` : ""}
                  icon={ShieldCheck} color={sla && sla.complianceRate >= 90 ? "text-emerald-600" : "text-rose-600"}
                  trend={sla && sla.complianceRate >= 90 ? "up" : "down"} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-5 bg-white border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">Case Volume Trend</h3>
                  {volumeData.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-10">No case data in this period.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={volumeData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="total" name="Total" stroke={COLORS.violet} fill={COLORS.violet} fillOpacity={0.15} strokeWidth={2} />
                        <Area type="monotone" dataKey="critical" name="Critical" stroke={COLORS.rose} fill={COLORS.rose} fillOpacity={0.1} strokeWidth={1.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </Card>

                <Card className="p-5 bg-white border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">SLA Compliance</h3>
                  {!sla || sla.total === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-10">No SLA data yet.</p>
                  ) : (
                    <div className="flex items-center gap-6">
                      <ResponsiveContainer width={160} height={160}>
                        <PieChart>
                          <Pie data={[
                            { name: "Compliant", value: sla.compliant, fill: COLORS.emerald },
                            { name: "Breached", value: sla.breached, fill: COLORS.rose },
                          ]} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                            <Cell fill={COLORS.emerald} />
                            <Cell fill={COLORS.rose} />
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-emerald-500" />
                          <span className="text-slate-600">Compliant: <b>{sla.compliant}</b></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-rose-500" />
                          <span className="text-slate-600">Breached: <b>{sla.breached}</b></span>
                        </div>
                        <div className="mt-3 text-2xl font-bold text-slate-800">{sla.complianceRate}%</div>
                        <p className="text-xs text-slate-400">Compliance rate</p>
                      </div>
                    </div>
                  )}
                </Card>
              </div>

              {pipeline && (
                <Card className="p-5 bg-white border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-violet-500" /> Pipeline Performance
                    </h3>
                    <div className="flex gap-4 text-xs text-slate-500">
                      <span>{pipeline.overall.totalRuns} runs</span>
                      <span>{pipeline.overall.avgConfidenceScore}% avg confidence</span>
                      <span>{pipeline.overall.errorCount} errors</span>
                    </div>
                  </div>
                  {stageData.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">No pipeline runs in this period.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={stageData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                        <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10, fill: "#64748b" }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="duration" name="Avg ms" fill={COLORS.violet} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Card>
              )}
            </div>
          )}

          {tab === "cases" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-5 bg-white border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">Case Volume by Severity</h3>
                  {volumeData.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-10">No data.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={volumeData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                        <Bar dataKey="critical" name="Critical" stackId="a" fill={COLORS.rose} />
                        <Bar dataKey="high" name="High" stackId="a" fill="#f97316" />
                        <Bar dataKey="medium" name="Medium" stackId="a" fill={COLORS.amber} />
                        <Bar dataKey="low" name="Low" stackId="a" fill={COLORS.slate} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Card>

                <Card className="p-5 bg-white border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">Status Distribution</h3>
                  {statusPieData.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-10">No data.</p>
                  ) : (
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width={200} height={200}>
                        <PieChart>
                          <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                            paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {statusPieData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 text-xs">
                        {statusPieData.map(s => (
                          <div key={s.name} className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                            <span className="text-slate-600 capitalize">{s.name}: <b>{s.value}</b></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-5 bg-white border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">Priority Distribution</h3>
                  {priorityPieData.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-10">No data.</p>
                  ) : (
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width={200} height={200}>
                        <PieChart>
                          <Pie data={priorityPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                            paddingAngle={3} dataKey="value">
                            {priorityPieData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 text-xs">
                        {priorityPieData.map(s => (
                          <div key={s.name} className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                            <span className="text-slate-600 capitalize">{s.name}: <b>{s.value}</b></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>

                <Card className="p-5 bg-white border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" /> Resolution Time by Priority
                  </h3>
                  {resTimeData.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-10">No resolved cases in this period.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={resTimeData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="priority" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} label={{ value: "hours", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "#94a3b8" } }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="avg" name="Avg Hours" fill={COLORS.indigo} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  <div className="mt-3 space-y-1">
                    {resTimeData.map(r => (
                      <div key={r.priority} className="flex justify-between text-xs text-slate-500">
                        <span className="capitalize">{r.priority}</span>
                        <span>{r.avg}h avg · {r.min}h min · {r.max}h max · {r.count} cases</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <Card className="p-5 bg-white border border-slate-200 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Resolution Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { label: "Avg Resolution", value: metrics?.resolution.avgMinutes ? `${Math.round(metrics.resolution.avgMinutes)}m` : "—" },
                    { label: "Cases Resolved", value: metrics?.resolution.resolvedCount ?? 0 },
                    { label: "Avg Confidence", value: `${metrics?.confidence.avg ?? 0}%` },
                    { label: "Confidence Range", value: `${metrics?.confidence.min ?? 0}%–${metrics?.confidence.max ?? 0}%` },
                    { label: "SLA Breaches", value: metrics?.slaBreaches ?? 0 },
                  ].map(m => (
                    <div key={m.label} className="text-center p-3 rounded-lg bg-slate-50">
                      <p className="text-[10px] font-medium text-slate-400 uppercase">{m.label}</p>
                      <p className="text-lg font-bold text-slate-800 mt-1">{m.value}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {tab === "pipeline" && pipeline && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Runs" value={pipeline.overall.totalRuns} icon={Zap} color="text-violet-600" />
                <StatCard label="Avg Duration" value={pipeline.overall.avgDurationMs ? `${(pipeline.overall.avgDurationMs / 1000).toFixed(1)}s` : "—"}
                  icon={Clock} color="text-sky-600" />
                <StatCard label="Avg Confidence" value={`${pipeline.overall.avgConfidenceScore}%`}
                  icon={Target} color="text-emerald-600" trend={pipeline.overall.avgConfidenceScore >= 75 ? "up" : "neutral"} />
                <StatCard label="Error Count" value={pipeline.overall.errorCount}
                  icon={AlertTriangle} color={pipeline.overall.errorCount > 0 ? "text-rose-600" : "text-slate-400"} />
              </div>

              <Card className="p-5 bg-white border border-slate-200 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Stage Duration Breakdown</h3>
                {stageData.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-10">No pipeline runs in this period.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stageData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} angle={-30} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} label={{ value: "ms", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "#94a3b8" } }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                      <Bar dataKey="duration" name="Avg Duration (ms)" fill={COLORS.violet} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>

              <Card className="p-5 bg-white border border-slate-200 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Token Usage by Stage</h3>
                {stageData.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-10">No data.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={stageData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} angle={-30} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="tokens" name="Avg Tokens" fill={COLORS.teal} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>
          )}

          {tab === "errors" && (
            <div className="space-y-6">
              {/* Top Issue Categories — derived from case titles mapped to knowledge domains */}
              <Card className="p-5 bg-white border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-700">Top Issue Categories</h3>
                  {errorCats && <span className="text-xs text-slate-400">{errorCats.totalCases} cases · last {period}d</span>}
                </div>
                {(errorCats?.categories || []).length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-10">No cases in this period.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(200, (errorCats?.categories.length || 0) * 38)}>
                    <BarChart
                      data={(errorCats?.categories || []).map(c => ({ name: c.label, count: c.count, pct: c.percentage }))}
                      layout="vertical" margin={{ left: 8, right: 32, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: "#64748b" }} />
                      <Tooltip
                        formatter={(v: number, name: string) =>
                          name === "count" ? [`${v} cases`, "Cases"] : [`${v}%`, "Share"]
                        }
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                      />
                      <Bar dataKey="count" name="count" fill={COLORS.violet} radius={[0, 4, 4, 0]}>
                        {(errorCats?.categories || []).map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-5 bg-white border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">Error Domain Distribution</h3>
                  {domainData.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-10">No error patterns detected.</p>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={domainData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="domain" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                          <Bar dataKey="occurrences" name="Occurrences" fill={COLORS.rose} radius={[4, 4, 0, 0]} />
                          <Bar dataKey="patterns" name="Patterns" fill={COLORS.amber} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </>
                  )}
                </Card>

                <Card className="p-5 bg-white border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">Top Error Patterns</h3>
                  {(trends?.topPatterns || []).length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-10">No error patterns yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                      {trends?.topPatterns.slice(0, 10).map((p, i) => (
                        <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                          <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-700 truncate">{p.title}</p>
                            <p className="text-[10px] text-slate-400">{p.domain} · {p.occurrenceCount} occurrences</p>
                          </div>
                          <span className="text-xs font-semibold text-violet-600">{p.avgConfidence}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {trends && Object.keys(trends.escalationBreakdown).length > 0 && (
                <Card className="p-5 bg-white border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">Escalation Breakdown (30d)</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={Object.entries(trends.escalationBreakdown).map(([tier, count]) => ({ name: tier, value: count }))}
                        cx="50%" cy="50%" outerRadius={80} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {Object.keys(trends.escalationBreakdown).map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              )}
            </div>
          )}

          {tab === "connectors" && (
            <div className="space-y-6">
              {connectorData.length === 0 ? (
                <Card className="p-8 bg-white border border-slate-200 shadow-sm text-center">
                  <Wifi className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No connector health history yet.</p>
                  <p className="text-xs text-slate-400 mt-1">Poll connectors on the Connector Health page to start recording data.</p>
                </Card>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {connectorData.map(c => (
                      <Card key={c.name} className="p-4 bg-white border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-slate-700">{c.name}</span>
                          <span className={`w-2.5 h-2.5 rounded-full ${c.lastStatus === "healthy" ? "bg-emerald-500" : "bg-rose-500"}`} />
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-lg font-bold text-emerald-600">{c.uptime}%</p>
                            <p className="text-[10px] text-slate-400">Uptime</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-sky-600">{c.avgLatency}ms</p>
                            <p className="text-[10px] text-slate-400">Avg Latency</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-slate-600">{c.checks}</p>
                            <p className="text-[10px] text-slate-400">Checks</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {connHealth?.connectors && (
                    <ConnectorTimeline connectors={connHealth.connectors} />
                  )}

                  <Card className="p-5 bg-white border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-700 mb-4">Average Latency by Connector</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={connectorData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} label={{ value: "ms", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "#94a3b8" } }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="avgLatency" name="Avg Latency (ms)" fill={COLORS.sky} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
