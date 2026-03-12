import { useParams, Link } from "wouter";
import { Card, Badge, Button } from "@/components/ui";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Server, Activity, Clock, CheckCircle2, XCircle, 
  AlertTriangle, TrendingUp, Shield, DollarSign
} from "lucide-react";

const appData: Record<string, {
  name: string; status: string; uptime: number; responseTime: number;
  description: string; category: string; monthlySpend: number;
  connections: string[];
  actionItems: Array<{ action: string; scheduled: string; status: string; result?: string }>;
  healthHistory: Array<{ date: string; status: string }>;
}> = {
  email: {
    name: "Email Service", status: "healthy", uptime: 99.95, responseTime: 85,
    description: "Transactional email delivery and inbound processing",
    category: "Communication & Collaboration", monthlySpend: 45,
    connections: ["Cloud Infrastructure", "Security Gateway", "Monitoring Stack"],
    actionItems: [
      { action: "Daily digest delivery", scheduled: "9:00 AM", status: "completed", result: "1,247 emails sent" },
      { action: "Bounce report generation", scheduled: "11:00 PM", status: "completed", result: "0.2% bounce rate" },
      { action: "SPF/DKIM rotation", scheduled: "Mar 20", status: "scheduled" },
    ],
    healthHistory: [
      { date: "Mar 12", status: "healthy" }, { date: "Mar 11", status: "healthy" },
      { date: "Mar 10", status: "healthy" }, { date: "Mar 9", status: "degraded" },
      { date: "Mar 8", status: "healthy" }, { date: "Mar 7", status: "healthy" },
    ],
  },
  cloud: {
    name: "Cloud Infrastructure", status: "healthy", uptime: 99.99, responseTime: 42,
    description: "Compute, storage, and networking infrastructure",
    category: "DevOps & Infrastructure", monthlySpend: 850,
    connections: ["Database Systems", "Email Service", "Network Services", "Monitoring Stack"],
    actionItems: [
      { action: "Auto-scaling check", scheduled: "Every 5 min", status: "completed", result: "2 instances active" },
      { action: "Backup snapshot", scheduled: "2:00 AM", status: "completed", result: "42 GB backed up" },
      { action: "SSL certificate renewal", scheduled: "Apr 15", status: "scheduled" },
    ],
    healthHistory: [
      { date: "Mar 12", status: "healthy" }, { date: "Mar 11", status: "healthy" },
      { date: "Mar 10", status: "healthy" }, { date: "Mar 9", status: "healthy" },
      { date: "Mar 8", status: "healthy" }, { date: "Mar 7", status: "healthy" },
    ],
  },
  database: {
    name: "Database Systems", status: "healthy", uptime: 99.97, responseTime: 12,
    description: "PostgreSQL primary and read replicas",
    category: "DevOps & Infrastructure", monthlySpend: 320,
    connections: ["Cloud Infrastructure", "Security Gateway", "Monitoring Stack"],
    actionItems: [
      { action: "Vacuum analyze", scheduled: "3:00 AM", status: "completed", result: "12 tables optimized" },
      { action: "Replication lag check", scheduled: "Every 1 min", status: "completed", result: "0ms lag" },
      { action: "Major version upgrade", scheduled: "Apr 1", status: "scheduled" },
    ],
    healthHistory: [
      { date: "Mar 12", status: "healthy" }, { date: "Mar 11", status: "healthy" },
      { date: "Mar 10", status: "degraded" }, { date: "Mar 9", status: "healthy" },
      { date: "Mar 8", status: "healthy" }, { date: "Mar 7", status: "healthy" },
    ],
  },
  network: {
    name: "Network Services", status: "degraded", uptime: 99.8, responseTime: 156,
    description: "Firewall, VPN, and load balancing",
    category: "Security & Compliance", monthlySpend: 120,
    connections: ["Cloud Infrastructure", "Security Gateway"],
    actionItems: [
      { action: "Firewall rule audit", scheduled: "Weekly", status: "completed", result: "3 rules reviewed" },
      { action: "VPN tunnel health", scheduled: "Every 10 min", status: "attention", result: "Elevated latency detected" },
      { action: "Certificate rotation", scheduled: "Mar 25", status: "scheduled" },
    ],
    healthHistory: [
      { date: "Mar 12", status: "degraded" }, { date: "Mar 11", status: "healthy" },
      { date: "Mar 10", status: "healthy" }, { date: "Mar 9", status: "degraded" },
      { date: "Mar 8", status: "degraded" }, { date: "Mar 7", status: "healthy" },
    ],
  },
  security: {
    name: "Security Gateway", status: "healthy", uptime: 99.99, responseTime: 28,
    description: "Authentication, authorization, and threat protection",
    category: "Security & Compliance", monthlySpend: 150,
    connections: ["Cloud Infrastructure", "Database Systems", "Network Services", "Email Service"],
    actionItems: [
      { action: "Auth token cleanup", scheduled: "Daily", status: "completed", result: "145 expired tokens purged" },
      { action: "WAF rule update", scheduled: "Weekly", status: "completed", result: "Rules synced" },
      { action: "Penetration test", scheduled: "Apr 10", status: "scheduled" },
    ],
    healthHistory: [
      { date: "Mar 12", status: "healthy" }, { date: "Mar 11", status: "healthy" },
      { date: "Mar 10", status: "healthy" }, { date: "Mar 9", status: "healthy" },
      { date: "Mar 8", status: "healthy" }, { date: "Mar 7", status: "healthy" },
    ],
  },
  monitoring: {
    name: "Monitoring Stack", status: "healthy", uptime: 99.96, responseTime: 65,
    description: "Metrics, logging, and alerting infrastructure",
    category: "DevOps & Infrastructure", monthlySpend: 95,
    connections: ["Cloud Infrastructure", "Database Systems", "Network Services"],
    actionItems: [
      { action: "Alert rule evaluation", scheduled: "Every 30s", status: "completed", result: "0 alerts triggered" },
      { action: "Log rotation", scheduled: "Daily", status: "completed", result: "2.1 GB archived" },
      { action: "Dashboard refresh", scheduled: "Every 5 min", status: "completed", result: "12 dashboards updated" },
    ],
    healthHistory: [
      { date: "Mar 12", status: "healthy" }, { date: "Mar 11", status: "healthy" },
      { date: "Mar 10", status: "healthy" }, { date: "Mar 9", status: "healthy" },
      { date: "Mar 8", status: "degraded" }, { date: "Mar 7", status: "healthy" },
    ],
  },
};

export default function ConnectorDetail() {
  const { name } = useParams();
  const app = appData[name || ""];

  if (!app) {
    return (
      <div className="space-y-6">
        <Link href="/connectors" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-cyan-400 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Connectors
        </Link>
        <Card className="p-12 text-center">
          <h2 className="text-xl font-display font-bold text-white mb-2">Connector Not Found</h2>
          <p className="text-slate-500">The connector "{name}" doesn't exist or hasn't been configured yet.</p>
        </Card>
      </div>
    );
  }

  const statusColor = app.status === "healthy" ? "#00ff88" : app.status === "degraded" ? "#ffb800" : "#ff3355";
  const uptimeCirc = 2 * Math.PI * 30;
  const uptimeOffset = uptimeCirc - (app.uptime / 100) * uptimeCirc;

  return (
    <div className="space-y-6">
      <Link href="/connectors" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-cyan-400 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Connectors
      </Link>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center border border-white/[0.06]"
                style={{ boxShadow: `0 0 30px ${statusColor}20` }}>
                <Server className="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold text-white">{app.name}</h1>
                <p className="text-sm text-slate-500 mt-1">{app.description}</p>
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant={app.status === "healthy" ? "success" : "warning"}>
                    {app.status.toUpperCase()}
                  </Badge>
                  <Badge variant="default">{app.category}</Badge>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Monthly Spend</p>
              <p className="text-xl font-bold text-white font-display">${app.monthlySpend}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-6 flex flex-col items-center">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Uptime</h3>
            <div className="relative w-20 h-20">
              <svg viewBox="0 0 70 70" className="w-full h-full -rotate-90">
                <circle cx="35" cy="35" r="30" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="5" />
                <motion.circle
                  cx="35" cy="35" r="30" fill="none"
                  stroke={statusColor}
                  strokeWidth="5"
                  strokeDasharray={uptimeCirc}
                  strokeLinecap="round"
                  initial={{ strokeDashoffset: uptimeCirc }}
                  animate={{ strokeDashoffset: uptimeOffset }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  style={{ filter: `drop-shadow(0 0 6px ${statusColor}60)` }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-white">{app.uptime}%</span>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="p-6 flex flex-col items-center">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Response Time</h3>
            <p className="text-4xl font-bold text-white font-display">{app.responseTime}<span className="text-lg text-slate-500">ms</span></p>
            <p className="text-xs text-slate-500 mt-2">P50 latency</p>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="p-6">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Connections</h3>
            <div className="space-y-2">
              {app.connections.map(conn => (
                <div key={conn} className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span className="text-slate-300">{conn}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card className="p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Action Items
          </h3>
          <div className="space-y-3">
            {app.actionItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-white/[0.04] hover:border-white/[0.08] transition-colors">
                <div className="flex items-center gap-3">
                  {item.status === "completed" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> :
                   item.status === "attention" ? <AlertTriangle className="w-4 h-4 text-red-400" /> :
                   <Clock className="w-4 h-4 text-slate-500" />}
                  <div>
                    <p className="text-sm text-slate-300">{item.action}</p>
                    <p className="text-xs text-slate-600">Scheduled: {item.scheduled}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={item.status === "completed" ? "success" : item.status === "attention" ? "error" : "neutral"}>
                    {item.status}
                  </Badge>
                  {item.result && <p className="text-xs text-slate-500 mt-1">{item.result}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            Health History (7 days)
          </h3>
          <div className="flex gap-3">
            {app.healthHistory.map((day, i) => (
              <div key={i} className="flex-1 text-center">
                <div
                  className="w-full h-8 rounded-lg mb-2"
                  style={{
                    backgroundColor: day.status === "healthy" ? "rgba(0,255,136,0.15)" : "rgba(255,184,0,0.15)",
                    border: `1px solid ${day.status === "healthy" ? "rgba(0,255,136,0.2)" : "rgba(255,184,0,0.2)"}`,
                  }}
                />
                <span className="text-[10px] text-slate-600">{day.date}</span>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
