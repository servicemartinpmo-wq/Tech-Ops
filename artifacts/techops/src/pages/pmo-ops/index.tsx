import { motion } from "framer-motion";
import {
  BarChart3, Clock, Target, CheckCircle2, ArrowRight, ExternalLink,
  Star, Zap, Shield, Users, TrendingUp, Calendar, Award, Headphones
} from "lucide-react";
import { Link } from "wouter";

const features = [
  {
    icon: BarChart3,
    title: "Project Performance Reports",
    desc: "Real-time dashboards showing ticket volume, resolution rates, and team performance across your entire operation.",
    color: "text-blue-600", bg: "bg-blue-50",
  },
  {
    icon: Clock,
    title: "SLA Tracking",
    desc: "Automatic monitoring of response and resolution deadlines. Get alerted before anything slips through the cracks.",
    color: "text-violet-600", bg: "bg-violet-50",
  },
  {
    icon: Target,
    title: "Goal & Milestone Tracking",
    desc: "Set targets for your support operation and watch progress in real time. Monthly and quarterly reporting included.",
    color: "text-emerald-600", bg: "bg-emerald-50",
  },
  {
    icon: Users,
    title: "Team Capacity Planning",
    desc: "Understand workloads before they become bottlenecks. Plan staffing based on actual ticket trends.",
    color: "text-amber-600", bg: "bg-amber-50",
  },
  {
    icon: TrendingUp,
    title: "Trend Analysis",
    desc: "Spot recurring issues across your client base before they become expensive problems. Powered by the Apphia engine.",
    color: "text-rose-600", bg: "bg-rose-50",
  },
  {
    icon: Calendar,
    title: "Scheduled Reporting",
    desc: "Automated weekly and monthly reports delivered straight to your inbox — fully branded and ready to share.",
    color: "text-indigo-600", bg: "bg-indigo-50",
  },
];

const steps = [
  { step: "1", label: "Sign up for PMO-Ops", desc: "Create your dedicated PMO-Ops account at pmo-ops.techopspmo.com" },
  { step: "2", label: "Connect to Tech-Ops", desc: "Use your API key to link both platforms in the Connected Tools section" },
  { step: "3", label: "Go live", desc: "Data starts flowing immediately — your first report is ready within 24 hours" },
];

const BASE = import.meta.env.BASE_URL?.replace(/\/+$/, "") || "";

export default function PMOOps() {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-50 to-transparent rounded-bl-full pointer-events-none" />
        <div className="relative z-10 flex items-start gap-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200 shrink-0">
            <img src={`${BASE}/images/logo-pmo-ops.png`} alt="PMO-Ops" className="w-12 h-12 rounded-xl object-cover" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-slate-900">PMO-Ops</h1>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Star className="w-2.5 h-2.5" /> Recommended
              </span>
            </div>
            <p className="text-slate-500 text-sm mb-4 leading-relaxed max-w-xl">
              PMO-Ops is a separate, optional service built specifically for teams who want project management office-level oversight of their tech support operation. It connects directly to your Tech-Ops account.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <a
                href="https://pmo-ops.techopspmo.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm hover:from-blue-500 hover:to-indigo-500 transition-all shadow-md shadow-blue-200"
              >
                <ExternalLink className="w-4 h-4" />
                Visit PMO-Ops
                <ArrowRight className="w-4 h-4" />
              </a>
              <span className="text-sm text-slate-400">Separate subscription · Starting at $49/mo</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* What it does */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">What PMO-Ops adds to your workflow</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center mb-3`}>
                <f.icon className={`w-5 h-5 ${f.color}`} />
              </div>
              <h3 className="font-semibold text-slate-800 text-sm mb-1.5">{f.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* How to connect */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-5">How to connect PMO-Ops to Tech-Ops</h2>
        <div className="space-y-4">
          {steps.map((s, i) => (
            <div key={s.step} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-sm font-bold flex items-center justify-center shrink-0 shadow-sm">
                {s.step}
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">{s.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="absolute left-7 mt-8 w-0.5 h-6 bg-slate-200" />
              )}
            </div>
          ))}
        </div>
        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-slate-600 font-medium">Once connected, data syncs automatically every 15 minutes</span>
          </div>
          <Link href="/connectors" className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
            Go to Connected Tools <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Badges */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Zap, label: "Quick Setup", desc: "Under 5 minutes" },
          { icon: Shield, label: "Secure Sync", desc: "API key encrypted" },
          { icon: Award, label: "Built for Teams", desc: "1–100+ users" },
        ].map(b => (
          <div key={b.label} className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm">
            <b.icon className="w-5 h-5 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">{b.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{b.desc}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-7 text-center shadow-lg shadow-blue-200/50">
        <Headphones className="w-8 h-8 text-blue-200 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-2">Ready to level up your operation?</h3>
        <p className="text-blue-200 text-sm mb-5 max-w-md mx-auto">
          PMO-Ops turns your Tech-Ops data into a management system your whole team can run from.
        </p>
        <a
          href="https://pmo-ops.techopspmo.com/signup"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-blue-700 font-bold text-sm hover:bg-blue-50 transition-colors shadow-sm"
        >
          <ExternalLink className="w-4 h-4" />
          Get Started with PMO-Ops
        </a>
        <p className="text-blue-300 text-xs mt-3">Free 14-day trial · No credit card required</p>
      </div>
    </div>
  );
}
