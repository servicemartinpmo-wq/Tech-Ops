import { useGetDashboardStats, useGetRecentActivity } from "@workspace/api-client-react";
import { Card } from "@/components/ui";
import { Activity, AlertCircle, CheckCircle2, Clock, Server, Zap, Shield, Brain, TrendingUp, ArrowUpRight, BookOpen, GitBranch, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useState, useEffect } from "react";
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

function RelationshipMap() {
  const apps = [
    { id: "email", label: "Email", x: 50, y: 30, status: "healthy" },
    { id: "cloud", label: "Cloud", x: 250, y: 50, status: "healthy" },
    { id: "database", label: "Database", x: 150, y: 140, status: "healthy" },
    { id: "network", label: "Network", x: 350, y: 130, status: "degraded" },
    { id: "security", label: "Security", x: 80, y: 220, status: "healthy" },
    { id: "monitoring", label: "Monitor", x: 300, y: 230, status: "healthy" },
  ];

  const connections = [
    { from: "email", to: "cloud" },
    { from: "cloud", to: "database" },
    { from: "database", to: "security" },
    { from: "network", to: "cloud" },
    { from: "monitoring", to: "network" },
    { from: "monitoring", to: "database" },
    { from: "security", to: "monitoring" },
  ];

  const getApp = (id: string) => apps.find(a => a.id === id)!;
  const statusColor = (s: string) => s === "healthy" ? "#00ff88" : s === "degraded" ? "#ffb800" : "#ff3355";

  return (
    <svg viewBox="0 0 420 280" className="w-full h-full">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {connections.map((conn, i) => {
        const from = getApp(conn.from);
        const to = getApp(conn.to);
        return (
          <g key={i}>
            <line
              x1={from.x + 30} y1={from.y + 15}
              x2={to.x + 30} y2={to.y + 15}
              stroke="rgba(0,240,255,0.15)"
              strokeWidth="1"
            />
            <circle r="2" fill="#00f0ff" opacity="0.6" filter="url(#glow)">
              <animateMotion
                dur={`${2 + i * 0.5}s`}
                repeatCount="indefinite"
                path={`M${from.x + 30},${from.y + 15} L${to.x + 30},${to.y + 15}`}
              />
            </circle>
          </g>
        );
      })}

      {apps.map(app => (
        <g key={app.id}>
          <rect
            x={app.x} y={app.y} width="60" height="30" rx="8"
            fill="rgba(22,22,31,0.9)"
            stroke="rgba(0,240,255,0.2)"
            strokeWidth="1"
          />
          <text x={app.x + 30} y={app.y + 18} textAnchor="middle" fill="#e2e8f0" fontSize="9" fontFamily="Plus Jakarta Sans">{app.label}</text>
          <circle cx={app.x + 52} cy={app.y + 8} r="3" fill={statusColor(app.status)} filter="url(#glow)" />
        </g>
      ))}
    </svg>
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
        <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(0,240,255,0.3)]"></div>
      </div>
    );
  }

  const statCards = [
    { label: "Active Cases", value: stats?.openCases || 0, icon: AlertCircle, glowColor: "rgba(255,184,0,0.3)", iconColor: "text-amber-400" },
    { label: "Resolved", value: stats?.resolvedCases || 0, icon: CheckCircle2, glowColor: "rgba(0,255,136,0.3)", iconColor: "text-emerald-400" },
    { label: "Avg Resolution", value: stats?.avgResolutionTime ? `${Math.round(stats.avgResolutionTime / 60)}` : "0", suffix: "h", icon: Clock, glowColor: "rgba(0,240,255,0.3)", iconColor: "text-cyan-400" },
    { label: "Total Handled", value: stats?.totalCases || 0, icon: Activity, glowColor: "rgba(168,85,247,0.3)", iconColor: "text-purple-400" },
  ];

  return (
    <div className="space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-end"
      >
        <div>
          <h1 className="text-3xl font-display font-bold text-white text-glow">Platform Overview</h1>
          <p className="text-slate-500 mt-1">Real-time metrics and system health powered by Apphia.</p>
        </div>
        <div className="px-4 py-2 glass-card rounded-full flex items-center gap-2 text-sm font-medium text-slate-400">
          Plan: <span className="text-cyan-400 font-bold capitalize">{stats?.subscriptionTier || 'Free'}</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            key={stat.label}
          >
            <Card className="p-6 hud-element">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-3xl font-display font-bold text-white mt-2">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix || ""} />
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-white/[0.03] flex items-center justify-center border border-white/[0.06]`} style={{ boxShadow: `0 0 20px ${stat.glowColor}` }}>
                  <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
                <Server className="w-5 h-5 text-cyan-400" />
                App Relationship Map
              </h2>
              <Link href="/connectors" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1">
                View All <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="h-[280px]">
              <RelationshipMap />
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6 h-full">
            <h2 className="text-lg font-display font-bold text-white flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-cyan-400" />
              Connector Health
            </h2>
            <div className="space-y-4">
              {[
                { label: "Healthy", count: stats?.connectorHealth.healthy || 0, color: "#00ff88" },
                { label: "Degraded", count: stats?.connectorHealth.degraded || 0, color: "#ffb800" },
                { label: "Down", count: stats?.connectorHealth.down || 0, color: "#ff3355" },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-[3px] flex items-center justify-center" style={{ borderColor: `${item.color}30` }}>
                    <span className="text-lg font-bold" style={{ color: item.color }}>{item.count}</span>
                  </div>
                  <span className="text-sm text-slate-400">{item.label}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-white/[0.04]">
              <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" />
                Stack Health
              </h3>
              <div className="relative w-20 h-20 mx-auto">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#00f0ff" strokeWidth="3"
                    strokeDasharray={`${78 * 0.01 * 85} ${78}`}
                    strokeLinecap="round"
                    filter="url(#glow-gauge)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-white">85</span>
                </div>
              </div>
              <p className="text-center text-xs text-slate-500 mt-2">Stack Score</p>
            </div>
          </Card>
        </motion.div>
      </div>

      {kbStats && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Card className="p-6 border-purple-500/20 bg-purple-500/[0.02]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                Apphia Autonomy Engine
              </h2>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                <span className="text-xs text-emerald-400">Active</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              {[
                { label: "KB Entries", value: kbStats.totalKBEntries, icon: BookOpen, color: "#00f0ff" },
                { label: "KB Success Rate", value: `${kbStats.avgSuccessRate}%`, icon: BarChart3, color: "#00ff88" },
                { label: "Auto-Healable", value: kbStats.selfHealableCount, icon: Zap, color: "#a855f7" },
                { label: "Auto-Created Cases", value: kbStats.monitorStats.autoCreatedCasesCount, icon: GitBranch, color: "#f59e0b" },
              ].map(s => (
                <div key={s.label} className="text-center p-3 rounded-xl border border-white/[0.05] bg-white/[0.02]">
                  <s.icon className="w-4 h-4 mx-auto mb-1.5" style={{ color: s.color }} />
                  <p className="text-xl font-bold font-display" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "Monitored Connectors", value: kbStats.monitorStats.monitoredConnectors, color: "text-slate-400" },
                { label: "Currently Down", value: kbStats.monitorStats.activeDownConnectors, color: kbStats.monitorStats.activeDownConnectors > 0 ? "text-red-400" : "text-emerald-400" },
                { label: "Technology Domains", value: kbStats.domains, color: "text-slate-400" },
              ].map(s => (
                <div key={s.label} className="p-3 rounded-lg border border-white/[0.04] bg-white/[0.02] text-center">
                  <p className={`text-xl font-bold font-display ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-600">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Proactive monitoring active · 5-min cycles · Auto-creates cases on outage</span>
              <Link href="/kb" className="text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1">
                Browse KB <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-0 overflow-hidden h-[400px] flex flex-col">
            <div className="p-5 border-b border-white/[0.04]">
              <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                System Activity
              </h2>
            </div>
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
              {!activity?.length ? (
                <p className="text-slate-500 text-center py-8">No recent activity.</p>
              ) : (
                <div className="space-y-4">
                  {activity.map((item, i) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={item.id} 
                      className="flex items-start gap-3"
                    >
                      <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2 shrink-0 shadow-[0_0_6px_rgba(0,240,255,0.5)]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-300 leading-relaxed">{item.message}</p>
                        <time className="text-xs text-slate-600 mt-0.5 block">
                          {format(new Date(item.timestamp), "MMM d, h:mm a")}
                        </time>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="p-6 h-[400px] flex flex-col">
            <h2 className="text-lg font-display font-bold text-white flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Quick Stats
            </h2>
            <div className="space-y-4 flex-1">
              {[
                { label: "Active Integrations", value: "6", trend: "+2 this month", color: "text-cyan-400" },
                { label: "Automation Rate", value: "73%", trend: "+5% from last week", color: "text-purple-400" },
                { label: "Avg Response Time", value: "142ms", trend: "-12ms improvement", color: "text-emerald-400" },
                { label: "Security Score", value: "85/100", trend: "Good standing", color: "text-amber-400" },
                { label: "Monthly Savings", value: "$1,240", trend: "vs manual ops", color: "text-cyan-400" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-0">
                  <div>
                    <p className="text-sm text-slate-400">{item.label}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{item.trend}</p>
                  </div>
                  <span className={`text-lg font-bold font-display ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
