import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@workspace/replit-auth-web";
import { useApiBase } from "@/hooks/use-api-base";
import {
  Sparkles, Cpu, Activity, Brain, ArrowRight, CheckCircle2, X, Monitor
} from "lucide-react";
import { Link } from "wouter";

const STORAGE_KEY = "techops_onboarding_v2";

const STEPS = [
  {
    id: "welcome",
    icon: Sparkles,
    color: "violet",
    title: "Welcome to Tech-Ops",
    subtitle: "Autonomous IT operations, engineered by Martin PMO",
    body: "The Apphia Engine is ready to diagnose, monitor, and automate your entire IT stack. Let's get you set up in 60 seconds.",
  },
  {
    id: "snapshot",
    icon: Monitor,
    color: "sky",
    title: "Capture Your Environment",
    subtitle: "Help Apphia understand your stack",
    body: "We'll capture your browser environment details so Apphia can tailor diagnostics and recommendations to your specific setup.",
  },
  {
    id: "connectors",
    icon: Activity,
    color: "emerald",
    title: "Connect Your Services",
    subtitle: "Monitor everything in one place",
    body: "Link your infrastructure connectors — cloud providers, monitoring tools, and services — so Apphia can track their health automatically.",
  },
  {
    id: "preferences",
    icon: Brain,
    color: "amber",
    title: "Set Your Preferences",
    subtitle: "Personalise your Apphia experience",
    body: "Complete the Myers-Briggs style preferences quiz so Apphia can adapt its communication style and recommendations to match how you work.",
  },
];

const COLOR_MAP: Record<string, string> = {
  violet: "bg-violet-500/10 border-violet-500/20 text-violet-400",
  sky: "bg-sky-500/10 border-sky-500/20 text-sky-400",
  emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
};

export function OnboardingWizard() {
  const { user } = useAuth() as { user?: { id?: string; onboardingCompleted?: boolean } };
  const apiBase = useApiBase();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [snapshotDone, setSnapshotDone] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done && user?.id) {
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [user?.id]);

  const captureSnapshot = async () => {
    setCapturing(true);
    try {
      const snapshot = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        cores: navigator.hardwareConcurrency ?? null,
        memory: (navigator as { deviceMemory?: number }).deviceMemory ?? null,
      };
      await fetch(`${apiBase}/api/environment/snapshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot }),
        credentials: "include",
      });
      setSnapshotDone(true);
    } catch {
      setSnapshotDone(true);
    } finally {
      setCapturing(false);
    }
  };

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "completed");
    setVisible(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      dismiss();
    }
  };

  const currentStep = STEPS[step];
  const Icon = currentStep.icon;
  const colorClass = COLOR_MAP[currentStep.color];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="relative bg-[#0d1117] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 text-slate-600 hover:text-slate-400 transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-8">
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-6 ${colorClass}`}>
                <Icon className="w-6 h-6" />
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <h2 className="text-xl font-bold text-white mb-1">{currentStep.title}</h2>
                  <p className="text-sm text-slate-500 mb-4">{currentStep.subtitle}</p>
                  <p className="text-sm text-slate-400 leading-relaxed">{currentStep.body}</p>

                  {currentStep.id === "snapshot" && (
                    <div className="mt-5">
                      {snapshotDone ? (
                        <div className="flex items-center gap-2 text-sm text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          Environment captured successfully
                        </div>
                      ) : (
                        <button
                          onClick={() => void captureSnapshot()}
                          disabled={capturing}
                          className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          <Cpu className="w-4 h-4" />
                          {capturing ? "Capturing…" : "Capture Snapshot"}
                        </button>
                      )}
                    </div>
                  )}

                  {currentStep.id === "connectors" && (
                    <div className="mt-5">
                      <Link
                        href="/connectors"
                        onClick={dismiss}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-colors"
                      >
                        <Activity className="w-4 h-4" />
                        Go to Connectors
                      </Link>
                    </div>
                  )}

                  {currentStep.id === "preferences" && (
                    <div className="mt-5">
                      <Link
                        href="/preferences"
                        onClick={dismiss}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-medium transition-colors"
                      >
                        <Brain className="w-4 h-4" />
                        Take Preferences Quiz
                      </Link>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="border-t border-white/[0.06] px-8 py-4 flex items-center justify-between">
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === step ? "w-6 bg-violet-400" : i < step ? "w-3 bg-violet-700" : "w-3 bg-white/10"
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={dismiss} className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
                  Skip all
                </button>
                <button
                  onClick={next}
                  className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  {step === STEPS.length - 1 ? "Get Started" : "Next"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
