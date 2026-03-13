import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Zap, CheckCircle2, FileText, ArrowRight, X, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui";

const STORAGE_KEY = "techops_onboarding_v1";

const STEPS = [
  {
    id: "welcome",
    title: "Welcome to Tech-Ops by Martin PMO",
    subtitle: "Support, Engineered.",
    icon: BrainCircuit,
    iconColor: "text-sky-400",
    iconBg: "bg-sky-500/10 border-sky-500/20",
    body: (
      <div className="space-y-3 text-sm text-slate-500">
        <p>You're now inside the Apphia Engine — an autonomous knowledge system that diagnoses, monitors, and resolves your IT operations.</p>
        <div className="grid grid-cols-1 gap-2 mt-4">
          {[
            "7-stage diagnostic pipeline for root cause analysis",
            "Live connector health monitoring",
            "Automation rules that act on your behalf",
            "Secure Share Vault with AES-256 encryption",
          ].map((f, i) => (
            <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <span className="text-slate-600 text-xs">{f}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    cta: "Get Started",
  },
  {
    id: "submit",
    title: "Submit Your First Issue",
    subtitle: "Apphia analyzes it immediately.",
    icon: FileText,
    iconColor: "text-violet-400",
    iconBg: "bg-violet-500/10 border-violet-500/20",
    body: (
      <div className="space-y-3 text-sm text-slate-500">
        <p>The fastest way to experience Apphia is to submit a real (or test) issue. Describe it in plain English — Apphia handles the rest.</p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
          <strong>Tip:</strong> Try submitting something like "Database connection timeout in production" to see the full 7-stage diagnostic pipeline in action.
        </div>
        <p className="text-xs">You can also browse the dashboard, configure connectors, or calibrate your preferences profile first.</p>
      </div>
    ),
    cta: "Submit an Issue",
    ctaHref: "/cases/submit",
    skipLabel: "Explore dashboard first",
  },
  {
    id: "done",
    title: "You're All Set",
    subtitle: "Apphia is online and ready.",
    icon: Zap,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    body: (
      <div className="space-y-3 text-sm text-slate-500">
        <p>Your environment is configured and the Apphia Engine is active. Here's what to do next:</p>
        <div className="grid grid-cols-1 gap-2">
          {[
            { label: "Calibrate your profile", desc: "Takes 2 minutes — shapes how Apphia communicates.", href: "/preferences" },
            { label: "Check connector health", desc: "See live status of your integrations.", href: "/connectors" },
            { label: "Explore automation rules", desc: "Set up proactive responses to system events.", href: "/automation" },
          ].map((item, i) => (
            <Link key={i} href={item.href} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-sky-200 hover:bg-sky-50/50 transition-all group">
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-500 mt-0.5 shrink-0 transition-colors" />
              <div>
                <p className="text-xs font-semibold text-slate-700 group-hover:text-sky-600">{item.label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    ),
    cta: "Enter Dashboard",
  },
];

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) setOpen(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "done");
    setOpen(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      dismiss();
    }
  };

  if (!open) return null;

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200"
          >
            <div className="relative bg-gradient-to-br from-sky-500/10 to-indigo-500/10 p-6 border-b border-slate-100">
              <button
                onClick={dismiss}
                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${current.iconBg} shrink-0`}>
                  <Icon className={`w-6 h-6 ${current.iconColor}`} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">{current.title}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{current.subtitle}</p>
                </div>
              </div>
              <div className="flex gap-1.5 mt-4">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all duration-300 ${i === step ? "bg-sky-500 w-6" : i < step ? "bg-sky-300 w-4" : "bg-slate-200 w-4"}`}
                  />
                ))}
              </div>
            </div>

            <div className="p-6">
              {current.body}
            </div>

            <div className="px-6 pb-6 flex items-center gap-3">
              {current.ctaHref ? (
                <Link href={current.ctaHref} onClick={next} className="flex-1">
                  <Button className="w-full">
                    {current.cta}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              ) : (
                <Button onClick={next} className="flex-1">
                  {current.cta}
                  {step < STEPS.length - 1 && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              )}
              {current.skipLabel && (
                <button
                  onClick={next}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors whitespace-nowrap"
                >
                  {current.skipLabel}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
