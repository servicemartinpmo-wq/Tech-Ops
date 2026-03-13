import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Card, Button, Badge } from "@/components/ui";
import {
  BarChart3, DollarSign, Clock, Zap, TrendingUp, Users, Calendar,
  CheckCircle2, AlertTriangle, Plus, FileText, Target, Activity,
  Layers, ArrowRight, Star, Briefcase, Cpu, Shield, Globe, Rocket,
  BarChart2, GitMerge, LineChart, ArrowUpRight, ChevronRight
} from "lucide-react";

const efficiencyData = [
  { date: "Mar 1", saved: 18, cost: 420, cases: 8 },
  { date: "Mar 3", saved: 24, cost: 380, cases: 11 },
  { date: "Mar 5", saved: 31, cost: 340, cases: 14 },
  { date: "Mar 7", saved: 29, cost: 290, cases: 12 },
  { date: "Mar 9", saved: 42, cost: 260, cases: 19 },
  { date: "Mar 11", saved: 38, cost: 220, cases: 17 },
  { date: "Mar 12", saved: 47, cost: 200, cases: 21 },
];

const spendByCategory = [
  { category: "DevOps & Infrastructure", amount: 1850, percent: 43, color: "#0ea5e9" },
  { category: "Security & Compliance", amount: 920, percent: 22, color: "#8b5cf6" },
  { category: "Communication Tools", amount: 680, percent: 16, color: "#10b981" },
  { category: "Finance & Accounting", amount: 480, percent: 11, color: "#f59e0b" },
  { category: "Other", amount: 350, percent: 8, color: "#94a3b8" },
];

const vendors = [
  { name: "Cloud Provider", renewal: "Jun 15, 2026", tier: "Enterprise", monthly: 850, used: 8, total: 10, logo: "amazonaws", color: "#FF9900" },
  { name: "Slack", renewal: "Apr 1, 2026", tier: "Business+", monthly: 320, used: 14, total: 20, logo: "slack", color: "#4A154B" },
  { name: "QuickBooks", renewal: "Sep 30, 2026", tier: "Plus", monthly: 85, used: 3, total: 5, logo: "quickbooks", color: "#2CA01C" },
  { name: "Security Gateway", renewal: "May 20, 2026", tier: "Pro", monthly: 150, used: 5, total: 5, logo: "cloudflare", color: "#F38020" },
];

const integrationBenefits = [
  {
    icon: Cpu,
    title: "Autonomous Diagnosis",
    description: "Apphia handles Tier-1 and Tier-2 issues automatically, routing only complex problems to your team.",
    stat: "73%", statLabel: "auto-resolution rate"
  },
  {
    icon: Shield,
    title: "Unified Security Posture",
    description: "Single-pane visibility across all vendor security configurations, certificate expirations, and access logs.",
    stat: "100%", statLabel: "compliance coverage"
  },
  {
    icon: LineChart,
    title: "Spend Intelligence",
    description: "Detect redundant licenses, flag unused subscriptions, and benchmark spend vs. industry averages.",
    stat: "$1,240", statLabel: "saved this month"
  },
  {
    icon: Zap,
    title: "Workflow Automation",
    description: "Connect PMO playbooks directly to your tech stack — onboard employees, audit systems, renew licenses automatically.",
    stat: "124h", statLabel: "hours saved"
  },
];

const playbooks = [
  { title: "New Employee Onboarding", description: "Provision accounts across Slack, email, cloud, and security", steps: 8, status: "active", runs: 12 },
  { title: "Quarterly Security Audit", description: "Run scans, review permissions, confirm compliance posture", steps: 12, status: "active", runs: 4 },
  { title: "Annual License Renewal", description: "Track and renew all software licenses before expiry", steps: 6, status: "upcoming", runs: 1 },
  { title: "Incident Response Protocol", description: "Step-by-step guide for system outages and data incidents", steps: 10, status: "active", runs: 7 },
];

function AppLogo({ slug, color }: { slug: string; color: string }) {
  const [err, setErr] = useState(false);
  const initials = slug.slice(0, 2).toUpperCase();
  if (err) return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
      style={{ background: `linear-gradient(135deg, ${color}, ${color}aa)` }}>{initials}</div>
  );
  return (
    <img src={`https://cdn.simpleicons.org/${slug}/${color.replace("#", "")}`} alt={slug} className="w-7 h-7 object-contain"
      onError={() => setErr(true)} />
  );
}

export default function PMOOps() {
  const [activeTab, setActiveTab] = useState<"platform" | "efficiency" | "spending" | "playbooks" | "vendors">("platform");

  const tabs = [
    { id: "platform", label: "Platform Overview", icon: Rocket },
    { id: "efficiency", label: "Efficiency Log", icon: BarChart3 },
    { id: "spending", label: "Spend Tracker", icon: DollarSign },
    { id: "playbooks", label: "Playbooks", icon: FileText },
    { id: "vendors", label: "Vendors", icon: Layers },
  ] as const;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-violet-500 flex items-center justify-center shadow-lg shadow-sky-500/20"
            style={{ animation: "float-3d 4s ease-in-out infinite" }}>
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">PMO-Ops Command Center</h1>
            <p className="text-slate-400 text-sm font-medium">Operational intelligence — where tech and project management converge.</p>
          </div>
        </div>
      </motion.div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-md shadow-sky-500/20"
                : "text-slate-500 hover:text-slate-700 bg-white border border-slate-200 hover:border-slate-300 shadow-sm"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ──────────────────── PLATFORM OVERVIEW (promotional) ──── */}
      {activeTab === "platform" && (
        <div className="space-y-6">
          {/* Hero promo block */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="prism-panel overflow-hidden">
              <div className="relative p-8" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)" }}>
                <div className="absolute inset-0 showroom-grid opacity-20" />
                <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-20 blur-3xl"
                  style={{ background: "radial-gradient(circle, #8b5cf6, transparent)" }} />
                <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full opacity-15 blur-3xl"
                  style={{ background: "radial-gradient(circle, #0ea5e9, transparent)" }} />
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs text-white/80 font-semibold mb-4">
                      <Star className="w-3 h-3 text-amber-400" />
                      Tech-Ops × Martin PMO — Combined
                    </div>
                    <h2 className="text-3xl font-extrabold text-white mb-3 leading-tight">
                      When your tools talk,<br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-violet-400">operations accelerate.</span>
                    </h2>
                    <p className="text-white/70 text-sm leading-relaxed mb-6 font-medium">
                      Tech-Ops by Martin PMO bridges your project management workflows with autonomous technology operations. The result: fewer escalations, faster resolution, and full-stack visibility — all from one platform.
                    </p>
                    <div className="flex gap-3">
                      <Link href="/billing">
                        <Button className="bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white font-bold shadow-lg shadow-sky-500/30 gap-2">
                          <Rocket className="w-4 h-4" />
                          Upgrade Your Plan
                        </Button>
                      </Link>
                      <Link href="/connectors">
                        <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 gap-2 font-semibold">
                          <Globe className="w-4 h-4" />
                          Connect Apps
                        </Button>
                      </Link>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Hours Saved", value: "124", unit: "hrs/mo", color: "#0ea5e9", icon: Clock },
                      { label: "Auto-Resolved", value: "47", unit: "issues", color: "#10b981", icon: CheckCircle2 },
                      { label: "ROI", value: "8.2×", unit: "return", color: "#8b5cf6", icon: TrendingUp },
                      { label: "Cost Saved", value: "$3.8K", unit: "this month", color: "#f59e0b", icon: DollarSign },
                    ].map((m, i) => (
                      <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.08 }}>
                        <div className="p-4 rounded-2xl border text-center card-3d"
                          style={{ background: `${m.color}18`, borderColor: `${m.color}35`, boxShadow: `0 4px 16px ${m.color}15` }}>
                          <m.icon className="w-5 h-5 mx-auto mb-2" style={{ color: m.color }} />
                          <p className="text-2xl font-extrabold text-white">{m.value}</p>
                          <p className="text-xs font-semibold" style={{ color: `${m.color}cc` }}>{m.unit}</p>
                          <p className="text-[10px] text-white/40 mt-0.5">{m.label}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Benefits grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {integrationBenefits.map((b, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.08 }} className="card-3d">
                <div className="glass-card p-5 h-full">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/20">
                      <b.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-extrabold text-slate-900 mb-1">{b.title}</h3>
                      <p className="text-sm text-slate-500 leading-relaxed font-medium">{b.description}</p>
                      <div className="flex items-baseline gap-1.5 mt-3">
                        <span className="text-2xl font-extrabold text-gradient bg-gradient-to-r from-sky-500 to-violet-500 bg-clip-text text-transparent">{b.stat}</span>
                        <span className="text-xs text-slate-400 font-semibold">{b.statLabel}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* How it works flow */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <div className="glass-card p-6">
              <h3 className="text-lg font-extrabold text-slate-900 mb-6 text-center">How It Works Together</h3>
              <div className="flex flex-col md:flex-row items-center gap-3 justify-between">
                {[
                  { icon: Briefcase, label: "PMO Workflow", desc: "Projects, playbooks, resource plans", color: "#0ea5e9" },
                  { icon: GitMerge, label: "Apphia Connects", desc: "Maps workflows to your tech stack", color: "#8b5cf6" },
                  { icon: Zap, label: "Auto-Execute", desc: "Runs tasks without manual input", color: "#10b981" },
                  { icon: BarChart2, label: "Measure & Improve", desc: "Full ROI and efficiency reporting", color: "#f59e0b" },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3 flex-1">
                    <div className="flex flex-col items-center gap-2 flex-1">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center card-3d"
                        style={{ background: `linear-gradient(145deg, ${step.color}18, ${step.color}08)`, border: `1px solid ${step.color}30`, boxShadow: `0 6px 20px ${step.color}15` }}>
                        <step.icon className="w-6 h-6" style={{ color: step.color }} />
                      </div>
                      <p className="text-xs font-extrabold text-slate-800 text-center">{step.label}</p>
                      <p className="text-[10px] text-slate-400 text-center font-medium">{step.desc}</p>
                    </div>
                    {i < 3 && <ChevronRight className="w-5 h-5 text-slate-300 shrink-0 hidden md:block" />}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ──────────────────── EFFICIENCY LOG ──── */}
      {activeTab === "efficiency" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Hours Saved", value: "124 hrs", period: "this month", icon: Clock, color: "#0ea5e9" },
              { label: "Issues Auto-Resolved", value: "47", period: "vs 12 escalated", icon: Zap, color: "#10b981" },
              { label: "Outages Prevented", value: "3 incidents", period: "via predictive alerts", icon: Shield, color: "#8b5cf6" },
              { label: "Cost Avoided", value: "$1,240", period: "redundancy detection", icon: DollarSign, color: "#f59e0b" },
            ].map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="card-3d">
                <div className="stat-card p-5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: `${m.color}15`, border: `1px solid ${m.color}25`, boxShadow: `0 4px 12px ${m.color}15` }}>
                    <m.icon className="w-4.5 h-4.5" style={{ color: m.color }} />
                  </div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">{m.label}</p>
                  <p className="text-2xl font-extrabold text-slate-900">{m.value}</p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">{m.period}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bar chart — hours saved trend */}
          <div className="glass-card p-5">
            <h3 className="font-extrabold text-slate-900 mb-1">Hours Saved — Daily Trend</h3>
            <p className="text-xs text-slate-400 font-medium mb-5">Automation hours recovered per day vs. manual cost estimate</p>
            <div className="flex items-end gap-2 h-40">
              {efficiencyData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[9px] text-slate-400 font-bold">{d.saved}h</span>
                  <motion.div
                    className="w-full rounded-t-lg relative overflow-hidden"
                    initial={{ height: 0 }}
                    animate={{ height: `${(d.saved / 50) * 100}%` }}
                    transition={{ delay: 0.3 + i * 0.07, duration: 0.6, ease: "easeOut" }}
                    style={{ background: "linear-gradient(180deg, #0ea5e9 0%, #8b5cf6 100%)", boxShadow: "0 -4px 12px rgba(14,165,233,0.3)" }}
                  >
                    <div className="absolute inset-0 opacity-30" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)" }} />
                  </motion.div>
                  <span className="text-[9px] text-slate-400 font-medium">{d.date.split(" ")[1]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Log table */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900">Efficiency Event Log</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {[
                { time: "Today 11:42 AM", event: "Auto-resolved Stripe webhook timeout", saving: "2.5h", type: "auto" },
                { time: "Today 9:17 AM", event: "Cloudflare certificate renewed automatically", saving: "1h", type: "auto" },
                { time: "Yesterday 4:30 PM", event: "Idle Slack license detected (Marketing team)", saving: "$320/mo", type: "cost" },
                { time: "Yesterday 2:15 PM", event: "New employee onboarding playbook executed (8 steps)", saving: "3h", type: "playbook" },
                { time: "Mar 10 3:00 PM", event: "AWS S3 permission misconfiguration caught before outage", saving: "~4h", type: "prevention" },
                { time: "Mar 9 10:00 AM", event: "Batch diagnostic run — 12 cases resolved", saving: "6h", type: "auto" },
                { time: "Mar 8 8:00 AM", event: "Quarterly security audit playbook completed", saving: "5h", type: "playbook" },
              ].map((row, i) => {
                const typeConfig = {
                  auto: { label: "Auto-Resolved", color: "text-sky-600", bg: "bg-sky-50", border: "border-sky-100" },
                  cost: { label: "Cost Saving", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
                  playbook: { label: "Playbook", color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" },
                  prevention: { label: "Prevention", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
                }[row.type];
                return (
                  <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${typeConfig?.color} ${typeConfig?.bg} ${typeConfig?.border}`}>{typeConfig?.label}</span>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{row.event}</p>
                        <p className="text-xs text-slate-400 font-medium">{row.time}</p>
                      </div>
                    </div>
                    <span className="text-sm font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-xl">{row.saving}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────── SPENDING ──── */}
      {activeTab === "spending" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="glass-card p-5">
              <h3 className="font-extrabold text-slate-900 mb-1">Spend by Category</h3>
              <p className="text-xs text-slate-400 font-medium mb-5">Total: <span className="font-bold text-slate-700">$4,280/mo</span></p>
              <div className="space-y-4">
                {spendByCategory.map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                        <span className="text-slate-600 font-medium">{item.category}</span>
                      </div>
                      <span className="font-extrabold text-slate-900">${item.amount}<span className="text-xs text-slate-400 font-medium">/mo</span></span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percent}%` }}
                        transition={{ delay: 0.2 + i * 0.1, duration: 0.7, ease: "easeOut" }}
                        style={{ background: `linear-gradient(90deg, ${item.color}cc, ${item.color})`, boxShadow: `0 0 8px ${item.color}40` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-5">
              <h3 className="font-extrabold text-slate-900 mb-5">Monthly Trend</h3>
              <div className="h-48 flex items-end gap-2">
                {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month, i) => {
                  const h = 35 + (i < 3 ? i * 10 : i < 7 ? 60 - i * 2 : 45 + (i - 7) * 3);
                  const overBudget = h > 62;
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full relative" style={{ height: "160px" }}>
                        <motion.div
                          className="w-full rounded-t-lg absolute bottom-0 overflow-hidden"
                          initial={{ height: 0 }}
                          animate={{ height: `${h}%` }}
                          transition={{ delay: i * 0.04, duration: 0.5, ease: "easeOut" }}
                          style={{ background: overBudget ? "linear-gradient(180deg, #f59e0b, #ef4444)" : "linear-gradient(180deg, #0ea5e9, #8b5cf6)" }}
                        >
                          <div className="absolute inset-0 opacity-20" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)" }} />
                        </motion.div>
                      </div>
                      <span className="text-[9px] text-slate-400 font-semibold">{month[0]}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-4 pt-4 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-r from-sky-500 to-violet-500" /><span className="text-slate-500 font-medium">Under budget</span></div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-r from-amber-500 to-red-500" /><span className="text-slate-500 font-medium">Over budget</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────── PLAYBOOKS ──── */}
      {activeTab === "playbooks" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-slate-900">Operational Playbooks</h3>
            <Button className="gap-2 bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-sm">
              <Plus className="w-4 h-4" /> Create Playbook
            </Button>
          </div>
          {playbooks.map((pb, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="card-3d">
              <div className="glass-card p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-100 border border-sky-200 flex items-center justify-center shadow-sm">
                    <FileText className="w-5 h-5 text-sky-600" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900">{pb.title}</h4>
                    <p className="text-sm text-slate-500 font-medium">{pb.description}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{pb.runs} runs · {pb.steps} steps</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={pb.status === "active" ? "success" : "warning"}>{pb.status}</Badge>
                  <Button variant="outline" size="sm" className="gap-1 text-xs border-sky-200 text-sky-600 hover:bg-sky-50">
                    Run <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ──────────────────── VENDORS ──── */}
      {activeTab === "vendors" && (
        <div className="space-y-4">
          <h3 className="text-lg font-extrabold text-slate-900">Vendor Management</h3>
          {vendors.map((v, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="card-3d">
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm"
                      style={{ background: `${v.color}12`, borderColor: `${v.color}25` }}>
                      <AppLogo slug={v.logo} color={v.color} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900">{v.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="default">{v.tier}</Badge>
                        <span className="text-[10px] text-slate-400 font-medium">Renews {v.renewal}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-extrabold text-slate-900">${v.monthly}<span className="text-xs text-slate-400 font-medium">/mo</span></p>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-500 font-medium">License Utilization</span>
                    <span className="font-bold text-slate-700">{v.used}/{v.total}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(v.used / v.total) * 100}%` }}
                      transition={{ delay: 0.3 + i * 0.1, duration: 0.7, ease: "easeOut" }}
                      style={{ background: v.used / v.total > 0.8 ? "linear-gradient(90deg, #f59e0b, #ef4444)" : "linear-gradient(90deg, #0ea5e9, #10b981)", boxShadow: "0 0 8px rgba(14,165,233,0.3)" }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
