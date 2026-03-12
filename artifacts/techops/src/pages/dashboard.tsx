import { useGetDashboardStats, useGetRecentActivity } from "@workspace/api-client-react";
import { Card } from "@/components/ui";
import { Activity, AlertCircle, CheckCircle2, Clock, Zap, Shield, Brain, ArrowUpRight, BookOpen, GitBranch, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useState, useEffect, useRef } from "react";
import { useApiBase } from "@/hooks/use-api-base";

function AnimatedCounter({ value, suffix = "" }: { value: number | string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const numVal = typeof value === "string" ? parseInt(value) || 0 : value;
  useEffect(() => {
    let start = 0;
    const duration = 1200;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (numVal - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    tick();
  }, [numVal]);
  return <>{display}{suffix}</>;
}

const INTEGRATIONS = [
  { name: "Slack", domain: "slack.com", status: "connected", color: "#4A154B" },
  { name: "Google Workspace", domain: "google.com", status: "connected", color: "#4285F4" },
  { name: "GitHub", domain: "github.com", status: "connected", color: "#24292f" },
  { name: "Stripe", domain: "stripe.com", status: "connected", color: "#635BFF" },
  { name: "Zapier", domain: "zapier.com", status: "monitoring", color: "#FF4A00" },
  { name: "Notion", domain: "notion.so", status: "monitoring", color: "#000000" },
  { name: "Microsoft 365", domain: "microsoft.com", status: "connected", color: "#00A4EF" },
  { name: "HubSpot", domain: "hubspot.com", status: "monitoring", color: "#FF7A59" },
  { name: "Linear", domain: "linear.app", status: "available", color: "#5E6AD2" },
  { name: "Jira", domain: "atlassian.com", status: "available", color: "#0052CC" },
  { name: "AWS", domain: "aws.amazon.com", status: "connected", color: "#FF9900" },
  { name: "Cloudflare", domain: "cloudflare.com", status: "connected", color: "#F38020" },
  { name: "Vercel", domain: "vercel.com", status: "monitoring", color: "#000000" },
  { name: "PagerDuty", domain: "pagerduty.com", status: "available", color: "#06AC38" },
  { name: "Figma", domain: "figma.com", status: "available", color: "#F24E1E" },
  { name: "Dropbox", domain: "dropbox.com", status: "available", color: "#0061FF" },
];

const STATUS_CONFIG = {
  connected: { label: "Connected", color: "text-emerald-600", bg: "bg-emerald-50", dot: "bg-emerald-500" },
  monitoring: { label: "Monitoring", color: "text-amber-600", bg: "bg-amber-50", dot: "bg-amber-500" },
  available: { label: "Available", color: "text-slate-400", bg: "bg-slate-50", dot: "bg-slate-300" },
};

function IntegrationCarousel() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const visibleCount = 5;

  const advance = (dir: number) => {
    setActiveIdx(i => (i + dir + INTEGRATIONS.length) % INTEGRATIONS.length);
  };

  useEffect(() => {
    if (isPaused) return;
    timerRef.current = setInterval(() => advance(1), 3000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPaused]);

  const visible = Array.from({ length: visibleCount }, (_, i) =>
    INTEGRATIONS[(activeIdx + i) % INTEGRATIONS.length]
  );

  const connected = INTEGRATIONS.filter(i => i.status === "connected").length;
  const monitoring = INTEGRATIONS.filter(i => i.status === "monitoring").length;

  return (
    <div
      className="space-y-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />{connected} connected
          </span>
          <span className="flex items-center gap-1.5 text-amber-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500" />{monitoring} monitoring
          </span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => advance(-1)} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => advance(1)} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3 overflow-hidden">
        {visible.map((app, i) => {
          const cfg = STATUS_CONFIG[app.status as keyof typeof STATUS_CONFIG];
          return (
            <motion.div
              key={`${app.name}-${activeIdx}-${i}`}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all group cursor-pointer"
                style={{ animation: `integration-float ${3 + i * 0.5}s ease-in-out infinite ${i * 0.3}s` }}>
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-slate-50 border border-slate-100">
                    <img
                      src={`https://logo.clearbit.com/${app.domain}`}
                      alt={app.name}
                      className="w-8 h-8 object-contain"
                      onError={(e) => {
                        const el = e.currentTarget as HTMLImageElement;
                        el.style.display = "none";
                        const parent = el.parentElement!;
                        parent.innerHTML = `<div style="width:32px;height:32px;border-radius:8px;background:${app.color};display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:13px;font-family:Space Grotesk,sans-serif">${app.name[0]}</div>`;
                      }}
                    />
                  </div>
                  {app.status === "connected" && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
                  )}
                  {app.status === "monitoring" && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-white shadow-sm animate-pulse" />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-semibold text-slate-700 leading-tight truncate max-w-[60px]">{app.name}</p>
                  <span className={`text-[9px] font-medium ${cfg.color}`}>{cfg.label}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex justify-center gap-1">
        {INTEGRATIONS.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIdx(i)}
            className="h-1 rounded-full transition-all duration-300"
            style={{ width: i === activeIdx ? "1.5rem" : "0.4rem", backgroundColor: i === activeIdx ? "#0ea5e9" : "#cbd5e1" }}
          />
        ))}
      </div>
    </div>
  );
}

function useKBStats(apiBase: string) {
  const [kbStats, setKbStats] = useState<{
    totalKBEntries: number; avgSuccessRate: number; selfHealableCount: number; domains: number;
    monitorStats: { activeDownConnectors: number; autoCreatedCasesCount: number; monitoredConnectors: number };
  } | null>(null);
  useEffect(() => {
    fetch(`${apiBase}/api/kb/stats`, { credentials: "include" })
      .then(r => r.json()).then(setKbStats).catch(() => {});
  }, [apiBase]);
  return kbStats;
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity({ limit: 8 });
  const apiBase = useApiBase();
  const kbStats = useKBStats(apiBase);

  if (statsLoading || activityLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-10 h-10 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: "Active Cases", value: stats?.openCases || 0, icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-100" },
    { label: "Resolved", value: stats?.resolvedCases || 0, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-100" },
    { label: "Avg Resolution", value: stats?.avgResolutionTime ? `${Math.round(stats.avgResolutionTime / 60)}` : "0", suffix: "h", icon: Clock, color: "text-sky-500", bg: "bg-sky-50", border: "border-sky-100" },
    { label: "Total Handled", value: stats?.totalCases || 0, icon: Activity, color: "text-violet-500", bg: "bg-violet-50", border: "border-violet-100" },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">Platform Overview</h1>
          <p className="text-slate-400 mt-0.5 text-sm">Real-time metrics and system health powered by Apphia.</p>
        </div>
        <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-full flex items-center gap-2 text-xs font-medium text-slate-500 shadow-sm">
          Plan: <span className="text-sky-600 font-bold capitalize">{stats?.subscriptionTier || 'Free'}</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <Card className="p-5 bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-3xl font-display font-bold text-slate-900 mt-1.5">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix || ""} />
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${stat.bg} border ${stat.border} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2">
          <Card className="p-5 bg-white border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-display font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-500" />
                Connected Applications
              </h2>
              <Link href="/connectors" className="text-xs text-sky-500 hover:text-sky-600 transition-colors flex items-center gap-1 font-medium">
                View All <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <IntegrationCarousel />
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="p-5 bg-white border border-slate-100 shadow-sm h-full">
            <h2 className="text-base font-display font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-sky-500" />
              Connector Health
            </h2>
            <div className="space-y-3">
              {[
                { label: "Healthy", count: stats?.connectorHealth.healthy || 0, color: "#10b981", lightBg: "#ecfdf5", border: "#a7f3d0" },
                { label: "Degraded", count: stats?.connectorHealth.degraded || 0, color: "#f59e0b", lightBg: "#fffbeb", border: "#fcd34d" },
                { label: "Down", count: stats?.connectorHealth.down || 0, color: "#ef4444", lightBg: "#fef2f2", border: "#fca5a5" },
              ].map((item, idx) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center border font-bold text-sm"
                    style={{ backgroundColor: item.lightBg, borderColor: item.border, color: item.color }}>
                    {item.count}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs font-medium text-slate-700">{item.label}</p>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(5, (item.count / Math.max(1, (stats?.connectorHealth.healthy || 0) + (stats?.connectorHealth.degraded || 0) + (stats?.connectorHealth.down || 0))) * 100)}%` }}
                        transition={{ delay: 0.5 + idx * 0.1, duration: 0.8, ease: "easeOut" }}
                        style={{ backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="relative w-20 h-20 mx-auto">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                  <motion.circle
                    cx="18" cy="18" r="15.5" fill="none" stroke="#0ea5e9" strokeWidth="3"
                    strokeDasharray={`${78 * 0.85} ${78}`}
                    strokeLinecap="round"
                    initial={{ strokeDasharray: "0 78" }}
                    animate={{ strokeDasharray: `${78 * 0.85} ${78}` }}
                    transition={{ delay: 0.6, duration: 1.2, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-slate-900 font-display">85</span>
                </div>
              </div>
              <p className="text-center text-xs text-slate-400 mt-2 font-medium">Stack Score</p>
            </div>
          </Card>
        </motion.div>
      </div>

      {kbStats && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Card className="p-5 bg-white border border-violet-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-display font-bold text-slate-900 flex items-center gap-2">
                <Brain className="w-4 h-4 text-violet-500" />
                Apphia Autonomy Engine
              </h2>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-emerald-600 font-medium">Active</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { label: "KB Entries", value: kbStats.totalKBEntries, icon: BookOpen, color: "#0ea5e9", bg: "#e0f2fe" },
                { label: "KB Success Rate", value: `${kbStats.avgSuccessRate}%`, icon: BarChart3, color: "#10b981", bg: "#d1fae5" },
                { label: "Auto-Healable", value: kbStats.selfHealableCount, icon: Zap, color: "#8b5cf6", bg: "#ede9fe" },
                { label: "Auto-Created Cases", value: kbStats.monitorStats.autoCreatedCasesCount, icon: GitBranch, color: "#f59e0b", bg: "#fef3c7" },
              ].map(s => (
                <div key={s.label} className="text-center p-3 rounded-xl border border-slate-100 bg-slate-50">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: s.bg }}>
                    <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                  </div>
                  <p className="text-xl font-bold font-display" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Proactive monitoring active · 5-min cycles · Auto-creates cases on outage</span>
              <Link href="/kb" className="text-violet-500 hover:text-violet-600 transition-colors flex items-center gap-1 font-medium">
                Browse KB <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="p-0 overflow-hidden bg-white border border-slate-100 shadow-sm h-[380px] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-display font-bold text-slate-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-sky-500" />
                System Activity
              </h2>
            </div>
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
              {!activity?.length ? (
                <p className="text-slate-400 text-center py-8 text-sm">No recent activity.</p>
              ) : (
                <div className="space-y-3">
                  {activity.map((item, i) => (
                    <motion.div key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-2 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-700 leading-relaxed">{item.message}</p>
                        <time className="text-[10px] text-slate-400 mt-0.5 block">{format(new Date(item.timestamp), "MMM d, h:mm a")}</time>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card className="p-5 bg-white border border-slate-100 shadow-sm h-[380px] flex flex-col">
            <h2 className="text-base font-display font-bold text-slate-900 flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              Platform Metrics
            </h2>
            <div className="space-y-3 flex-1">
              {[
                { label: "Active Integrations", value: `${INTEGRATIONS.filter(i => i.status === "connected").length}`, trend: "+2 this month", color: "text-sky-600", bg: "bg-sky-50" },
                { label: "Automation Rate", value: "73%", trend: "+5% from last week", color: "text-violet-600", bg: "bg-violet-50" },
                { label: "Avg Response Time", value: "142ms", trend: "-12ms improvement", color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Security Score", value: "85/100", trend: "Good standing", color: "text-amber-600", bg: "bg-amber-50" },
                { label: "Monthly Savings", value: "$1,240", trend: "vs manual ops", color: "text-sky-600", bg: "bg-sky-50" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-xs font-medium text-slate-700">{item.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{item.trend}</p>
                  </div>
                  <span className={`text-base font-bold font-display ${item.color} px-2 py-0.5 rounded-lg ${item.bg}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
