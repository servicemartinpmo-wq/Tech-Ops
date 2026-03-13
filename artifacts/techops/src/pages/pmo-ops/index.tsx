import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, Button } from "@/components/ui";
import {
  BarChart3, Clock, Zap, TrendingUp, CheckCircle2, AlertTriangle,
  RefreshCw, Target, Activity, Layers
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import { useApiBase } from "@/hooks/use-api-base";

interface PMOData {
  period: { days: number };
  cases: { total: number; resolved: number; open: number; inProgress: number; resolutionRate: number; avgResolutionMinutes: number; avgConfidence: number };
  sla: { breached: number; compliant: number; rate: number };
  efficiency: { autoResolved: number; autoRate: number; timeSavedMinutes: number; timeSavedHours: number };
  batches: { total: number; completed: number; avgDurationMs: number; totalCasesProcessed: number };
  diagnostics: { attempts: number; avgConfidence: number };
  byDay: Array<{ day: string; submitted: string; resolved: string; avg_min: string }>;
  byPriority: Array<{ priority: string; count: string; resolved: string }>;
}

const COLORS = ["#7c3aed", "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e"];

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub?: string; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <Card className="p-5 border border-slate-200 shadow-sm bg-white">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
          <p className={`text-3xl font-bold tabular-nums ${color}`}>{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className="p-2.5 rounded-xl bg-slate-50">
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
    </Card>
  );
}

type Period = "7" | "30" | "90";

export default function PMOOps() {
  const apiBase = useApiBase();
  const [data, setData]       = useState<PMOData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState<Period>("30");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/pmo/dashboard?days=${period}`, { credentials: "include" });
      if (res.ok) setData(await res.json() as PMOData);
    } finally { setLoading(false); }
  }, [apiBase, period]);

  useEffect(() => { void load(); }, [load]);

  const volData = (data?.byDay || []).map(d => ({
    day:      new Date(d.day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    submitted: Number(d.submitted),
    resolved:  Number(d.resolved),
    avgMin:    Number(d.avg_min || 0),
  }));

  const priData = (data?.byPriority || []).map(d => ({
    name:     d.priority || "Unset",
    count:    Number(d.count),
    resolved: Number(d.resolved),
  }));

  const slaData = [
    { name: "Compliant", value: data?.sla.compliant || 0 },
    { name: "Breached",  value: data?.sla.breached  || 0 },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">PMO Operations</h1>
          <p className="text-slate-500 mt-1">Live efficiency and ROI metrics from your real case data.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 rounded-lg p-1">
            {(["7","30","90"] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${period === p ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
                {p}d
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading} size="sm" className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Resolution Rate" value={loading ? "—" : `${data?.cases.resolutionRate ?? 0}%`} sub={`${data?.cases.resolved ?? 0} of ${data?.cases.total ?? 0} resolved`} icon={CheckCircle2} color="text-emerald-600" />
        <StatCard label="Avg Resolution Time" value={loading ? "—" : `${data?.cases.avgResolutionMinutes ?? 0}m`} sub="per case" icon={Clock} color="text-sky-600" />
        <StatCard label="Time Saved" value={loading ? "—" : `${data?.efficiency.timeSavedHours ?? 0}h`} sub={`${data?.efficiency.autoRate ?? 0}% auto-resolved`} icon={Zap} color="text-violet-600" />
        <StatCard label="SLA Compliance" value={loading ? "—" : `${data?.sla.rate ?? 0}%`} sub={`${data?.sla.breached ?? 0} breached`} icon={Target} color={data?.sla.rate && data.sla.rate >= 90 ? "text-emerald-600" : "text-rose-600"} />
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Cases" value={loading ? "—" : String(data?.cases.total ?? 0)} sub={`last ${period}d`} icon={BarChart3} color="text-slate-700" />
        <StatCard label="Batch Runs" value={loading ? "—" : String(data?.batches.total ?? 0)} sub={`${data?.batches.totalCasesProcessed ?? 0} cases processed`} icon={Layers} color="text-indigo-600" />
        <StatCard label="Avg Confidence" value={loading ? "—" : `${data?.cases.avgConfidence ?? 0}%`} sub="Apphia Engine" icon={Activity} color="text-amber-600" />
        <StatCard label="Diagnostic Attempts" value={loading ? "—" : String(data?.diagnostics.attempts ?? 0)} sub={`avg conf ${data?.diagnostics.avgConfidence ?? 0}%`} icon={TrendingUp} color="text-teal-600" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-5 bg-white border border-slate-200 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Case Volume & Resolution Trend</h3>
          {loading ? <div className="h-64 bg-slate-50 rounded animate-pulse" /> : volData.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-16">No data in this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={volData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                <Area type="monotone" dataKey="submitted" name="Submitted" stroke="#7c3aed" fill="#7c3aed20" strokeWidth={2} />
                <Area type="monotone" dataKey="resolved"  name="Resolved"  stroke="#10b981" fill="#10b98120" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5 bg-white border border-slate-200 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Cases by Priority</h3>
          {loading ? <div className="h-64 bg-slate-50 rounded animate-pulse" /> : priData.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-16">No data in this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={priData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="count"    name="Total"    fill="#7c3aed" radius={[4,4,0,0]} />
                <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5 bg-white border border-slate-200 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">SLA Compliance Split</h3>
          {loading ? <div className="h-64 bg-slate-50 rounded animate-pulse" /> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={slaData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  <Cell fill="#10b981" />
                  <Cell fill="#f43f5e" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5 bg-white border border-slate-200 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Efficiency Summary</h3>
          {loading ? <div className="h-64 bg-slate-50 rounded animate-pulse" /> : (
            <div className="space-y-4 pt-4">
              {[
                { label: "Cases submitted",          value: String(data?.cases.total ?? 0) },
                { label: "Cases resolved",           value: String(data?.cases.resolved ?? 0) },
                { label: "Auto-resolved by Apphia",  value: String(data?.efficiency.autoResolved ?? 0) },
                { label: "Auto-resolution rate",     value: `${data?.efficiency.autoRate ?? 0}%` },
                { label: "Estimated time saved",     value: `${data?.efficiency.timeSavedHours ?? 0}h ${(data?.efficiency.timeSavedMinutes ?? 0) % 60}m` },
                { label: "Batch cases processed",    value: String(data?.batches.totalCasesProcessed ?? 0) },
                { label: "Avg resolution time",      value: `${data?.cases.avgResolutionMinutes ?? 0} min` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-600">{label}</span>
                  <span className="text-sm font-bold text-slate-900">{value}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {!loading && data?.cases.total === 0 && (
        <Card className="p-8 bg-white border border-slate-200 shadow-sm text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No case data in this period yet.</p>
          <p className="text-sm text-slate-400 mt-1">Submit cases via the Cases page to start seeing real efficiency metrics.</p>
        </Card>
      )}
    </div>
  );
}
