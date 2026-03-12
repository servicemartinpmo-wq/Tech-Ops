import { useState } from "react";
import { Card, Badge, Button } from "@/components/ui";
import { motion } from "framer-motion";
import { 
  ShieldCheck, ShieldAlert, Lock, Eye, AlertTriangle, CheckCircle2, 
  XCircle, Clock, Users, Key, Activity, TrendingUp, RefreshCw, Cpu
} from "lucide-react";

function RadialGauge({ score, size = 140 }: { score: number; size?: number }) {
  const color = score >= 80 ? "#00ff88" : score >= 50 ? "#ffb800" : "#ff3355";
  const circumference = 2 * Math.PI * 58;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 130 130" className="w-full h-full -rotate-90">
        <circle cx="65" cy="65" r="58" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
        <motion.circle
          cx="65" cy="65" r="58" fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeLinecap="round"
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

const vulnerabilities = [
  { id: 1, title: "API Token Expiring Soon", app: "Cloud Infrastructure", severity: "high", description: "OAuth token expires in 7 days. Renew to prevent service interruption.", remediation: "Navigate to Cloud settings and regenerate the API token." },
  { id: 2, title: "Deprecated API Version", app: "Email Service", severity: "medium", description: "Using API v2 which is deprecated. Migration to v3 recommended.", remediation: "Update email integration SDK to latest version and migrate endpoints." },
  { id: 3, title: "Missing Rate Limiting", app: "Network Services", severity: "medium", description: "No rate limiting configured on public-facing webhook endpoints.", remediation: "Configure rate limiting rules in the network service dashboard." },
  { id: 4, title: "Overly Broad OAuth Scopes", app: "Monitoring Stack", severity: "low", description: "Monitoring integration has write access that isn't utilized.", remediation: "Review and reduce OAuth scopes to read-only access." },
];

const privacyChecks = [
  { label: "Data encryption at rest", status: "pass" },
  { label: "HTTPS on all endpoints", status: "pass" },
  { label: "PII field masking", status: "warn", note: "2 fields exposed in logs" },
  { label: "API permission boundaries", status: "pass" },
  { label: "Data retention policy", status: "warn", note: "No policy defined" },
  { label: "Cross-app data sharing audit", status: "pass" },
  { label: "Webhook endpoint security", status: "fail", note: "1 HTTP-only webhook" },
  { label: "Session token rotation", status: "pass" },
];

const auditLog = [
  { user: "admin@techops.io", action: "Modified automation rule", app: "Automation Center", time: "2 min ago", type: "write" },
  { user: "dev@techops.io", action: "Accessed API keys", app: "Security Gateway", time: "15 min ago", type: "read" },
  { user: "admin@techops.io", action: "Updated connector config", app: "Cloud Infrastructure", time: "1 hr ago", type: "write" },
  { user: "bot@apphia.io", action: "Ran security scan", app: "All Systems", time: "2 hrs ago", type: "system" },
  { user: "dev@techops.io", action: "Viewed diagnostic case", app: "Diagnostic Cases", time: "3 hrs ago", type: "read" },
];

const permissionMatrix = [
  { user: "Admin User", apps: { email: "admin", cloud: "admin", database: "admin", network: "admin", security: "admin", monitoring: "admin" } },
  { user: "Dev User", apps: { email: "read", cloud: "write", database: "write", network: "read", security: "read", monitoring: "read" } },
  { user: "Apphia Bot", apps: { email: "read", cloud: "read", database: "read", network: "read", security: "write", monitoring: "write" } },
];

export default function Security() {
  const [activeTab, setActiveTab] = useState<"overview" | "vulnerabilities" | "privacy" | "audit" | "permissions">("overview");
  const securityScore = 78;

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "vulnerabilities", label: "Vulnerabilities" },
    { id: "privacy", label: "Privacy Compliance" },
    { id: "audit", label: "Access Audit" },
    { id: "permissions", label: "Permissions" },
  ] as const;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-white text-glow flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-cyan-400" />
              Security & Privacy Command Center
            </h1>
            <p className="text-slate-500 mt-1">Continuous monitoring and threat detection across your tech stack.</p>
          </div>
          <Button variant="secondary" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Run Full Scan
          </Button>
        </div>
      </motion.div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] border border-transparent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-6 flex flex-col items-center">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">Security Score</h3>
              <RadialGauge score={securityScore} />
              <p className="mt-4 text-sm text-amber-400 font-medium">Good — 3 items need attention</p>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2">
            <Card className="p-6 h-full">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Threat Detection Alerts</h3>
              <div className="space-y-3">
                {[
                  { title: "Unusual login location detected", severity: "warning", time: "5 min ago" },
                  { title: "Bulk data export request", severity: "info", time: "2 hrs ago" },
                  { title: "Failed auth attempts (3x)", severity: "error", time: "4 hrs ago" },
                ].map((alert, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${
                    alert.severity === "error" ? "border-red-500/20 bg-red-500/5" :
                    alert.severity === "warning" ? "border-amber-500/20 bg-amber-500/5" :
                    "border-cyan-500/20 bg-cyan-500/5"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {alert.severity === "error" ? <XCircle className="w-4 h-4 text-red-400" /> :
                         alert.severity === "warning" ? <AlertTriangle className="w-4 h-4 text-amber-400" /> :
                         <Activity className="w-4 h-4 text-cyan-400" />}
                        <span className="text-sm font-medium text-slate-300">{alert.title}</span>
                      </div>
                      <span className="text-xs text-slate-600">{alert.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-3">
            <Card className="p-6">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                Security Trend (30 days)
              </h3>
              <div className="h-32 flex items-end gap-1">
                {Array.from({ length: 30 }, (_, i) => {
                  const h = 40 + Math.sin(i * 0.3) * 20 + Math.random() * 20;
                  const color = h > 70 ? "bg-emerald-500/60" : h > 50 ? "bg-amber-500/60" : "bg-red-500/60";
                  return (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ delay: i * 0.02, duration: 0.4 }}
                      className={`flex-1 rounded-t ${color}`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-600">
                <span>30 days ago</span>
                <span>Today</span>
              </div>
            </Card>
          </motion.div>
        </div>
      )}

      {activeTab === "vulnerabilities" && (
        <div className="space-y-4">
          {vulnerabilities.map((vuln, i) => (
            <motion.div
              key={vuln.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className={`w-5 h-5 ${
                      vuln.severity === "high" ? "text-red-400" :
                      vuln.severity === "medium" ? "text-amber-400" : "text-blue-400"
                    }`} />
                    <div>
                      <h3 className="font-bold text-white">{vuln.title}</h3>
                      <span className="text-xs text-slate-500">{vuln.app}</span>
                    </div>
                  </div>
                  <Badge variant={vuln.severity === "high" ? "error" : vuln.severity === "medium" ? "warning" : "default"}>
                    {vuln.severity.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm text-slate-400 mb-3">{vuln.description}</p>
                <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-semibold">Remediation</p>
                  <p className="text-sm text-cyan-400">{vuln.remediation}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {activeTab === "privacy" && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-white mb-4">Privacy Compliance Scanner</h3>
          <div className="space-y-3">
            {privacyChecks.map((check, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center justify-between p-3 rounded-lg border border-white/[0.04] hover:border-white/[0.08] transition-colors"
              >
                <div className="flex items-center gap-3">
                  {check.status === "pass" ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> :
                   check.status === "warn" ? <AlertTriangle className="w-5 h-5 text-amber-400" /> :
                   <XCircle className="w-5 h-5 text-red-400" />}
                  <span className="text-sm text-slate-300">{check.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {check.note && <span className="text-xs text-slate-500">{check.note}</span>}
                  <Badge variant={check.status === "pass" ? "success" : check.status === "warn" ? "warning" : "error"}>
                    {check.status.toUpperCase()}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === "audit" && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            Access Audit Log
          </h3>
          <div className="space-y-3">
            {auditLog.map((entry, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 p-3 rounded-lg border border-white/[0.04]"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  entry.type === "write" ? "bg-amber-500/10" : entry.type === "system" ? "bg-cyan-500/10" : "bg-white/5"
                }`}>
                  {entry.type === "write" ? <Key className="w-4 h-4 text-amber-400" /> :
                   entry.type === "system" ? <Cpu className="w-4 h-4 text-cyan-400" /> :
                   <Eye className="w-4 h-4 text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300">{entry.action}</p>
                  <p className="text-xs text-slate-500">{entry.user} • {entry.app}</p>
                </div>
                <span className="text-xs text-slate-600 shrink-0">{entry.time}</span>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === "permissions" && (
        <Card className="p-6 overflow-x-auto">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            Permission Matrix
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-3 px-2 text-slate-500 font-medium">User</th>
                {["Email", "Cloud", "Database", "Network", "Security", "Monitoring"].map(h => (
                  <th key={h} className="text-center py-3 px-2 text-slate-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissionMatrix.map((row, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="border-b border-white/[0.03]"
                >
                  <td className="py-3 px-2 text-slate-300 font-medium">{row.user}</td>
                  {Object.values(row.apps).map((level, j) => (
                    <td key={j} className="text-center py-3 px-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        level === "admin" ? "bg-red-500/10 text-red-400" :
                        level === "write" ? "bg-amber-500/10 text-amber-400" :
                        "bg-emerald-500/10 text-emerald-400"
                      }`}>
                        {level}
                      </span>
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
