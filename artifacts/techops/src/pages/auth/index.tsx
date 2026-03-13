import { useState, useEffect } from "react";
import { Redirect, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, CheckCircle2, AlertCircle, Chrome } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";

const BASE = import.meta.env.BASE_URL?.replace(/\/+$/, "") || "";

type Tab = "google" | "password" | "magic";
type Mode = "login" | "register";

function Input({
  type = "text", placeholder, value, onChange, icon: Icon, rightEl, disabled,
}: {
  type?: string; placeholder: string; value: string;
  onChange: (v: string) => void; icon?: React.ComponentType<{ className?: string }>;
  rightEl?: React.ReactNode; disabled?: boolean;
}) {
  return (
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />}
      <input
        type={type} value={value} placeholder={placeholder} disabled={disabled}
        onChange={e => onChange(e.target.value)}
        className={`w-full bg-[#0d1117] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors disabled:opacity-40 ${Icon ? "pl-10" : ""} ${rightEl ? "pr-12" : ""}`}
      />
      {rightEl && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightEl}</div>}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${active ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20" : "text-slate-400 hover:text-slate-200"}`}>
      {children}
    </button>
  );
}

export default function AuthPage() {
  const { isAuthenticated, isLoading, refetch } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, setTab]   = useState<Tab>("google");
  const [mode, setMode] = useState<Mode>("login");

  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [showPass, setShowPass]   = useState(false);

  const [busy, setBusy]     = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError]   = useState("");

  const urlParams = new URLSearchParams(window.location.search);
  const returnTo  = urlParams.get("returnTo") || `${BASE}/dashboard`;
  const urlError  = urlParams.get("error");

  useEffect(() => {
    if (urlError === "expired") setError("Your sign-in link has expired. Please request a new one.");
    else if (urlError === "invalid") setError("Invalid or already-used sign-in link.");
    else if (urlError === "google_failed") setError("Google sign-in failed. Please try again.");
    else if (urlError === "google_disabled") setError("Google sign-in is not configured yet.");
  }, [urlError]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060810]">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) return <Redirect to={returnTo} />;

  const clearMessages = () => { setError(""); setSuccess(""); };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!email.trim() || !password) { setError("Email and password are required"); return; }
    setBusy(true);
    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const body: Record<string, string> = { email: email.trim().toLowerCase(), password };
      if (mode === "register") { body.firstName = firstName; body.lastName = lastName; }

      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error || "Something went wrong"); return; }

      refetch();
      setLocation(returnTo);
    } catch {
      setError("Network error. Please try again.");
    } finally { setBusy(false); }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!email.trim()) { setError("Please enter your email address"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/magic-link/request", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json() as { sent?: boolean; devLink?: string; error?: string };
      if (!res.ok) { setError(data.error || "Failed to send link"); return; }
      setSuccess(`A sign-in link has been sent to ${email.trim()}.`);
      if (data.devLink) {
        console.log("[Dev] Magic link:", data.devLink);
        setSuccess(`${data.devLink}`);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally { setBusy(false); }
  };

  const googleEnabled = true;

  return (
    <div className="min-h-screen bg-[#060810] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-950/20 via-transparent to-sky-950/20 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md">

        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2 mb-6 opacity-80 hover:opacity-100 transition-opacity">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-sky-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">TO</span>
            </div>
            <span className="text-white font-bold text-lg">Tech-Ops</span>
            <span className="text-slate-500 text-sm">by Martin PMO</span>
          </a>
          <h1 className="text-2xl font-bold text-white mb-1">
            {tab === "google" ? "Sign in to your account" : mode === "register" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-slate-500 text-sm">Support, Engineered.</p>
        </div>

        <div className="bg-[#0d1117] border border-white/[0.06] rounded-2xl p-6 shadow-2xl shadow-black/40">
          {/* Tab switcher */}
          <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 mb-6">
            <TabButton active={tab === "google"}   onClick={() => { setTab("google");   clearMessages(); }}>Google</TabButton>
            <TabButton active={tab === "password"} onClick={() => { setTab("password"); clearMessages(); }}>Password</TabButton>
            <TabButton active={tab === "magic"}    onClick={() => { setTab("magic");    clearMessages(); }}>Magic Link</TabButton>
          </div>

          <AnimatePresence mode="wait">
            {/* ── Google ── */}
            {tab === "google" && (
              <motion.div key="google" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}>
                <a href={`/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`}
                  className={`flex items-center justify-center gap-3 w-full py-3.5 rounded-xl border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] text-white font-medium text-sm transition-all ${!googleEnabled ? "opacity-50 pointer-events-none" : ""}`}>
                  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </a>
                {!googleEnabled && (
                  <p className="text-xs text-amber-400/80 text-center mt-3">Google OAuth requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to be configured.</p>
                )}
                <div className="flex items-center gap-3 mt-5 mb-5">
                  <div className="flex-1 h-px bg-white/[0.06]" />
                  <span className="text-xs text-slate-600">or use another method</span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setTab("password")} className="py-2.5 rounded-xl border border-white/[0.08] text-slate-400 text-sm hover:text-white hover:border-white/[0.15] transition-all">Email + Password</button>
                  <button onClick={() => setTab("magic")} className="py-2.5 rounded-xl border border-white/[0.08] text-slate-400 text-sm hover:text-white hover:border-white/[0.15] transition-all">Magic Link</button>
                </div>
              </motion.div>
            )}

            {/* ── Email + Password ── */}
            {tab === "password" && (
              <motion.div key="password" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}>
                <div className="flex bg-white/[0.03] rounded-xl p-1 mb-5">
                  <button onClick={() => { setMode("login"); clearMessages(); }}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "login" ? "bg-white/[0.08] text-white" : "text-slate-500 hover:text-slate-300"}`}>
                    Sign In
                  </button>
                  <button onClick={() => { setMode("register"); clearMessages(); }}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "register" ? "bg-white/[0.08] text-white" : "text-slate-500 hover:text-slate-300"}`}>
                    Create Account
                  </button>
                </div>

                <form onSubmit={e => void handlePassword(e)} className="space-y-3">
                  {mode === "register" && (
                    <div className="grid grid-cols-2 gap-3">
                      <Input placeholder="First name" value={firstName} onChange={setFirstName} disabled={busy} />
                      <Input placeholder="Last name" value={lastName} onChange={setLastName} disabled={busy} />
                    </div>
                  )}
                  <Input type="email" placeholder="Email address" value={email} onChange={setEmail} icon={Mail} disabled={busy} />
                  <Input type={showPass ? "text" : "password"} placeholder="Password" value={password} onChange={setPassword} icon={Lock} disabled={busy}
                    rightEl={
                      <button type="button" onClick={() => setShowPass(s => !s)} className="text-slate-500 hover:text-slate-300 transition-colors">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />
                  <button type="submit" disabled={busy}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 text-white font-semibold text-sm hover:from-violet-500 hover:to-violet-400 transition-all disabled:opacity-50 mt-2">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    {mode === "register" ? "Create Account" : "Sign In"}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── Magic Link ── */}
            {tab === "magic" && (
              <motion.div key="magic" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}>
                {!success ? (
                  <form onSubmit={e => void handleMagicLink(e)} className="space-y-4">
                    <p className="text-sm text-slate-400 mb-1">Enter your email and we'll send you a one-click sign-in link — no password needed.</p>
                    <Input type="email" placeholder="Email address" value={email} onChange={setEmail} icon={Mail} disabled={busy} />
                    <button type="submit" disabled={busy}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 text-white font-semibold text-sm hover:from-violet-500 hover:to-violet-400 transition-all disabled:opacity-50">
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                      Send Sign-In Link
                    </button>
                  </form>
                ) : (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                    <p className="text-white font-semibold mb-1">Check your email</p>
                    {success.startsWith("http") ? (
                      <>
                        <p className="text-xs text-slate-400 mb-3">Dev mode — click the link directly:</p>
                        <a href={success} className="text-xs text-violet-400 hover:underline break-all">{success}</a>
                      </>
                    ) : (
                      <p className="text-sm text-slate-400">{success}</p>
                    )}
                    <button onClick={() => { setSuccess(""); setEmail(""); }} className="text-xs text-slate-500 hover:text-slate-300 transition-colors mt-4">Send to a different email</button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error / success banners */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-4 flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-300">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          By signing in you agree to our{" "}
          <a href="#" className="text-slate-400 hover:text-slate-200 transition-colors">Terms of Service</a>
          {" "}and{" "}
          <a href="#" className="text-slate-400 hover:text-slate-200 transition-colors">Privacy Policy</a>.
        </p>
      </motion.div>
    </div>
  );
}
