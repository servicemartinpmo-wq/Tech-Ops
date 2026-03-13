import { useAuth } from "@workspace/replit-auth-web";
import { Redirect } from "wouter";
import { Button } from "@/components/ui";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Sparkles, Zap, Shield, Brain, Activity, Cpu, BookOpen, Star, Quote, Monitor, Lock, Search, Bell } from "lucide-react";
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
    price: 75,
    tagline: "Freelancers & solo operators",
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
    price: 250,
    tagline: "Small teams of 2–15 users",
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
    price: 500,
    tagline: "SMBs of 15–75 users",
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

const TESTIMONIALS = [
  {
    name: "Sarah K.",
    role: "CTO, FinScale Ltd",
    text: "We replaced our entire MSP contract. Apphia caught a storage issue at 3am that would have taken down our payment pipeline. No human woke up — it just fixed it.",
    stars: 5,
  },
  {
    name: "Marcus T.",
    role: "Head of IT, Nexon Group",
    text: "The Stack Intelligence recommendations saved us £28k/year in redundant SaaS tools we didn't even know we were paying for. ROI in month one.",
    stars: 5,
  },
  {
    name: "Jordan L.",
    role: "DevOps Lead, Claravent",
    text: "The diagnostic pipeline is genuinely impressive. It traced a network latency spike to a misconfigured BGP route within 90 seconds. Our senior engineer was floored.",
    stars: 5,
  },
];


function SocialProofSection() {
  return (
    <section className="relative z-10 bg-white px-4 py-24">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-500 mb-3">Trusted by IT Leaders</p>
          <h2 className="font-display text-3xl md:text-4xl font-black text-slate-900">Teams that run leaner with Tech-Ops</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {TESTIMONIALS.map((t, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
              <Quote className="w-5 h-5 text-slate-300 mb-3" />
              <p className="text-sm text-slate-600 leading-relaxed mb-5">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-sky-500 flex items-center justify-center text-white text-xs font-bold">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.role}</p>
                </div>
              </div>
              <div className="flex gap-0.5 mt-3">
                {Array.from({ length: t.stars }).map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center border-t border-slate-100 pt-12">
          {[
            { stat: "93%", label: "Issues resolved automatically" },
            { stat: "< 90s", label: "Average diagnosis time" },
            { stat: "£28k", label: "Average annual savings found" },
            { stat: "99.9%", label: "Platform uptime SLA" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
              <p className="text-3xl font-black text-slate-900 font-display">{s.stat}</p>
              <p className="text-xs text-slate-400 mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

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

const PROMOS = [
  {
    badge: "24/7",
    title: "Continuous Monitoring",
    description: "Always-on health checks scan your infrastructure around the clock — catching anomalies before your users ever notice.",
    icon: Activity,
    gradient: "from-sky-500 to-cyan-400",
    bg: "bg-sky-50",
    accent: "#0ea5e9",
    pattern: "M 0 20 Q 25 0 50 20 Q 75 40 100 20",
    dots: [
      { cx: 20, cy: 30, r: 3, fill: "#bae6fd" },
      { cx: 55, cy: 15, r: 4, fill: "#7dd3fc" },
      { cx: 80, cy: 35, r: 2.5, fill: "#bae6fd" },
      { cx: 40, cy: 55, r: 3.5, fill: "#38bdf8" },
    ],
  },
  {
    badge: "< 30s",
    title: "Root Cause Analysis",
    description: "The 12-stage Apphia diagnostic pipeline traces any incident — network, memory, DNS, SSL — to its exact origin in seconds.",
    icon: Search,
    gradient: "from-violet-600 to-indigo-500",
    bg: "bg-violet-50",
    accent: "#7c3aed",
    pattern: "M 0 30 Q 30 10 60 30 Q 80 45 100 25",
    dots: [
      { cx: 15, cy: 45, r: 3, fill: "#ddd6fe" },
      { cx: 50, cy: 20, r: 4, fill: "#c4b5fd" },
      { cx: 75, cy: 40, r: 2.5, fill: "#ddd6fe" },
      { cx: 35, cy: 60, r: 3.5, fill: "#a78bfa" },
    ],
  },
  {
    badge: "100%",
    title: "Audit Trail Coverage",
    description: "Every action, every user, every timestamp — immutably logged. Compliance and forensics built into the foundation.",
    icon: Shield,
    gradient: "from-emerald-500 to-teal-400",
    bg: "bg-emerald-50",
    accent: "#10b981",
    pattern: "M 0 25 Q 20 5 50 25 Q 70 40 100 20",
    dots: [
      { cx: 25, cy: 40, r: 3, fill: "#a7f3d0" },
      { cx: 60, cy: 18, r: 4, fill: "#6ee7b7" },
      { cx: 85, cy: 38, r: 2.5, fill: "#a7f3d0" },
      { cx: 45, cy: 58, r: 3.5, fill: "#34d399" },
    ],
  },
  {
    badge: "1,000+",
    title: "Knowledge Base",
    description: "A curated library of resolution playbooks grows with every case closed — your team's institutional memory, always searchable.",
    icon: BookOpen,
    gradient: "from-amber-500 to-orange-400",
    bg: "bg-amber-50",
    accent: "#f59e0b",
    pattern: "M 0 35 Q 30 15 55 35 Q 75 50 100 30",
    dots: [
      { cx: 18, cy: 48, r: 3, fill: "#fde68a" },
      { cx: 55, cy: 22, r: 4, fill: "#fcd34d" },
      { cx: 82, cy: 42, r: 2.5, fill: "#fde68a" },
      { cx: 40, cy: 62, r: 3.5, fill: "#fbbf24" },
    ],
  },
  {
    badge: "Full",
    title: "Remote Assistance",
    description: "TeamViewer-style screen sharing, session recording, and real-time co-control — built directly into the platform.",
    icon: Monitor,
    gradient: "from-indigo-500 to-blue-500",
    bg: "bg-indigo-50",
    accent: "#6366f1",
    pattern: "M 0 28 Q 25 8 50 28 Q 75 48 100 22",
    dots: [
      { cx: 22, cy: 42, r: 3, fill: "#c7d2fe" },
      { cx: 58, cy: 16, r: 4, fill: "#a5b4fc" },
      { cx: 78, cy: 44, r: 2.5, fill: "#c7d2fe" },
      { cx: 42, cy: 60, r: 3.5, fill: "#818cf8" },
    ],
  },
  {
    badge: "4-Tier",
    title: "Permission Control",
    description: "Viewer, Support, Admin, and Creator roles give every team member exactly the access they need — no more, no less.",
    icon: Lock,
    gradient: "from-slate-600 to-slate-500",
    bg: "bg-slate-50",
    accent: "#475569",
    pattern: "M 0 22 Q 30 5 58 22 Q 78 38 100 18",
    dots: [
      { cx: 20, cy: 36, r: 3, fill: "#cbd5e1" },
      { cx: 55, cy: 14, r: 4, fill: "#94a3b8" },
      { cx: 80, cy: 36, r: 2.5, fill: "#cbd5e1" },
      { cx: 38, cy: 56, r: 3.5, fill: "#64748b" },
    ],
  },
  {
    badge: "Instant",
    title: "Alert Engine",
    description: "SLA breach detection, anomaly triggers, and escalation rules fire the moment thresholds are crossed — zero lag.",
    icon: Bell,
    gradient: "from-rose-500 to-pink-500",
    bg: "bg-rose-50",
    accent: "#f43f5e",
    pattern: "M 0 32 Q 28 12 52 32 Q 76 52 100 26",
    dots: [
      { cx: 24, cy: 46, r: 3, fill: "#fecdd3" },
      { cx: 57, cy: 20, r: 4, fill: "#fda4af" },
      { cx: 83, cy: 40, r: 2.5, fill: "#fecdd3" },
      { cx: 41, cy: 62, r: 3.5, fill: "#fb7185" },
    ],
  },
];

function PromoCarousel() {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = (next: number) => {
    const idx = (next + PROMOS.length) % PROMOS.length;
    setDirection(next > active ? 1 : -1);
    setActive(idx);
  };

  const resetTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => setActive(a => (a + 1) % PROMOS.length), 4500);
  };

  useState(() => {
    intervalRef.current = setInterval(() => setActive(a => (a + 1) % PROMOS.length), 4500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  });

  const p = PROMOS[active];
  const Icon = p.icon;

  return (
    <div className="relative z-10 border-y border-slate-100 bg-white py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl border border-slate-100 shadow-lg shadow-slate-100/80">
          <motion.div
            key={active}
            initial={{ opacity: 0, x: direction * 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className={`grid md:grid-cols-2 min-h-[320px] ${p.bg}`}
          >
            <div className={`relative flex items-center justify-center bg-gradient-to-br ${p.gradient} min-h-[200px] md:min-h-[320px] overflow-hidden`}>
              <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 80" preserveAspectRatio="none">
                <path d={p.pattern} stroke="white" strokeWidth="0.5" fill="none" />
                <path d={p.pattern.replace(/Q (\d+) (\d+) /g, (_, a, b) => `Q ${+a + 5} ${+b + 8} `)} stroke="white" strokeWidth="0.3" fill="none" opacity="0.5" />
                {p.dots.map((d, i) => <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={d.fill} opacity="0.7" />)}
              </svg>
              <div className="relative z-10 flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-xl">
                  <Icon className="w-10 h-10 text-white" />
                </div>
                <span className="font-display font-black text-4xl text-white drop-shadow">{p.badge}</span>
              </div>
            </div>

            <div className="flex flex-col justify-center p-8 md:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: p.accent }}>
                Platform Feature
              </p>
              <h3 className="font-display text-2xl md:text-3xl font-black text-slate-900 mb-4 leading-tight">
                {p.title}
              </h3>
              <p className="text-slate-500 leading-relaxed text-[15px] mb-8">
                {p.description}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { go(active - 1); resetTimer(); }}
                  className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-500" />
                </button>
                <div className="flex gap-1.5">
                  {PROMOS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => { go(i); resetTimer(); }}
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={{
                        width: i === active ? "20px" : "6px",
                        backgroundColor: i === active ? p.accent : "#cbd5e1",
                      }}
                    />
                  ))}
                </div>
                <button
                  onClick={() => { go(active + 1); resetTimer(); }}
                  className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
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
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <img src={`${BASE}images/logo-pmo-ops.png`} alt="PMO-Ops" className="w-8 h-8 object-contain rounded-lg" />
            <span className="font-display font-bold text-slate-900">Tech-Ops <span className="text-xs font-medium text-slate-400">by Martin PMO</span></span>
          </div>
          <p className="text-sm text-slate-400">Powered by the Apphia Engine · Support, Engineered.</p>
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <a href="#features" className="hover:text-slate-700 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-slate-700 transition-colors">Pricing</a>
            <a href="/status" className="hover:text-slate-700 transition-colors">Status</a>
          </div>
        </div>
        <div className="border-t border-slate-100 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-400">© 2026 Martin PMO. All rights reserved.</p>
          <div className="flex items-center gap-5 text-xs text-slate-400">
            <a href="/privacy" className="hover:text-slate-700 transition-colors">Privacy Policy</a>
            <a href="/terms" className="hover:text-slate-700 transition-colors">Terms of Service</a>
            <a href="mailto:support@techopspmo.com" className="hover:text-slate-700 transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();

  const handleLogin = () => {
    window.location.href = "/auth";
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
      <PromoCarousel />
      <SocialProofSection />
      <FeatureCarousel />
      <PlatformSection />
      <PricingSection onLogin={handleLogin} />
      <CTASection onLogin={handleLogin} />
      <Footer />
    </div>
  );
}
