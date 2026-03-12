import { useAuth } from "@workspace/replit-auth-web";
import { Redirect } from "wouter";
import { Button } from "@/components/ui";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const BASE = import.meta.env.BASE_URL;

const heroVideos = [
  "https://v.ftcdn.net/19/15/50/43/240_F_1915504335_dvzeqyHSQ1IOUmMdHc0KkANgxylZRvvc_ST.mp4",
  "https://v.ftcdn.net/19/24/42/66/240_F_1924426691_28pBjsIj3DS2JBk1nXSIK9mzDppch1Cp_ST.mp4",
];

const features = [
  {
    image: `${BASE}images/feature-diagnostic.png`,
    title: "Apphia Diagnostic Engine",
    subtitle: "7-Stage Probabilistic Root Cause Analysis",
    description: "Apphia analyzes your entire infrastructure in seconds — not hours. It extracts typed signals, traverses dependency graphs, and ranks root causes with Bayesian confidence scoring. A senior systems engineer that never sleeps.",
    bullets: ["Automatic signal extraction from logs and metrics", "Dependency-aware root cause ranking", "Self-assessed resolution with confidence gating"],
    accent: "#00f0ff",
  },
  {
    image: `${BASE}images/feature-security.png`,
    title: "Security & Privacy Command Center",
    subtitle: "Continuous Threat Detection & Compliance",
    description: "Stop reacting to breaches — start preventing them. Real-time compliance posture scoring, API token rotation alerts, PII exposure detection, and a full permission matrix visualization across every integration.",
    bullets: ["Vulnerability scanning with prioritized remediation", "Real-time access audit trail", "Permission matrix and role-based governance"],
    accent: "#ff00e5",
  },
  {
    image: `${BASE}images/feature-intelligence.png`,
    title: "Stack Intelligence",
    subtitle: "Strategic Gap Analysis & Cost Optimization",
    description: "Your tech stack is either working for you or against you. Stack Intelligence maps every tool, identifies productivity gaps, detects redundant subscriptions, and benchmarks your spend against industry standards.",
    bullets: ["Category gap identification with recommendations", "Redundancy detection with waste calculations", "Cost benchmarking against comparable organizations"],
    accent: "#a855f7",
  },
  {
    image: `${BASE}images/feature-automation.png`,
    title: "Automation Center",
    subtitle: "Natural Language Rules with Governance Controls",
    description: "Define automation in plain English — Apphia translates it to technical action items. High CPU triggers service restarts, failed health checks page engineers, critical cases launch diagnostics. Every rule governed by approval workflows.",
    bullets: ["Natural language to technical automation translation", "Event-driven triggers with configurable responses", "Complete execution history and audit compliance"],
    accent: "#00ff88",
  },
  {
    image: `${BASE}images/feature-connectors.png`,
    title: "Connector Health Monitoring",
    subtitle: "Real-Time Infrastructure Relationship Mapping",
    description: "See your entire infrastructure as a living system. Every integration, dependency, data flow — mapped and measured in real time. See blast radius, affected services, and the historical health patterns that predicted the issue.",
    bullets: ["Live uptime and response time per connector", "Visual dependency mapping with data flows", "Historical health trends with degradation detection"],
    accent: "#3b82f6",
  },
  {
    image: `${BASE}images/feature-remote.png`,
    title: "Remote Assistance",
    subtitle: "Secure Screen Share with Granular Permissions",
    description: "WebRTC-powered screen sharing with military-grade permission controls. Choose from observer to full access — every action is logged in a tamper-proof audit trail. Session tokens are temporary, timeouts enforced.",
    bullets: ["4 permission presets from observer to full access", "Per-capability toggle controls", "Complete session logging with user attribution"],
    accent: "#ffb800",
  },
];

function ShowroomHero({ onLogin }: { onLogin: () => void }) {
  const [activeVideo, setActiveVideo] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ target: containerRef });
  const y = useTransform(scrollY, [0, 600], [0, 120]);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveVideo(prev => (prev + 1) % heroVideos.length);
    }, 12000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div ref={containerRef} className="relative h-screen min-h-[700px] overflow-hidden bg-[#06080f]">
      <motion.div className="absolute inset-0" style={{ y }}>
        {heroVideos.map((src, i) => (
          <motion.video
            key={src}
            src={src}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            animate={{ opacity: activeVideo === i ? 1 : 0 }}
            transition={{ duration: 1.4, ease: "easeInOut" }}
          />
        ))}
      </motion.div>

      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-[#06080f]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#06080f]/40 via-transparent to-[#06080f]/40" />
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#06080f] to-transparent" />

      <nav className="relative z-20 px-8 py-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img src={`${BASE}images/logo-pmo-ops.png`} alt="PMO-Ops" className="w-11 h-11 object-contain rounded-lg" />
          <span className="font-display font-bold text-xl text-white tracking-tight">PMO-Ops</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#features" className="text-sm font-medium text-slate-300 hover:text-white transition-colors hidden md:block">Features</a>
          <a href="#platform" className="text-sm font-medium text-slate-300 hover:text-white transition-colors hidden md:block">Platform</a>
          <Button onClick={onLogin} variant="outline" className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm">
            Sign In
          </Button>
        </div>
      </nav>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 z-10 -mt-16">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sm font-medium text-white mb-10"
          >
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
            Powered by the Apphia Engine
          </motion.div>

          <h1 className="font-display text-6xl md:text-8xl font-black text-white leading-[0.95] tracking-tight mb-8 drop-shadow-2xl">
            Technology,<br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              engineered.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/70 mb-12 max-w-2xl mx-auto leading-relaxed font-light">
            The autonomous operations platform that diagnoses issues before they become outages, monitors every integration in your stack, and gives your team the intelligence to move at machine speed.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={onLogin}
              size="lg"
              className="h-14 px-10 text-lg group rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-[0_0_40px_rgba(0,240,255,0.3)]"
            >
              Enter the Platform
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <a
              href="#features"
              className="h-14 px-8 flex items-center text-white/80 hover:text-white border border-white/20 rounded-full text-sm font-medium backdrop-blur-sm hover:bg-white/10 transition-all"
            >
              View Features
            </a>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3 z-20">
        {heroVideos.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveVideo(i)}
            className={`h-1 rounded-full transition-all duration-500 ${activeVideo === i ? "w-8 bg-cyan-400" : "w-2 bg-white/30"}`}
          />
        ))}
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
    <div className="relative z-10 border-y border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
      <div className="flex animate-[ticker_30s_linear_infinite] whitespace-nowrap py-5">
        {[...stats, ...stats].map((stat, i) => (
          <div key={i} className="flex items-center gap-3 px-10 shrink-0">
            <span className="font-display font-black text-2xl text-white">{stat.value}</span>
            <span className="text-slate-500 text-sm">{stat.label}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/40 ml-5" />
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
    <section id="features" className="relative z-10 pt-24 pb-20 px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400 mb-4">Platform Capabilities</p>
        <h2 className="font-display text-4xl md:text-6xl font-black text-white mb-4">
          Everything your team needs.<br />Nothing it doesn't.
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto">Six deeply integrated modules, one unified platform.</p>
      </motion.div>

      <div className="max-w-6xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden border border-white/[0.08]"
          style={{ background: "linear-gradient(145deg, rgba(16,16,24,0.98) 0%, rgba(21,21,32,0.99) 100%)" }}>

          <div className="absolute inset-0 opacity-20" style={{
            background: `radial-gradient(ellipse at 20% 50%, ${f.accent}20, transparent 60%), radial-gradient(ellipse at 80% 50%, ${f.accent}10, transparent 60%)`,
            transition: "background 0.5s ease"
          }} />

          <div className="relative grid md:grid-cols-2 gap-0 min-h-[520px]">
            <div className="flex flex-col justify-center p-10 md:p-16">
              <motion.div key={active} initial={{ opacity: 0, x: direction * 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
                <p className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: f.accent }}>{f.subtitle}</p>
                <h3 className="text-3xl md:text-4xl font-display font-black text-white mb-6 leading-tight">{f.title}</h3>
                <p className="text-slate-400 leading-relaxed mb-8 text-[15px]">{f.description}</p>
                <ul className="space-y-3">
                  {f.bullets.map((b, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 border" style={{ borderColor: `${f.accent}40`, backgroundColor: `${f.accent}15` }}>
                        <Check className="w-3 h-3" style={{ color: f.accent }} />
                      </div>
                      {b}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>

            <div className="relative flex items-center justify-center p-10 md:p-16 border-l border-white/[0.04]">
              <div className="absolute inset-0 opacity-30" style={{ background: `radial-gradient(circle at center, ${f.accent}15, transparent 70%)` }} />
              <motion.div
                key={active}
                initial={{ opacity: 0, scale: 0.85, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10"
              >
                <div className="absolute inset-0 rounded-full blur-[60px] scale-75" style={{ background: `${f.accent}20` }} />
                <img
                  src={f.image}
                  alt={f.title}
                  className="w-64 h-64 md:w-80 md:h-80 object-contain relative z-10 drop-shadow-2xl"
                  style={{ filter: `drop-shadow(0 0 40px ${f.accent}30)` }}
                />
              </motion.div>
            </div>
          </div>

          <div className="border-t border-white/[0.06] p-6 flex items-center justify-between">
            <div className="flex gap-2">
              {features.map((_, i) => (
                <button
                  key={i}
                  onClick={() => go(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${active === i ? "w-8" : "w-3 bg-white/20"}`}
                  style={active === i ? { width: "2rem", backgroundColor: f.accent } : {}}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => go(active - 1)} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/30 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => go(active + 1)} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/30 transition-colors">
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
  return (
    <section id="platform" className="relative z-10 px-4 pb-24">
      <div className="max-w-6xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 rounded-3xl" />
          <div className="relative z-10 grid md:grid-cols-3 gap-px border border-white/[0.08] rounded-3xl overflow-hidden">
            {[
              {
                label: "Knowledge Base",
                value: "1,000+",
                desc: "Pre-loaded IT resolution entries covering networking, OS, cloud, DevOps, and security",
                accent: "#00f0ff",
              },
              {
                label: "UDI Confidence Engine",
                value: "Tier 1–4",
                desc: "Bayesian confidence scoring with escalation logic, SLA tracking, and feedback-weighted resolution ranking",
                accent: "#a855f7",
              },
              {
                label: "Response Time",
                value: "< 30s",
                desc: "Full 7-stage diagnostic pipeline from signal extraction to resolution synthesis",
                accent: "#00ff88",
              },
            ].map((item, i) => (
              <div key={i} className="p-10 bg-[#101018]/60 backdrop-blur-md border-white/[0.04] border">
                <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3 opacity-60" style={{ color: item.accent }}>{item.label}</p>
                <p className="font-display font-black text-5xl text-white mb-4">{item.value}</p>
                <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CTASection({ onLogin }: { onLogin: () => void }) {
  return (
    <section className="relative z-10 px-4 pb-24">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="font-display text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
            Ready to run tech<br />
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">like a pro?</span>
          </h2>
          <p className="text-slate-400 text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
            Join the teams that have stopped firefighting and started engineering. The Apphia Engine is waiting.
          </p>
          <Button
            onClick={onLogin}
            size="lg"
            className="h-16 px-14 text-xl group rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-[0_0_60px_rgba(0,240,255,0.25)]"
          >
            Start Free Today
            <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </Button>
          <p className="text-xs text-slate-600 mt-5">No credit card required. Includes 3 diagnostic cases and full connector monitoring.</p>
        </motion.div>
      </div>
    </section>
  );
}

export default function Landing() {
  const { isAuthenticated, isLoading, login } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(0,240,255,0.3)]" />
      </div>
    );
  }

  if (isAuthenticated) return <Redirect to="/dashboard" />;

  return (
    <div className="min-h-screen bg-[#0a0a0f] font-sans overflow-x-hidden">
      <ShowroomHero onLogin={login} />
      <StatsBar />
      <FeatureCarousel />
      <PlatformSection />
      <CTASection onLogin={login} />

      <footer className="relative z-10 border-t border-white/[0.04] py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <img src={`${BASE}images/logo-pmo-ops.png`} alt="PMO-Ops" className="w-7 h-7 object-contain rounded" />
            <span className="font-display font-bold text-sm text-white">PMO-Ops</span>
            <span className="text-slate-600 text-xs ml-2">by Martin PMO</span>
          </div>
          <p className="text-xs text-slate-600">© 2026 Martin PMO. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
