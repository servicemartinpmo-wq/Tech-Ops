import { Card, Badge, Button } from "@/components/ui";
import { motion } from "framer-motion";
import { 
  Brain, CheckCircle2, AlertTriangle, Lightbulb, DollarSign, 
  TrendingDown, ArrowRight, Layers, BarChart3, Zap
} from "lucide-react";

const stackCategories = [
  {
    name: "Finance & Accounting",
    have: [
      { name: "QuickBooks", desc: "Invoicing, payroll" },
      { name: "Stripe", desc: "Payments processing" },
    ],
    missing: [
      { name: "Expense Management", reason: "Manual expense tracking costs ~5 hrs/week for teams your size" },
    ],
    recommended: [
      { name: "Expensify or Ramp", rationale: "Automates expense reports, integrates with QuickBooks", priority: "high" },
    ],
  },
  {
    name: "Communication & Collaboration",
    have: [
      { name: "Slack", desc: "Team messaging" },
      { name: "Email Service", desc: "Transactional email" },
    ],
    missing: [
      { name: "Video Conferencing", reason: "No dedicated video platform for client calls and team standups" },
    ],
    recommended: [
      { name: "Zoom or Google Meet", rationale: "Essential for remote team collaboration", priority: "medium" },
    ],
  },
  {
    name: "DevOps & Infrastructure",
    have: [
      { name: "Cloud Infrastructure", desc: "Hosting, compute" },
      { name: "Database Systems", desc: "Data storage" },
      { name: "Monitoring Stack", desc: "System monitoring" },
    ],
    missing: [],
    recommended: [
      { name: "CI/CD Pipeline (GitHub Actions)", rationale: "Automate deployments and testing", priority: "medium" },
    ],
  },
  {
    name: "Security & Compliance",
    have: [
      { name: "Security Gateway", desc: "Auth & access control" },
      { name: "Network Services", desc: "Firewall, VPN" },
    ],
    missing: [
      { name: "SIEM / Log Aggregation", reason: "No centralized security event monitoring for audit trails" },
    ],
    recommended: [
      { name: "Datadog Security or Splunk", rationale: "Centralized log analysis and threat detection", priority: "high" },
    ],
  },
  {
    name: "CRM & Sales",
    have: [],
    missing: [
      { name: "CRM Platform", reason: "No customer relationship tracking — leads may be falling through the cracks" },
    ],
    recommended: [
      { name: "HubSpot CRM (Free Tier)", rationale: "Free to start, scales with your team, integrates with email", priority: "high" },
    ],
  },
  {
    name: "Project Management",
    have: [],
    missing: [
      { name: "Project Tracking Tool", reason: "No dedicated project management — relying on chat and email for task tracking" },
    ],
    recommended: [
      { name: "Linear or Asana", rationale: "Structured task management with team visibility", priority: "medium" },
    ],
  },
];

const redundancies = [
  { apps: ["Monitoring Stack", "Cloud Infrastructure"], overlap: "Both include basic monitoring features", estimatedWaste: "$45/mo" },
];

const costBreakdown = [
  { category: "Finance & Accounting", current: 180, benchmark: 150 },
  { category: "Communication", current: 95, benchmark: 80 },
  { category: "DevOps & Infrastructure", current: 420, benchmark: 380 },
  { category: "Security & Compliance", current: 150, benchmark: 120 },
];

export default function StackIntelligence() {
  const stackScore = 72;
  const totalSpend = costBreakdown.reduce((s, c) => s + c.current, 0);
  const benchmarkSpend = costBreakdown.reduce((s, c) => s + c.benchmark, 0);
  const circumference = 2 * Math.PI * 58;
  const offset = circumference - (stackScore / 100) * circumference;
  const scoreColor = stackScore >= 80 ? "#00ff88" : stackScore >= 50 ? "#ffb800" : "#ff3355";

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-display font-bold text-white text-glow flex items-center gap-3">
          <Brain className="w-8 h-8 text-purple-400" />
          Stack Intelligence
        </h1>
        <p className="text-slate-500 mt-1">Strategic advisor for your tech stack — coverage, gaps, and optimization.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-6 flex flex-col items-center h-full">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">Stack Health Score</h3>
            <div className="relative" style={{ width: 140, height: 140 }}>
              <svg viewBox="0 0 130 130" className="w-full h-full -rotate-90">
                <circle cx="65" cy="65" r="58" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
                <motion.circle
                  cx="65" cy="65" r="58" fill="none"
                  stroke={scoreColor}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeLinecap="round"
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: offset }}
                  transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                  style={{ filter: `drop-shadow(0 0 8px ${scoreColor}60)` }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-white font-display">{stackScore}</span>
                <span className="text-xs text-slate-500">/ 100</span>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-center">
              <p className="text-sm text-amber-400">3 gaps identified</p>
              <p className="text-sm text-emerald-400">8 apps connected</p>
              <p className="text-sm text-cyan-400">1 redundancy found</p>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="p-6 h-full">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Cost Efficiency
            </h3>
            <div className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-3xl font-bold text-white font-display">${totalSpend}<span className="text-lg text-slate-500">/mo</span></p>
                <p className="text-xs text-slate-500 mt-1">vs benchmark ${benchmarkSpend}/mo</p>
              </div>
              {costBreakdown.map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">{item.category}</span>
                    <span className={item.current > item.benchmark ? "text-amber-400" : "text-emerald-400"}>
                      ${item.current}/mo
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${item.current > item.benchmark ? "bg-amber-500" : "bg-emerald-500"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.current / 500) * 100}%` }}
                      transition={{ delay: 0.5 + i * 0.1, duration: 0.6 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="p-6 h-full">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-400" />
              Redundancy Detection
            </h3>
            {redundancies.length === 0 ? (
              <div className="text-center py-8 text-slate-600">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-400/50" />
                <p>No redundancies detected</p>
              </div>
            ) : (
              <div className="space-y-3">
                {redundancies.map((r, i) => (
                  <div key={i} className="p-3 rounded-lg border border-amber-500/10 bg-amber-500/5">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-medium text-amber-400">Potential Overlap</span>
                    </div>
                    <p className="text-sm text-slate-300">{r.apps.join(" & ")}</p>
                    <p className="text-xs text-slate-500 mt-1">{r.overlap}</p>
                    <p className="text-xs text-amber-400 font-semibold mt-2">Est. wasted: {r.estimatedWaste}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 p-3 rounded-lg hud-element">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Consolidation Savings</p>
              <p className="text-lg font-bold text-cyan-400 font-display">
                ${totalSpend - benchmarkSpend}<span className="text-sm text-slate-500">/mo possible</span>
              </p>
            </div>
          </Card>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <h2 className="text-xl font-display font-bold text-white mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          Gap Analysis by Category
        </h2>
        <div className="space-y-4">
          {stackCategories.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.05 }}
            >
              <Card className="p-5">
                <h3 className="font-bold text-white text-lg mb-3">{cat.name}</h3>
                <div className="space-y-3">
                  {cat.have.length > 0 && (
                    <div className="space-y-1.5">
                      {cat.have.map((app, j) => (
                        <div key={j} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-slate-300">{app.name}</span>
                          <span className="text-slate-600">— {app.desc}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {cat.missing.length > 0 && (
                    <div className="space-y-1.5">
                      {cat.missing.map((item, j) => (
                        <div key={j} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-amber-400 font-medium">Missing: {item.name}</span>
                            <p className="text-slate-500 text-xs mt-0.5">{item.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {cat.recommended.length > 0 && (
                    <div className="space-y-1.5 mt-2 pt-2 border-t border-white/[0.04]">
                      {cat.recommended.map((rec, j) => (
                        <div key={j} className="flex items-start gap-2 text-sm">
                          <Lightbulb className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-cyan-400 font-medium">{rec.name}</span>
                              <Badge variant={rec.priority === "high" ? "error" : "warning"} className="text-[10px]">
                                {rec.priority}
                              </Badge>
                            </div>
                            <p className="text-slate-500 text-xs mt-0.5">{rec.rationale}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
