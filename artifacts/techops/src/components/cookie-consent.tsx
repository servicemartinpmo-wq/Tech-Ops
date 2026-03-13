import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, X, ShieldCheck } from "lucide-react";
import { Link } from "wouter";

const COOKIE_KEY = "techops_cookie_consent_v1";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem(COOKIE_KEY);
    if (!accepted) {
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(COOKIE_KEY, "essential-only");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl mx-auto px-4"
        >
          <div className="bg-[#0d1117] border border-white/[0.1] rounded-2xl shadow-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Cookie className="w-4 h-4 text-amber-400" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">We use essential cookies</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                We use cookies for authentication and session management only — no tracking or advertising.{" "}
                <Link href="/privacy" className="text-violet-400 hover:underline">Privacy Policy</Link>
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={decline}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 border border-white/[0.08] rounded-lg transition-colors"
              >
                Essential only
              </button>
              <button
                onClick={accept}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Accept
              </button>
              <button onClick={decline} className="text-slate-600 hover:text-slate-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
