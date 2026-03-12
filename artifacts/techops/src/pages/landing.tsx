import { useAuth } from "@workspace/replit-auth-web";
import { Redirect } from "wouter";
import { Button } from "@/components/ui";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { useEffect, useRef } from "react";

const BASE = import.meta.env.BASE_URL;
const featureDiagnostic = `${BASE}images/feature-diagnostic.png`;
const featureSecurity = `${BASE}images/feature-security.png`;
const featureIntelligence = `${BASE}images/feature-intelligence.png`;
const featureAutomation = `${BASE}images/feature-automation.png`;
const featureConnectors = `${BASE}images/feature-connectors.png`;
const featureRemote = `${BASE}images/feature-remote.png`;

function AmbientCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number }> = [];
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight * 3;
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.15,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.3 + 0.05,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,240,255,${p.alpha})`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[j].x - p.x;
          const dy = particles[j].y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0,240,255,${0.04 * (1 - dist / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });

      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

const features = [
  {
    image: featureDiagnostic,
    title: "Apphia Diagnostic Engine",
    subtitle: "7-Stage Probabilistic Root Cause Analysis",
    description: "Apphia doesn't just alert you — it thinks. Our multi-tier diagnostic pipeline classifies issues, extracts typed signals from your infrastructure, traverses dependency graphs, and ranks probable root causes with confidence scoring. Think of it as a senior systems engineer that never sleeps, analyzing patterns across your entire stack in seconds, not hours.",
    bullets: ["Automatic signal extraction from logs and metrics", "Dependency-aware root cause ranking", "Self-assessed resolution synthesis with confidence gating"],
  },
  {
    image: featureSecurity,
    title: "Security & Privacy Command Center",
    subtitle: "Continuous Threat Detection & Compliance Monitoring",
    description: "Stop reacting to breaches — start preventing them. The Security Command Center continuously scans your integrations for vulnerabilities, monitors access patterns for anomalies, and maintains a real-time compliance posture score. From API token rotation reminders to PII exposure detection in logs, every security blindspot gets illuminated.",
    bullets: ["Vulnerability scanning with prioritized remediation", "Real-time access audit trail across all integrations", "Permission matrix visualization and role-based governance"],
  },
  {
    image: featureIntelligence,
    title: "Stack Intelligence",
    subtitle: "Strategic Gap Analysis & Cost Optimization",
    description: "Your tech stack is either working for you or against you. Stack Intelligence maps every tool in your ecosystem, identifies functional gaps that are costing your team productivity, detects redundant subscriptions bleeding budget, and benchmarks your spend against industry standards. It's the strategic advisor your CTO wishes they had.",
    bullets: ["Category-by-category gap identification with recommendations", "Redundancy detection with estimated waste calculations", "Cost benchmarking against comparable organizations"],
  },
  {
    image: featureAutomation,
    title: "Automation Center",
    subtitle: "Trigger-Action Rules with Governance Controls",
    description: "Define smart automation rules that respond to real infrastructure events — high CPU triggering service restarts, failed health checks paging on-call engineers, critical cases launching Apphia diagnostics automatically. Every rule passes through governance approval workflows, so automation never means losing control.",
    bullets: ["Event-driven triggers with configurable action responses", "Approval-gated execution for sensitive operations", "Execution history and audit compliance"],
  },
  {
    image: featureConnectors,
    title: "Connector Health Monitoring",
    subtitle: "Real-Time Infrastructure Relationship Mapping",
    description: "See your entire infrastructure as a living system. Every integration, every dependency, every data flow — mapped, monitored, and measured in real time. When something degrades, you don't just see a red dot — you see the blast radius, the affected downstream services, and the historical health pattern that predicted the issue.",
    bullets: ["Live uptime and response time monitoring per connector", "Visual dependency mapping with animated data flows", "Historical health trends with degradation pattern detection"],
  },
  {
    image: featureRemote,
    title: "Remote Assistance",
    subtitle: "Secure Screen Sharing with Granular Permissions",
    description: "When you need hands-on help, Remote Assistance provides WebRTC-powered screen sharing with military-grade permission controls. Choose from preset access levels — from read-only observation to trusted agent mode — and every action is logged in a tamper-proof audit trail. Session tokens are temporary, timeouts are enforced, and you're always in control.",
    bullets: ["4 permission presets from observer to full access", "Per-capability toggle controls (file system, shell, services)", "Complete session action logging with user attribution"],
  },
];

export default function Landing() {
  const { isAuthenticated, isLoading, login } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-showroom-dark">
        <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(0,240,255,0.3)]"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <div className="min-h-screen bg-showroom-dark relative overflow-x-hidden font-sans">
      <AmbientCanvas />

      <div className="absolute top-0 left-0 right-0 h-[700px] bg-gradient-to-b from-cyan-500/[0.04] via-purple-500/[0.02] to-transparent pointer-events-none" />
      <div className="absolute top-[200px] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-cyan-500/[0.06] rounded-full blur-[200px] pointer-events-none" />
      <div className="absolute top-[800px] right-0 w-[500px] h-[500px] bg-purple-500/[0.04] rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-[1800px] left-0 w-[600px] h-[400px] bg-blue-500/[0.03] rounded-full blur-[120px] pointer-events-none" />

      <nav className="relative z-10 px-8 py-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <img 
            src={`${import.meta.env.BASE_URL}images/logo-pmo-ops.png`} 
            alt="PMO-Ops Logo" 
            className="w-11 h-11 object-contain rounded-lg"
          />
          <span className="font-display font-bold text-xl text-white tracking-tight">
            PMO-Ops
          </span>
        </div>
        <Button onClick={login} variant="outline" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10">
          Sign In
        </Button>
      </nav>

      <section className="relative z-10 text-center px-4 pt-16 pb-24 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-cyan-500/[0.08] border border-cyan-500/20 text-sm font-medium text-cyan-400 mb-10"
          >
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(0,240,255,0.6)]"></span>
            Powered by the Apphia Engine
          </motion.div>
          
          <h1 className="font-display text-5xl md:text-7xl font-bold text-white leading-[1.08] tracking-tight mb-8">
            Autonomous tech operations{" "}
            <br className="hidden md:block" />
            for{" "}
            <span className="text-gradient text-glow">growing teams.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 mb-6 max-w-3xl mx-auto leading-relaxed">
            PMO-Ops is the all-in-one platform that diagnoses infrastructure issues before they become outages, monitors every integration in your stack, automates operational workflows, and gives you the intelligence to make smarter technology decisions.
          </p>
          <p className="text-base text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed">
            Built for founders, IT leaders, and ops teams who manage 5-50+ SaaS tools and need a single pane of glass to understand what's healthy, what's at risk, and what to do about it.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button onClick={login} size="lg" className="h-16 px-10 text-lg group rounded-full neon-glow-cyan">
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <a href="#features" className="text-slate-400 hover:text-cyan-400 transition-colors text-sm font-medium flex items-center gap-1.5 py-3">
              See what's inside
              <ArrowRight className="w-4 h-4" />
            </a>
          </motion.div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.7 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {[
            { value: "7-Stage", label: "Diagnostic Pipeline" },
            { value: "< 30s", label: "Root Cause Analysis" },
            { value: "24/7", label: "Continuous Monitoring" },
            { value: "100%", label: "Audit Trail Coverage" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.08 }}
              className="text-center p-4"
            >
              <p className="text-2xl md:text-3xl font-display font-bold text-white">{stat.value}</p>
              <p className="text-xs md:text-sm text-slate-500 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section id="features" className="relative z-10 max-w-6xl mx-auto px-4 pb-24 space-y-32">
        {features.map((feature, i) => {
          const isReversed = i % 2 === 1;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className={`flex flex-col ${isReversed ? "lg:flex-row-reverse" : "lg:flex-row"} gap-12 lg:gap-16 items-center`}
            >
              <div className="w-full lg:w-2/5 flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-cyan-500/10 rounded-full blur-[80px] scale-75" />
                  <img 
                    src={feature.image} 
                    alt={feature.title}
                    className="w-56 h-56 md:w-72 md:h-72 object-contain relative z-10 drop-shadow-2xl"
                    style={{ filter: "drop-shadow(0 0 30px rgba(0,240,255,0.15))" }}
                  />
                </div>
              </div>
              
              <div className="w-full lg:w-3/5 text-left">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400 mb-3">{feature.subtitle}</p>
                <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-5 leading-tight">{feature.title}</h2>
                <p className="text-slate-400 leading-relaxed mb-6 text-[15px]">{feature.description}</p>
                <ul className="space-y-3">
                  {feature.bullets.map((bullet, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0 mt-0.5 border border-cyan-500/20">
                        <Check className="w-3 h-3 text-cyan-400" />
                      </div>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          );
        })}
      </section>

      <section className="relative z-10 max-w-5xl mx-auto px-4 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="glass-card rounded-3xl p-12 md:p-16 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.06] via-transparent to-purple-500/[0.04] pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-5 leading-tight">
              Stop firefighting.<br />Start engineering.
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto mb-10 text-lg leading-relaxed">
              Your team deserves better than switching between 15 tabs to figure out what's broken. PMO-Ops gives you the diagnostic intelligence, security posture, and operational clarity to run technology like a competitive advantage.
            </p>
            <Button onClick={login} size="lg" className="h-16 px-12 text-lg group rounded-full neon-glow-cyan">
              Start Your Free Trial
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <p className="text-xs text-slate-600 mt-5">No credit card required. Free tier includes 3 diagnostic cases and connector monitoring.</p>
          </div>
        </motion.div>
      </section>

      <footer className="relative z-10 border-t border-white/[0.04] py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <img 
              src={`${import.meta.env.BASE_URL}images/logo-pmo-ops.png`} 
              alt="PMO-Ops Logo" 
              className="w-7 h-7 object-contain rounded"
            />
            <span className="font-display font-bold text-sm text-white">PMO-Ops</span>
            <span className="text-slate-600 text-xs ml-2">by Martin PMO</span>
          </div>
          <p className="text-xs text-slate-600">&copy; 2026 Martin PMO. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
