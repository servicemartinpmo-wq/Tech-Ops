import { useAuth } from "@workspace/replit-auth-web";
import { Redirect } from "wouter";
import { Button } from "@/components/ui";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Sparkles, Zap, Shield, Brain, Activity, Cpu, BookOpen } from "lucide-react";
import { useRef, useState } from "react";

const BASE = import.meta.env.BASE_URL;

const features = [
  {
    image: `${BASE}images/feature-diagnostic.png`,
    title: "Apphia Diagnostic Engine",
    subtitle: "7-Stage Probabilistic Root Cause Analysis",
    description: "Apphia analyzes your entire infrastructure in seconds — not hours. It extracts typed signals, traverses dependency graphs, and ranks root causes with Bayesian confidence scoring. A senior systems engineer that never sleeps.",
    bullets: ["Automatic signal extraction from logs and metrics", "Dependency-aware root cause ranking", "Self-assessed resolution with confidence gating"],
    accent: "#0ea5e9",
    lightAccent: "#e0f2fe",
  },
  {
    image: `${BASE}images/feature-security.png`,
    title: "Security & Privacy Command Center",
    subtitle: "Continuous Threat Detection & Compliance",
    description: "Stop reacting to breaches — start preventing them. Real-time compliance posture scoring, API token rotation alerts, PII exposure detection, and a full permission matrix visualization across every integration.",
    bullets: ["Vulnerability scanning with prioritized remediation", "Real-time access audit trail", "Permission matrix and role-based governance"],
    accent: "#8b5cf6",
    lightAccent: "#ede9fe",
  },
  {
    image: `${BASE}images/feature-intelligence.png`,
    title: "Stack Intelligence",
    subtitle: "Strategic Gap Analysis & Cost Optimization",
    description: "Your tech stack is either working for you or against you. Stack Intelligence maps every tool, identifies productivity gaps, detects redundant subscriptions, and benchmarks your spend against industry standards.",
    bullets: ["Category gap identification with recommendations", "Redundancy detection with waste calculations", "Cost benchmarking against comparable organizations"],
    accent: "#7c3aed",
    lightAccent: "#f5f3ff",
  },
  {
    image: `${BASE}images/feature-automation.png`,
    title: "Automation Center",
    subtitle: "Natural Language Rules with Governance Controls",
    description: "Define automation in plain English — Apphia translates it to technical action items. High CPU triggers service restarts, failed health checks page engineers, critical cases launch diagnostics. Every rule governed by approval workflows.",
    bullets: ["Natural language to technical automation translation", "Event-driven triggers with configurable responses", "Complete execution history and audit compliance"],
    accent: "#059669",
    lightAccent: "#d1fae5",
  },
  {
    image: `${BASE}images/feature-connectors.png`,
    title: "Connector Health Monitoring",
    subtitle: "Real-Time Infrastructure Relationship Mapping",
    description: "See your entire infrastructure as a living system. Every integration, dependency, data flow — mapped and measured in real time. See blast radius, affected services, and the historical health patterns that predicted the issue.",
    bullets: ["Live uptime and response time per connector", "Visual dependency mapping with data flows", "Historical health trends with degradation detection"],
    accent: "#2563eb",
    lightAccent: "#dbeafe",
  },
  {
    image: `${BASE}images/feature-remote.png`,
    title: "Remote Assistance",
    subtitle: "Secure Screen Share with Granular Permissions",
    description: "WebRTC-powered screen sharing with military-grade permission controls. Choose from observer to full access — every action is logged in a tamper-proof audit trail. Session tokens are temporary, timeouts enforced.",
    bullets: ["4 permission presets from observer to full access", "Per-capability toggle controls", "Complete session logging with user attribution"],
    accent: "#d97706",
    lightAccent: "#fef3c7",
  },
];

const pricingPlans = [
  {
    name: "Foundation",
    price: 149,
    tagline: "Freelancers & solo operators",
    mspNote: "vs. $100–$150/user MSP basic",
    color: "#0ea5e9",
    features: [
      "1 concurrent support ticket slot",
      "Apphia help desk — on-demand diagnostics & triage",
      "Remote monitoring & anomaly detection",
      "Automated low-risk fixes & preventive alerts",
      "Plain-language explanations & incident reports",
      "Email escalation support (1–24 hr response)",
    ],
    cta: "Start Free Trial",
  },
  {
    name: "Proactive",
    price: 349,
    tagline: "Small teams of 2–15 users",
    mspNote: "vs. $150–$225/user MSP standard",
    color: "#7c3aed",
    popular: true,
    features: [
      "2 concurrent support ticket slots",
      "Everything in Foundation",
      "Advanced cybersecurity monitoring & threat response",
      "Cloud management (Google Workspace, AWS, Azure)",
      "Automated backup verification & integrity checks",
      "Slack, Zapier & full integration suite",
      "Priority email support (1–8 hr response)",
    ],
    cta: "Start Free Trial",
  },
  {
    name: "Compliance",
    price: 749,
    tagline: "SMBs of 15–75 users",
    mspNote: "vs. $250–$350+/user MSP compliance",
    color: "#059669",
    features: [
      "5 concurrent support ticket slots",
      "Everything in Proactive",
      "HIPAA / FINRA compliance auditing & reporting",
      "High-risk action approvals with full audit trail",
      "24/7 continuous monitoring & escalation",
      "Full connector & API lifecycle management",
      "Personalized Apphia Engine configuration",
    ],
    cta: "Start Free Trial",
  },
  {
    name: "Enterprise",
    price: null,
    tagline: "Large organizations, 75+ users",
    color: "#1e293b",
    features: [
      "Unlimited concurrent ticket slots",
      "Private Apphia Engine license",
      "Custom compliance frameworks (SOC 2, ISO 27001)",
      "Dedicated account & integration engineering",
      "Custom workflows, connectors & playbooks",
      "SLA-backed support with < 1 hr response",
      "Optional on-call accelerated response",
    ],
    cta: "Contact Sales",
  },
];

function LightHero({ onLogin }: { onLogin: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ target: containerRef });
  const y = useTransform(scrollY, [0, 600], [0, 80]);

  return (
    <div ref={containerRef} className="relative min-h-screen overflow-hidden bg-white">
      <motion.div className="absolute inset-0 pointer-events-none" style={{ y }}>
        <div className="absolute -top-32 -right-32 w-[700px] h-[700px] rounded-full opacity-[0.12]"
          style={{ background: "radial-gradient(ellipse, #0ea5e9 0%, transparent 70%)", filter: "blur(60px)", animation: "aurora 20s ease-in-out infinite" }} />
        <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] rounded-full opacity-[0.09]"
          style={{ background: "radial-gradient(ellipse, #7c3aed 0%, transparent 70%)", filter: "blur(70px)", animation: "aurora2 25s ease-in-out infinite" }} />
        <div className="absolute -bottom-20 right-1/4 w-[400px] h-[400px] rounded-full opacity-[0.08]"
          style={{ background: "radial-gradient(ellipse, #059669 0%, transparent 70%)", filter: "blur(60px)" }} />
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: "linear-gradient(rgba(14,165,233,1) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      </motion.div>

      <nav className="relative z-20 px-8 py-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img src={`${BASE}images/logo-pmo-ops.png`} alt="PMO-Ops" className="w-11 h-11 object-contain rounded-xl shadow-sm" />
          <span className="font-display font-bold text-xl text-slate-900 tracking-tight">Tech-Ops <span className="text-sm font-medium text-slate-400">by Martin PMO</span></span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#features" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors hidden md:block">Features</a>
          <a href="#pricing" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors hidden md:block">Pricing</a>
          <Button onClick={onLogin} className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm px-5">
            Get Started
          </Button>
        </div>
      </nav>

      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-24 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-sky-50 border border-sky-100 text-sm font-medium text-sky-700 mb-10"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
            </span>
            7-Day Free Trial — No Credit Card Required
          </motion.div>

          <h1 className="font-display text-6xl md:text-8xl font-black text-slate-900 leading-[0.95] tracking-tight mb-8">
            Support,<br />
            <span className="bg-gradient-to-r from-sky-500 via-violet-500 to-indigo-600 bg-clip-text text-transparent">
              Engineered.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed font-light">
            The autonomous operations platform that diagnoses issues before they become outages, monitors every integration in your stack, and gives your team the intelligence to move at machine speed.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={onLogin}
              size="lg"
              className="h-14 px-10 text-base group rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-[0_4px_24px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.2)] transition-all duration-300"
            >
              Enter the Platform
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <a
              href="#pricing"
              className="h-14 px-8 flex items-center text-slate-600 hover:text-slate-900 border border-slate-200 rounded-full text-sm font-medium hover:bg-slate-50 transition-all shadow-sm"
            >
              View Pricing
            </a>
          </div>

          <div className="mt-16 flex items-center justify-center gap-8 text-sm text-slate-400">
            {["7-day free trial", "No credit card required", "Cancel anytime"].map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                {t}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function StatsBar() {
  const stats = [
    { value: "7-Stage", label: "Diagnostic Pipeline" },
    { value: "< 30s", label: "Root Cause Analysis" },
    { value: "24/7", label: "Continuous Monitoring" },
    { value: "100%", label: "Audit Trail Coverage" },
    { value: "1,000+", label: "KB Resolution Entries" },
    { value: "4-Tier", label: "Permission Control" },
  ];

  return (
    <div className="relative z-10 border-y border-slate-100 bg-slate-50 overflow-hidden">
      <div className="flex animate-[ticker_30s_linear_infinite] whitespace-nowrap py-5">
        {[...stats, ...stats].map((stat, i) => (
          <div key={i} className="flex items-center gap-3 px-10 shrink-0">
            <span className="font-display font-black text-2xl text-slate-900">{stat.value}</span>
            <span className="text-slate-400 text-sm">{stat.label}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-sky-300 ml-5" />
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureCarousel() {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);

  const go = (next: number) => {
    const idx = (next + features.length) % features.length;
    setDirection(next > active ? 1 : -1);
    setActive(idx);
  };

  const f = features[active];

  return (
    <section id="features" className="relative z-10 pt-28 pb-24 px-4 bg-white">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16 max-w-3xl mx-auto"
      >
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-sky-500 mb-4">Platform Capabilities</p>
        <h2 className="font-display text-4xl md:text-6xl font-black text-slate-900 mb-4 leading-tight">
          Everything your team needs.<br />Nothing it doesn't.
        </h2>
        <p className="text-slate-500 max-w-2xl mx-auto">Six deeply integrated modules, one unified platform.</p>
      </motion.div>

      <div className="max-w-6xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden border border-slate-100 shadow-2xl shadow-slate-100/80 bg-white">
          <div className="absolute inset-0 opacity-40 pointer-events-none" style={{
            background: `radial-gradient(ellipse at 20% 50%, ${f.lightAccent}, transparent 60%), radial-gradient(ellipse at 80% 50%, ${f.lightAccent}, transparent 60%)`,
            transition: "background 0.5s ease"
          }} />

          <div className="relative grid md:grid-cols-2 gap-0 min-h-[520px]">
            <div className="flex flex-col justify-center p-10 md:p-16">
              <motion.div key={active} initial={{ opacity: 0, x: direction * 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
                <p className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: f.accent }}>{f.subtitle}</p>
                <h3 className="text-3xl md:text-4xl font-display font-black text-slate-900 mb-6 leading-tight">{f.title}</h3>
                <p className="text-slate-500 leading-relaxed mb-8 text-[15px]">{f.description}</p>
                <ul className="space-y-3">
                  {f.bullets.map((b, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-slate-700">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: f.lightAccent }}>
                        <Check className="w-3 h-3" style={{ color: f.accent }} />
                      </div>
                      {b}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>

            <div className="relative flex items-center justify-center p-10 md:p-16 border-l border-slate-100">
              <div className="absolute inset-0 opacity-50" style={{ background: `radial-gradient(circle at center, ${f.lightAccent}, transparent 70%)` }} />
              <motion.div key={active} initial={{ opacity: 0, scale: 0.85, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="relative z-10">
                <img src={f.image} alt={f.title} className="w-64 h-64 md:w-80 md:h-80 object-contain relative z-10 drop-shadow-xl" />
              </motion.div>
            </div>
          </div>

          <div className="border-t border-slate-100 p-6 flex items-center justify-between bg-slate-50/50">
            <div className="flex gap-2">
              {features.map((_, i) => (
                <button key={i} onClick={() => go(i)}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{ width: active === i ? "2rem" : "0.75rem", backgroundColor: active === i ? f.accent : "#cbd5e1" }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => go(active - 1)} className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors bg-white">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => go(active + 1)} className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors bg-white">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlatformSection() {
  const pillars = [
    { icon: Brain, label: "Knowledge Base", value: "1,000+", desc: "Pre-loaded IT resolution entries covering networking, OS, cloud, DevOps, and security", color: "#0ea5e9" },
    { icon: Zap, label: "UDI Confidence Engine", value: "Tier 1–4", desc: "Bayesian confidence scoring with escalation logic, SLA tracking, and feedback-weighted resolution ranking", color: "#7c3aed" },
    { icon: Activity, label: "Response Time", value: "< 30s", desc: "Full 7-stage diagnostic pipeline from signal extraction to resolution synthesis", color: "#059669" },
  ];

  return (
    <section id="platform" className="relative z-10 px-4 pb-24 bg-slate-50">
      <div className="max-w-6xl mx-auto pt-24">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-500 mb-4">Engine Specifications</p>
          <h2 className="font-display text-4xl md:text-5xl font-black text-slate-900 mb-4">Built for speed. Built to scale.</h2>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-6">
          {pillars.map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <div className="p-8 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: `${item.color}15` }}>
                  <item.icon className="w-6 h-6" style={{ color: item.color }} />
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] mb-2 opacity-70" style={{ color: item.color }}>{item.label}</p>
                <p className="font-display font-black text-5xl text-slate-900 mb-3">{item.value}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection({ onLogin }: { onLogin: () => void }) {
  return (
    <section id="pricing" className="relative z-10 px-4 py-28 bg-white">
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16 max-w-3xl mx-auto">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-sky-500 mb-4">Pricing</p>
        <h2 className="font-display text-4xl md:text-5xl font-black text-slate-900 mb-4">Simple, transparent pricing</h2>
        <p className="text-slate-500 max-w-xl mx-auto">Start free for 7 days. No credit card required. Upgrade anytime.</p>
        <div className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-full text-sm font-medium text-emerald-700">
          <Check className="w-4 h-4 text-emerald-500" />
          7-Day Free Trial on all paid plans — No credit card needed
        </div>
      </motion.div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {pricingPlans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
          >
            <div className={`relative flex flex-col h-full bg-white rounded-3xl border p-7 ${plan.popular ? "border-violet-200 shadow-xl shadow-violet-100/60 ring-2 ring-violet-200/60" : "border-slate-100 shadow-sm hover:shadow-md transition-shadow"}`}>
              {plan.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-sm">
                  <Sparkles className="w-3 h-3" />
                  Most Popular
                </div>
              )}

              <div className="mb-5">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: `${plan.color}15` }}>
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: plan.color }} />
                </div>
                <h3 className="text-xl font-display font-bold text-slate-900">{plan.name}</h3>
                <p className="text-sm text-slate-400 mt-1">{plan.tagline}</p>
              </div>

              <div className="mb-6">
                {plan.price !== null ? (
                  <div className="space-y-1">
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-display font-black text-slate-900">${plan.price}</span>
                      <span className="text-slate-400 font-medium mb-1">/mo</span>
                    </div>
                    {"mspNote" in plan && plan.mspNote && (
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{plan.mspNote}</p>
                    )}
                  </div>
                ) : (
                  <div className="text-4xl font-display font-black text-slate-900">Custom</div>
                )}
              </div>

              <ul className="space-y-2.5 flex-1 mb-7">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: plan.color }} />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                onClick={onLogin}
                className={`w-full rounded-xl font-semibold ${plan.popular ? "text-white shadow-sm" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                style={plan.popular ? { backgroundColor: plan.color } : {}}
                variant={plan.popular ? "primary" : "outline"}
              >
                {plan.cta}
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-10 text-center text-sm text-slate-400">
        Email support included on all plans · 1–24 hr response · No human escalation by default — Apphia handles the vast majority of issues
      </div>
    </section>
  );
}

function CTASection({ onLogin }: { onLogin: () => void }) {
  return (
    <section className="relative z-10 px-4 pb-24 bg-slate-50">
      <div className="max-w-4xl mx-auto pt-24">
        <div className="relative rounded-3xl overflow-hidden bg-slate-900 p-16 text-center shadow-2xl">
          <div className="absolute inset-0 opacity-30"
            style={{ background: "radial-gradient(ellipse at 30% 50%, #0ea5e9 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, #7c3aed 0%, transparent 60%)" }} />
          <div className="relative z-10">
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-sky-400 mb-5">Get Started Today</p>
              <h2 className="font-display text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
                Ready to run tech<br />
                <span className="bg-gradient-to-r from-sky-400 to-violet-400 bg-clip-text text-transparent">like a pro?</span>
              </h2>
              <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
                Join the teams that have stopped firefighting and started engineering. Your free trial is waiting.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button onClick={onLogin} size="lg" className="h-14 px-12 text-base group rounded-full bg-sky-500 hover:bg-sky-400 text-white font-bold shadow-[0_0_40px_rgba(14,165,233,0.4)]">
                  Start Free — 7 Days
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <a href="#pricing" className="h-14 px-8 flex items-center text-white/70 hover:text-white border border-white/20 rounded-full text-sm font-medium transition-all hover:bg-white/10">
                  View Pricing
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 bg-white border-t border-slate-100 px-8 py-10">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src={`${BASE}images/logo-pmo-ops.png`} alt="PMO-Ops" className="w-8 h-8 object-contain rounded-lg" />
          <span className="font-display font-bold text-slate-900">Tech-Ops <span className="text-xs font-medium text-slate-400">by Martin PMO</span></span>
        </div>
        <p className="text-sm text-slate-400">Powered by the Apphia Engine · Support, Engineered.</p>
        <div className="flex items-center gap-6 text-sm text-slate-400">
          <a href="#features" className="hover:text-slate-700 transition-colors">Features</a>
          <a href="#pricing" className="hover:text-slate-700 transition-colors">Pricing</a>
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      <LightHero onLogin={handleLogin} />
      <StatsBar />
      <FeatureCarousel />
      <PlatformSection />
      <PricingSection onLogin={handleLogin} />
      <CTASection onLogin={handleLogin} />
      <Footer />
    </div>
  );
}
