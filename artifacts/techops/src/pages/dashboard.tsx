import { useGetDashboardStats, useGetRecentActivity } from "@workspace/api-client-react";
import { Card } from "@/components/ui";
import { Activity, AlertCircle, CheckCircle2, Clock, Zap, Shield, Brain, ArrowUpRight, BookOpen, GitBranch, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useState, useEffect, useRef } from "react";
import { useApiBase } from "@/hooks/use-api-base";
import { OnboardingModal } from "@/components/onboarding-modal";

function AnimatedCounter({ value, suffix = "" }: { value: number | string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const numVal = typeof value === "string" ? parseInt(value) || 0 : value;
  useEffect(() => {
    const duration = 1200;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(numVal * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    tick();
  }, [numVal]);
  return <>{display}{suffix}</>;
}

const INTEGRATIONS = [
  { name: "Slack", slug: "slack", color: "4A154B", status: "connected", brand: "#4A154B" },
  { name: "Google Workspace", slug: "googleworkspace", color: "00A4FF", status: "connected", brand: "#4285F4" },
  { name: "GitHub", slug: "github", color: "181717", status: "connected", brand: "#181717" },
  { name: "Stripe", slug: "stripe", color: "635BFF", status: "connected", brand: "#635BFF" },
  { name: "Zapier", slug: "zapier", color: "FF4A00", status: "monitoring", brand: "#FF4A00" },
  { name: "Notion", slug: "notion", color: "000000", status: "monitoring", brand: "#000000" },
  { name: "Microsoft 365", slug: "microsoft", color: "00A4EF", status: "connected", brand: "#00A4EF" },
  { name: "HubSpot", slug: "hubspot", color: "FF7A59", status: "monitoring", brand: "#FF7A59" },
  { name: "Linear", slug: "linear", color: "5E6AD2", status: "available", brand: "#5E6AD2" },
  { name: "Jira", slug: "jira", color: "0052CC", status: "available", brand: "#0052CC" },
  { name: "AWS", slug: "amazonaws", color: "FF9900", status: "connected", brand: "#FF9900" },
  { name: "Cloudflare", slug: "cloudflare", color: "F38020", status: "connected", brand: "#F38020" },
  { name: "Vercel", slug: "vercel", color: "000000", status: "monitoring", brand: "#000000" },
  { name: "PagerDuty", slug: "pagerduty", color: "25C151", status: "available", brand: "#25C151" },
  { name: "Figma", slug: "figma", color: "F24E1E", status: "available", brand: "#F24E1E" },
  { name: "Dropbox", slug: "dropbox", color: "0061FF", status: "available", brand: "#0061FF" },
];

const STATUS_CONFIG = {
  connected: { label: "Connected", color: "text-emerald-600", bg: "bg-emerald-50", dot: "bg-emerald-500" },
  monitoring: { label: "Monitoring", color: "text-amber-600", bg: "bg-amber-50", dot: "bg-amber-400" },
  available: { label: "Available", color: "text-slate-400", bg: "bg-slate-50", dot: "bg-slate-300" },
};

function AppLogoIcon({ app }: { app: typeof INTEGRATIONS[0] }) {
  const [err, setErr] = useState(false);
  const initials = app.name.split(" ").map(w => w[0]).join("").slice(0, 2);
  if (err) {
    return (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold"
        style={{ background: `linear-gradient(135deg, ${app.brand}, ${app.brand}cc)` }}>
        {initials}
      </div>
    );
  }
  return (
    <img
      src={`https://cdn.simpleicons.org/${app.slug}/${app.color}`}
      alt={app.name}
      className="w-7 h-7 object-contain"
      onError={() => setErr(true)}
    />
  );
}

function IntegrationCarousel() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const visibleCount = 5;

  const advance = (dir: number) => setActiveIdx(i => (i + dir + INTEGRATIONS.length) % INTEGRATIONS.length);

  useEffect(() => {
    if (isPaused) return;
    timerRef.current = setInterval(() => advance(1), 3200);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPaused]);

  const visible = Array.from({ length: visibleCount }, (_, i) =>
    INTEGRATIONS[(activeIdx + i) % INTEGRATIONS.length]
  );

  const connected = INTEGRATIONS.filter(i => i.status === "connected").length;
  const monitoring = INTEGRATIONS.filter(i => i.status === "monitoring").length;

  return (
    <div onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />{connected} connected
          </span>
          <span className="flex items-center gap-1.5 text-amber-600 font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />{monitoring} monitoring
          </span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => advance(-1)} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors shadow-sm">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => advance(1)} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors shadow-sm">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {visible.map((app, i) => {
          const cfg = STATUS_CONFIG[app.status as keyof typeof STATUS_CONFIG];
          return (
            <motion.div
              key={`${app.name}-${activeIdx}-${i}`}
              initial={{ opacity: 0, y: 12, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="card-3d"
            >
              <div
                className="flex flex-col items-center gap-2.5 p-3.5 rounded-2xl border cursor-pointer group transition-all"
                style={{
                  background: `linear-gradient(145deg, #ffffff 0%, ${app.brand}08 100%)`,
                  borderColor: `${app.brand}25`,
                  boxShadow: `0 2px 8px ${app.brand}12, 0 1px 2px rgba(15,23,42,0.04), inset 0 1px 0 rgba(255,255,255,0.9)`,
                  animation: `integration-float ${3.5 + i * 0.4}s ease-in-out infinite ${i * 0.25}s`,
                }}
              >
                <div className="relative">
                  <div className="w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center"
                    style={{ background: `${app.brand}10`, border: `1px solid ${app.brand}20` }}>
                    <AppLogoIcon app={app} />
                  </div>
                  {app.status === "connected" && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                  )}
                  {app.status === "monitoring" && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-white animate-pulse" />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-700 leading-tight truncate max-w-[64px]">{app.name}</p>
                  <span className={`text-[9px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex justify-center gap-1 pt-1">
        {INTEGRATIONS.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIdx(i)}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{ width: i === activeIdx ? "1.75rem" : "0.375rem", backgroundColor: i === activeIdx ? "#0ea5e9" : "#cbd5e1" }}
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

const STAT_ACCENTS = [
  { gradient: "from-amber-500 to-orange-500", glow: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
  { gradient: "from-emerald-500 to-teal-500", glow: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)" },
  { gradient: "from-sky-500 to-cyan-500", glow: "rgba(14,165,233,0.08)", border: "rgba(14,165,233,0.2)" },
  { gradient: "from-violet-500 to-purple-500", glow: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.2)" },
];

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity({ limit: 8 });
  const apiBase = useApiBase();
  const kbStats = useKBStats(apiBase);

  if (statsLoading || activityLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-2 border-sky-200" />
          <div className="w-14 h-14 rounded-full border-2 border-sky-500 border-t-transparent animate-spin absolute inset-0" />
          <div className="w-6 h-6 rounded-full bg-sky-500/20 absolute inset-4 animate-pulse" />
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Active Cases", value: stats?.openCases || 0, icon: AlertCircle, iconColor: "text-amber-500" },
    { label: "Resolved", value: stats?.resolvedCases || 0, icon: CheckCircle2, iconColor: "text-emerald-500" },
    { label: "Avg Resolution", value: stats?.avgResolutionTime ? `${Math.round(stats.avgResolutionTime / 60)}` : "0", suffix: "h", icon: Clock, iconColor: "text-sky-500" },
    { label: "Total Handled", value: stats?.totalCases || 0, icon: Activity, iconColor: "text-violet-500" },
  ];

  return (
    <div className="space-y-6">
      <OnboardingModal />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-slate-900">Platform Overview</h1>
          <p className="text-slate-400 mt-0.5 text-sm font-medium">Real-time metrics and system health powered by Apphia.</p>
        </div>
        <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-full flex items-center gap-2 text-xs font-semibold text-slate-500 shadow-sm">
          Plan: <span className="text-gradient bg-clip-text bg-gradient-to-r from-sky-500 to-violet-500 capitalize">{stats?.subscriptionTier || 'Free'}</span>
        </div>
      </motion.div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const acc = STAT_ACCENTS[i];
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="card-3d">
              <div className="stat-card p-5" style={{ ["--card-accent" as any]: `linear-gradient(90deg, ${acc.gradient.split("from-")[1]?.split(" ")[0] || "#0ea5e9"}, ${acc.gradient.split("to-")[1]?.split(" ")[0] || "#8b5cf6"})` }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                    <p className="text-3xl font-extrabold text-slate-900 mt-1.5 tracking-tight">
                      <AnimatedCounter value={stat.value} suffix={stat.suffix || ""} />
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${acc.glow.replace('0.08', '0.15')}, ${acc.glow.replace('0.08', '0.05')})`, border: `1px solid ${acc.border}`, boxShadow: `0 4px 12px ${acc.glow}` }}>
                    <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Main row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2">
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-500" />
                Connected Applications
              </h2>
              <Link href="/connectors" className="text-xs text-sky-500 hover:text-sky-600 font-semibold flex items-center gap-1 transition-colors">
                View All <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <IntegrationCarousel />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="glass-card p-5 h-full">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2 mb-5">
              <Shield className="w-4 h-4 text-sky-500" />
              Connector Health
            </h2>
            <div className="space-y-4">
              {[
                { label: "Healthy", count: stats?.connectorHealth.healthy || 0, color: "#10b981", track: "#dcfce7", glow: "rgba(16,185,129,0.15)" },
                { label: "Degraded", count: stats?.connectorHealth.degraded || 0, color: "#f59e0b", track: "#fef9c3", glow: "rgba(245,158,11,0.15)" },
                { label: "Down", count: stats?.connectorHealth.down || 0, color: "#ef4444", track: "#fee2e2", glow: "rgba(239,68,68,0.15)" },
              ].map((item, idx) => {
                const total = Math.max(1, (stats?.connectorHealth.healthy || 0) + (stats?.connectorHealth.degraded || 0) + (stats?.connectorHealth.down || 0));
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold text-sm shrink-0"
                      style={{ background: item.track, color: item.color, boxShadow: `0 4px 12px ${item.glow}`, border: `1px solid ${item.color}25` }}>
                      {item.count}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <p className="text-xs font-bold text-slate-600">{item.label}</p>
                        <p className="text-xs text-slate-400">{Math.round((item.count / total) * 100)}%</p>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: item.track }}>
                        <motion.div
                          className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(5, (item.count / total) * 100)}%` }}
                          transition={{ delay: 0.5 + idx * 0.1, duration: 0.9, ease: "easeOut" }}
                          style={{ background: `linear-gradient(90deg, ${item.color}cc, ${item.color})`, boxShadow: `0 0 8px ${item.glow}` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── 3D ring gauge ── */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="relative w-24 h-24 mx-auto" style={{ animation: "float-3d 4s ease-in-out infinite" }}>
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90 drop-shadow-lg">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e8f3fd" strokeWidth="3.5" />
                  <motion.circle
                    cx="18" cy="18" r="15.5" fill="none"
                    stroke="url(#gauge-grad)" strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeDasharray={`${78 * 0.85} ${78}`}
                    initial={{ strokeDasharray: "0 78" }}
                    animate={{ strokeDasharray: `${78 * 0.85} ${78}` }}
                    transition={{ delay: 0.7, duration: 1.4, ease: "easeOut" }}
                  />
                  <defs>
                    <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#0ea5e9" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-xl font-extrabold text-slate-900">85</span>
                  <span className="text-[9px] text-slate-400 font-bold -mt-0.5">SCORE</span>
                </div>
              </div>
              <p className="text-center text-xs text-slate-400 mt-2 font-semibold">Stack Health Score</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Apphia autonomy panel ── */}
      {kbStats && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <div className="prism-panel p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Brain className="w-4 h-4 text-violet-500" />
                Apphia Autonomy Engine
              </h2>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)] animate-pulse" />
                <span className="text-xs text-emerald-600 font-bold">Active</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { label: "KB Entries", value: kbStats.totalKBEntries, icon: BookOpen, from: "#0ea5e9", to: "#38bdf8" },
                { label: "Success Rate", value: `${kbStats.avgSuccessRate}%`, icon: BarChart3, from: "#10b981", to: "#34d399" },
                { label: "Auto-Healable", value: kbStats.selfHealableCount, icon: Zap, from: "#8b5cf6", to: "#a78bfa" },
                { label: "Auto-Cases", value: kbStats.monitorStats.autoCreatedCasesCount, icon: GitBranch, from: "#f59e0b", to: "#fbbf24" },
              ].map(s => (
                <div key={s.label} className="card-3d">
                  <div className="text-center p-4 rounded-2xl border border-white/80"
                    style={{ background: `linear-gradient(145deg, ${s.from}10 0%, ${s.to}06 100%)`, boxShadow: `0 4px 16px ${s.from}12, inset 0 1px 0 rgba(255,255,255,0.8)` }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2"
                      style={{ background: `linear-gradient(135deg, ${s.from}, ${s.to})`, boxShadow: `0 4px 12px ${s.from}30` }}>
                      <s.icon className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-xl font-extrabold" style={{ color: s.from }}>{s.value}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Proactive monitoring · 5-min cycles · Auto-creates cases on outage detected</span>
              <Link href="/kb" className="text-violet-500 hover:text-violet-600 font-semibold flex items-center gap-1">
                Browse KB <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Activity + Metrics ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="glass-card p-0 overflow-hidden h-[360px] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-sky-500" />
                System Activity
              </h2>
            </div>
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-3">
              {!activity?.length ? (
                <p className="text-slate-400 text-center py-8 text-sm">No recent activity.</p>
              ) : (
                activity.map((item, i) => (
                  <motion.div key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">{item.message}</p>
                      <time className="text-[10px] text-slate-400 mt-0.5 block">{format(new Date(item.timestamp), "MMM d, h:mm a")}</time>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <div className="glass-card p-5 h-[360px] flex flex-col">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              Platform Metrics
            </h2>
            <div className="space-y-2.5 flex-1">
              {[
                { label: "Active Integrations", value: `${INTEGRATIONS.filter(i => i.status === "connected").length}`, trend: "+2 this month", from: "#0ea5e9", to: "#38bdf8" },
                { label: "Automation Rate", value: "73%", trend: "+5% from last week", from: "#8b5cf6", to: "#a78bfa" },
                { label: "Avg Response", value: "142ms", trend: "-12ms improvement", from: "#10b981", to: "#34d399" },
                { label: "Security Score", value: "85/100", trend: "Good standing", from: "#f59e0b", to: "#fbbf24" },
                { label: "Monthly Savings", value: "$1,240", trend: "vs manual ops", from: "#0ea5e9", to: "#38bdf8" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-xs font-bold text-slate-700">{item.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{item.trend}</p>
                  </div>
                  <span className="text-base font-extrabold px-2.5 py-1 rounded-xl text-transparent bg-clip-text"
                    style={{ background: `linear-gradient(90deg, ${item.from}, ${item.to})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    boxShadow: `0 2px 8px ${item.from}20`, border: `1px solid ${item.from}20`, backgroundColor: "transparent", padding: "4px 10px", borderRadius: "10px" }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
