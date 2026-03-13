import { useState, useEffect } from "react";
import { Card } from "@/components/ui";
import { useApiBase } from "@/hooks/use-api-base";
import {
  BarChart3, TrendingUp, TrendingDown, Clock, CheckCircle2, AlertTriangle,
  Zap, Target, Activity, ChevronDown, RefreshCw, Calendar,
} from "lucide-react";
import { motion } from "framer-motion";

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
  domainTrends: Array<{ domain: string; totalOccurrences: string; patternCount: string }>;
  escalationBreakdown: Record<string, number>;
}

type Period = "7" | "30" | "90";

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
          <div className={`p-2.5 rounded-xl ${color.replace("text-", "bg-").replace("-600", "-100").replace("-400", "-50")}`}>
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

function SimpleBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-slate-600 mb-1">
        <span className="capitalize">{label}</span>
        <span className="font-semibold tabular-nums">{value}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div className={`h-full ${color} rounded-full`} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
      </div>
    </div>
  );
}

const STAGE_NAMES: Record<number, string> = {
  1: "Classification", 2: "Quick-Fix Gate", 3: "KB Retrieval",
  4: "UDO Traversal", 5: "Root Cause", 6: "Hypothesis Validation",
  7: "Guardrails", 8: "Cost Gate", 9: "Action Planning",
  10: "Resolution", 11: "Self-Assessment", 12: "Translation",
};

export default function Analytics() {
  const apiBase = useApiBase();
  const [period, setPeriod] = useState<Period>("30");
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [metrics, setMetrics] = useState<CaseMetrics | null>(null);
  const [pipeline, setPipeline] = useState<PipelinePerf | null>(null);
  const [trends, setTrends] = useState<ErrorTrends | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchAll() {
    setLoading(true);
    try {
      const [kpiRes, metricsRes, pipelineRes, trendsRes] = await Promise.all([
        fetch(`${apiBase}/api/analytics/kpi`, { credentials: "include" }),
        fetch(`${apiBase}/api/analytics/case-metrics?days=${period}`, { credentials: "include" }),
        fetch(`${apiBase}/api/analytics/pipeline-performance?days=${period}`, { credentials: "include" }),
        fetch(`${apiBase}/api/analytics/error-trends`, { credentials: "include" }),
      ]);
      const [kpiData, metricsData, pipelineData, trendsData] = await Promise.all([
        kpiRes.json(), metricsRes.json(), pipelineRes.json(), trendsRes.json(),
      ]);
      setKpi(kpiData); setMetrics(metricsData); setPipeline(pipelineData); setTrends(trendsData);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, [period]);

  const maxStatusCount = Math.max(...Object.values(metrics?.byStatus || {}).map(Number), 1);
  const maxPriorityCount = Math.max(...Object.values(metrics?.byPriority || {}).map(Number), 1);
  const maxPatternCount = Math.max(...(trends?.topPatterns || []).map(p => p.occurrenceCount), 1);
  const maxStageDuration = Math.max(...(pipeline?.stageBreakdown || []).map(s => Number(s.avgDurationMs)), 1);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-violet-600" />
            Analytics & Performance
          </h1>
          <p className="text-slate-500 text-sm mt-1">Diagnostic performance, case metrics, and error trend intelligence</p>
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

      {!loading && kpi && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Cases (30d)" value={kpi.cases30d} sub={`${kpi.cases7d} this week`} icon={Briefcase2} color="text-slate-700" />
            <StatCard label="Resolution Rate" value={`${kpi.resolutionRate30d}%`} sub={`${kpi.resolutionRate7d}% this week`}
              icon={CheckCircle2} color="text-emerald-600" trend={kpi.resolutionRate30d >= 70 ? "up" : "down"} />
            <StatCard label="Avg Confidence" value={`${kpi.avgConfidence30d}%`} sub="30-day average"
              icon={Target} color="text-violet-600" trend={kpi.avgConfidence30d >= 75 ? "up" : "neutral"} />
            <StatCard label="SLA Breaches" value={kpi.slaBreaches30d} sub="Last 30 days"
              icon={AlertTriangle} color={kpi.slaBreaches30d > 0 ? "text-rose-600" : "text-slate-400"}
              trend={kpi.slaBreaches30d > 0 ? "down" : "neutral"} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="p-5 bg-white border border-slate-200 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-400" /> Cases by Status
              </h3>
              {Object.entries(metrics?.byStatus || {}).map(([status, count]) => (
                <SimpleBar key={status} label={status.replace(/_/g, " ")} value={Number(count)} max={maxStatusCount}
                  color={status === "resolved" ? "bg-emerald-500" : status === "open" ? "bg-sky-500" : status === "in_progress" ? "bg-amber-400" : "bg-slate-300"} />
              ))}
            </Card>

            <Card className="p-5 bg-white border border-slate-200 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-slate-400" /> Cases by Priority
              </h3>
              {Object.entries(metrics?.byPriority || {}).map(([priority, count]) => (
                <SimpleBar key={priority} label={priority} value={Number(count)} max={maxPriorityCount}
                  color={priority === "critical" ? "bg-rose-500" : priority === "high" ? "bg-orange-500" : priority === "medium" ? "bg-amber-400" : "bg-slate-300"} />
              ))}
            </Card>

            <Card className="p-5 bg-white border border-slate-200 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" /> Resolution Metrics
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Avg resolution time</span>
                  <span className="font-semibold text-slate-700">
                    {metrics?.resolution.avgMinutes ? `${Math.round(metrics.resolution.avgMinutes)}m` : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Cases resolved</span>
                  <span className="font-semibold text-emerald-600">{metrics?.resolution.resolvedCount ?? 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Avg confidence</span>
                  <span className="font-semibold text-violet-600">{metrics?.confidence.avg ?? 0}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Confidence range</span>
                  <span className="text-slate-600">{metrics?.confidence.min ?? 0}% – {metrics?.confidence.max ?? 0}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">SLA breaches</span>
                  <span className={metrics?.slaBreaches ? "font-semibold text-rose-600" : "text-slate-400"}>{metrics?.slaBreaches ?? 0}</span>
                </div>
              </div>
            </Card>
          </div>

          {pipeline && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-5 bg-white border border-slate-200 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-violet-500" /> 12-Stage Pipeline Performance
                </h3>
                <p className="text-xs text-slate-400 mb-4">{pipeline.overall.totalRuns} total runs · {pipeline.overall.avgDurationMs ? `avg ${(pipeline.overall.avgDurationMs / 1000).toFixed(1)}s total` : "no data yet"}</p>
                {pipeline.stageBreakdown.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">No pipeline runs yet in this period.</p>
                ) : (
                  <div className="space-y-1.5">
                    {pipeline.stageBreakdown.map(s => (
                      <div key={s.stage} className="flex items-center gap-2 text-xs">
                        <span className="w-20 text-slate-500 shrink-0 truncate" title={STAGE_NAMES[s.stage]}>{STAGE_NAMES[s.stage] || `Stage ${s.stage}`}</span>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div className="h-full bg-violet-500 rounded-full"
                            initial={{ width: 0 }} animate={{ width: `${(Number(s.avgDurationMs) / maxStageDuration) * 100}%` }}
                            transition={{ duration: 0.5 }} />
                        </div>
                        <span className="text-slate-500 tabular-nums w-12 text-right">{Number(s.avgDurationMs) > 999 ? `${(Number(s.avgDurationMs) / 1000).toFixed(1)}s` : `${s.avgDurationMs}ms`}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-5 bg-white border border-slate-200 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" /> Pipeline KPIs
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total pipeline runs</span>
                    <span className="font-semibold text-violet-600">{pipeline.overall.totalRuns}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Avg confidence score</span>
                    <span className="font-semibold text-emerald-600">{pipeline.overall.avgConfidenceScore}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Avg tokens per run</span>
                    <span className="text-slate-700">{pipeline.overall.avgTokensPerRun?.toLocaleString() || "—"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Error count</span>
                    <span className={pipeline.overall.errorCount > 0 ? "font-semibold text-rose-600" : "text-slate-400"}>
                      {pipeline.overall.errorCount}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Diagnostic attempts</span>
                    <span className="text-slate-600">{pipeline.overall.attemptCount}</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {trends && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-5 bg-white border border-slate-200 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-rose-500" /> Top Error Patterns
                </h3>
                {trends.topPatterns.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">No error patterns detected yet.</p>
                ) : (
                  <div className="space-y-2">
                    {trends.topPatterns.slice(0, 8).map(p => (
                      <div key={p.id}>
                        <div className="flex justify-between text-xs text-slate-600 mb-0.5">
                          <span className="truncate max-w-[180px]" title={p.title}>{p.title}</span>
                          <span className="font-semibold ml-2 shrink-0">{p.occurrenceCount}×</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div className="h-full bg-rose-400 rounded-full"
                            initial={{ width: 0 }} animate={{ width: `${(p.occurrenceCount / maxPatternCount) * 100}%` }}
                            transition={{ duration: 0.5 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-5 bg-white border border-slate-200 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-sky-500" /> Domain Error Distribution
                </h3>
                {trends.domainTrends.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">No domain data yet.</p>
                ) : (
                  <div className="space-y-2">
                    {trends.domainTrends.map((d, i) => {
                      const maxDomain = Math.max(...trends.domainTrends.map(x => Number(x.totalOccurrences)), 1);
                      const colors = ["bg-violet-500", "bg-sky-500", "bg-emerald-500", "bg-amber-400", "bg-rose-400", "bg-slate-400"];
                      return (
                        <div key={d.domain}>
                          <div className="flex justify-between text-xs text-slate-600 mb-0.5">
                            <span>{d.domain}</span>
                            <span className="font-semibold">{d.totalOccurrences} total · {d.patternCount} patterns</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div className={`h-full ${colors[i % colors.length]} rounded-full`}
                              initial={{ width: 0 }} animate={{ width: `${(Number(d.totalOccurrences) / maxDomain) * 100}%` }}
                              transition={{ duration: 0.5 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Briefcase2({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}
