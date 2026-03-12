import { useState } from "react";
import { Card, Badge, Button, Input } from "@/components/ui";
import { motion } from "framer-motion";
import {
  BarChart3, DollarSign, Clock, Zap, TrendingUp, Users, Calendar,
  CheckCircle2, AlertTriangle, Plus, FileText, Target, Activity
} from "lucide-react";

function AnimatedValue({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  return <span>{prefix}{value.toLocaleString()}{suffix}</span>;
}

const kpis = [
  { label: "Monthly Tech Spend", value: "$4,280", trend: "-3.2%", trendUp: false, icon: DollarSign, color: "text-emerald-400" },
  { label: "Active Integrations", value: "6", trend: "+2", trendUp: true, icon: Activity, color: "text-cyan-400" },
  { label: "Automation Rate", value: "73%", trend: "+5%", trendUp: true, icon: Zap, color: "text-purple-400" },
  { label: "MTTR", value: "2.4h", trend: "-0.8h", trendUp: false, icon: Clock, color: "text-amber-400" },
  { label: "Efficiency Score", value: "82", trend: "+7", trendUp: true, icon: Target, color: "text-cyan-400" },
];

const spendByCategory = [
  { category: "DevOps & Infrastructure", amount: 1850, percent: 43 },
  { category: "Security & Compliance", amount: 920, percent: 22 },
  { category: "Communication", amount: 680, percent: 16 },
  { category: "Finance & Accounting", amount: 480, percent: 11 },
  { category: "Other Tools", amount: 350, percent: 8 },
];

const efficiencyMetrics = [
  { label: "Hours Saved by Automation", value: "124 hrs", period: "this month" },
  { label: "Issues Auto-Resolved", value: "47", period: "vs 12 escalated" },
  { label: "Downtime Prevented", value: "3 incidents", period: "via predictive alerts" },
  { label: "Cost Avoided", value: "$1,240", period: "redundancy detection" },
];

const playbooks = [
  { title: "New Employee Onboarding", description: "Provision accounts across Slack, email, cloud, and security systems", steps: 8, status: "active" },
  { title: "Quarterly Security Audit", description: "Run vulnerability scans, review permissions, check compliance", steps: 12, status: "active" },
  { title: "Annual License Renewal", description: "Track and renew all software licenses before expiry", steps: 6, status: "upcoming" },
  { title: "Incident Response Protocol", description: "Step-by-step guide for handling system outages", steps: 10, status: "active" },
];

const vendors = [
  { name: "Cloud Provider", renewalDate: "2026-06-15", tier: "Enterprise", monthlySpend: 850, licensesUsed: 8, licensesTotal: 10 },
  { name: "Slack", renewalDate: "2026-04-01", tier: "Business+", monthlySpend: 320, licensesUsed: 14, licensesTotal: 20 },
  { name: "QuickBooks", renewalDate: "2026-09-30", tier: "Plus", monthlySpend: 85, licensesUsed: 3, licensesTotal: 5 },
  { name: "Security Gateway", renewalDate: "2026-05-20", tier: "Pro", monthlySpend: 150, licensesUsed: 5, licensesTotal: 5 },
];

export default function PMOOps() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "spending" | "efficiency" | "playbooks" | "vendors" | "resources">("dashboard");

  const tabs = [
    { id: "dashboard", label: "Operations Dashboard" },
    { id: "spending", label: "Spending Tracker" },
    { id: "efficiency", label: "Efficiency Metrics" },
    { id: "playbooks", label: "Playbooks" },
    { id: "vendors", label: "Vendor Management" },
    { id: "resources", label: "Resource Allocation" },
  ] as const;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-display font-bold text-white text-glow flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-cyan-400" />
          PMO-Ops Command Center
        </h1>
        <p className="text-slate-500 mt-1">Operational intelligence — spending, efficiency, and resource management.</p>
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

      {activeTab === "dashboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {kpis.map((kpi, i) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Card className="p-4 hud-element">
                  <div className="flex items-center gap-2 mb-2">
                    <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                    <span className="text-xs text-slate-500 font-medium">{kpi.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-white font-display">{kpi.value}</p>
                  <p className={`text-xs mt-1 ${kpi.trendUp ? "text-emerald-400" : "text-cyan-400"}`}>
                    {kpi.trend} from last period
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-bold text-white mb-4">ROI Calculator</h3>
              <div className="space-y-4 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <div className="text-center">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">This Month, Tech-Ops Saved You</p>
                  <p className="text-4xl font-bold text-emerald-400 font-display">$3,840</p>
                  <p className="text-sm text-slate-400 mt-1">124 hours + $1,240 in cost avoidance</p>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-emerald-500/10">
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">47</p>
                    <p className="text-xs text-slate-500">Auto-resolved</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">3</p>
                    <p className="text-xs text-slate-500">Outages prevented</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">8.2x</p>
                    <p className="text-xs text-slate-500">ROI</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-bold text-white mb-4">Spend by Category</h3>
              <div className="space-y-3">
                {spendByCategory.map((item, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">{item.category}</span>
                      <span className="text-white font-medium">${item.amount}</span>
                    </div>
                    <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percent}%` }}
                        transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "spending" && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Monthly Spending Tracker</h3>
              <div className="flex gap-2">
                {["Monthly", "Quarterly", "Yearly"].map(period => (
                  <button key={period} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/[0.03] text-slate-400 border border-white/[0.06] hover:border-cyan-500/20">
                    {period}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-48 flex items-end gap-2">
              {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month, i) => {
                const height = 40 + Math.random() * 50;
                const budget = 65;
                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col items-center relative" style={{ height: "160px" }}>
                      <motion.div
                        className={`w-full rounded-t ${height > budget ? "bg-amber-500/60" : "bg-cyan-500/60"}`}
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ delay: i * 0.05, duration: 0.4 }}
                        style={{ position: "absolute", bottom: 0 }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-600">{month}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/[0.04]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-cyan-500/60" />
                <span className="text-xs text-slate-500">Under Budget</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-amber-500/60" />
                <span className="text-xs text-slate-500">Over Budget</span>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {spendByCategory.map((cat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-300">{cat.category}</span>
                    <span className="text-lg font-bold text-white">${cat.amount}<span className="text-xs text-slate-500">/mo</span></span>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "efficiency" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {efficiencyMetrics.map((metric, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Card className="p-6 hud-element">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{metric.label}</p>
                  <p className="text-3xl font-bold text-white font-display">{metric.value}</p>
                  <p className="text-sm text-slate-500 mt-1">{metric.period}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "playbooks" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Operational Playbooks</h3>
            <Button variant="secondary" className="gap-2">
              <Plus className="w-4 h-4" />
              Create Playbook
            </Button>
          </div>
          {playbooks.map((pb, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{pb.title}</h4>
                    <p className="text-sm text-slate-500">{pb.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-500">{pb.steps} steps</span>
                  <Badge variant={pb.status === "active" ? "success" : "warning"}>{pb.status}</Badge>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {activeTab === "vendors" && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">Vendor Management</h3>
          {vendors.map((vendor, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-white">{vendor.name}</h4>
                    <Badge variant="default" className="mt-1">{vendor.tier}</Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">${vendor.monthlySpend}<span className="text-xs text-slate-500">/mo</span></p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Renewal Date</span>
                    <p className="text-slate-300 font-medium">{vendor.renewalDate}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">License Utilization</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${vendor.licensesUsed / vendor.licensesTotal > 0.8 ? "bg-amber-500" : "bg-emerald-500"}`}
                          style={{ width: `${(vendor.licensesUsed / vendor.licensesTotal) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400">{vendor.licensesUsed}/{vendor.licensesTotal}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {activeTab === "resources" && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            Resource Allocation
          </h3>
          <div className="space-y-4">
            {[
              { user: "Admin Team (3)", apps: ["Cloud", "Slack", "QuickBooks", "Security", "Email", "Monitoring"], idle: 0 },
              { user: "Dev Team (5)", apps: ["Cloud", "Slack", "Monitoring", "Security"], idle: 1 },
              { user: "Finance (2)", apps: ["QuickBooks", "Slack", "Email"], idle: 0 },
              { user: "Marketing (2)", apps: ["Slack", "Email"], idle: 2 },
            ].map((team, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="p-4 rounded-lg border border-white/[0.04]"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{team.user}</span>
                  {team.idle > 0 && (
                    <Badge variant="warning">{team.idle} idle license{team.idle > 1 ? "s" : ""}</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {team.apps.map(app => (
                    <span key={app} className="px-2 py-1 rounded text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/10">
                      {app}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 mt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-amber-400 font-medium">3 of your 20 Slack licenses haven't been used in 30 days</span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
