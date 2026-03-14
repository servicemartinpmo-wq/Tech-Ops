import { useState, useEffect } from "react";
import { Redirect, useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";

const BASE = import.meta.env.BASE_URL?.replace(/\/+$/, "") || "";

type Tab = "google" | "password" | "magic";
type Mode = "login" | "register";

function LightInput({
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
        className={`w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-40 ${Icon ? "pl-10" : ""} ${rightEl ? "pr-12" : ""}`}
      />
      {rightEl && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightEl}</div>}
    </div>
  );
}

export default function AuthPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [tab, setTab]   = useState<Tab>("google");
  const [mode, setMode] = useState<Mode>("login");

  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);


  const [busy, setBusy]       = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError]     = useState("");

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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) return <Redirect to={returnTo} />;

  const clearMessages = () => { setError(""); setSuccess(""); };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!email.trim() || !password) { setError("Email and password are required"); return; }
    if (mode === "register" && !tosAccepted) { setError("You must accept the Terms of Service to create an account"); return; }
    setBusy(true);
    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const body: Record<string, string> = { email: email.trim().toLowerCase(), password };
      if (mode === "register") { body.firstName = firstName; body.lastName = lastName; }
      const res = await fetch(endpoint, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error || "Something went wrong"); return; }
      window.location.href = returnTo;
    } catch { setError("Network error. Please try again."); } finally { setBusy(false); }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!email.trim()) { setError("Please enter your email address"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/magic-link/request", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json() as { sent?: boolean; devLink?: string; error?: string };
      if (!res.ok) { setError(data.error || "Failed to send link"); return; }
      setSuccess(`A sign-in link has been sent to ${email.trim()}.`);
      if (data.devLink) setSuccess(data.devLink);
    } catch { setError("Network error. Please try again."); } finally { setBusy(false); }
  };


  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "google", label: "Google" },
    { id: "password", label: "Email" },
    { id: "magic", label: "Magic Link" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-100/40 rounded-full blur-3xl pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md">

        <div className="text-center mb-8">
          <a href="/" className="inline-flex flex-col items-center gap-3 mb-6">
            <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg ring-2 ring-blue-100">
              <img
                src={`${BASE}/images/logo-pmo-ops.png`}
                alt="PMO-Ops"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="font-bold text-lg text-slate-900">Tech-Ops by Martin PMO</p>
              <p className="text-slate-500 text-sm">Support, Engineered.</p>
            </div>
          </a>
        </div>

        <div className="bg-white/90 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-6 shadow-xl shadow-slate-200/50">
          {/* Tab switcher */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
            {tabs.map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); clearMessages(); }}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                {t.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* ── Google ── */}
            {tab === "google" && (
              <motion.div key="google" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}>
                <a href={`/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`}
                  className="flex items-center justify-center gap-3 w-full py-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-medium text-sm transition-all shadow-sm">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </a>
                <div className="flex items-center gap-3 mt-5 mb-5">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-400">or use another method</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setTab("password")} className="py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-all">Email + Password</button>
                  <button onClick={() => setTab("magic")} className="py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-all">Magic Link</button>
                </div>
              </motion.div>
            )}

            {/* ── Email + Password ── */}
            {tab === "password" && (
              <motion.div key="password" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}>
                <div className="flex bg-slate-100 rounded-xl p-1 mb-5">
                  <button onClick={() => { setMode("login"); clearMessages(); }}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                    Sign In
                  </button>
                  <button onClick={() => { setMode("register"); clearMessages(); }}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "register" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                    Create Account
                  </button>
                </div>
                <form onSubmit={e => void handlePassword(e)} className="space-y-3">
                  {mode === "register" && (
                    <div className="grid grid-cols-2 gap-3">
                      <LightInput placeholder="First name" value={firstName} onChange={setFirstName} disabled={busy} />
                      <LightInput placeholder="Last name" value={lastName} onChange={setLastName} disabled={busy} />
                    </div>
                  )}
                  <LightInput type="email" placeholder="Email address" value={email} onChange={setEmail} icon={Mail} disabled={busy} />
                  <LightInput type={showPass ? "text" : "password"} placeholder="Password" value={password} onChange={setPassword} icon={Lock} disabled={busy}
                    rightEl={
                      <button type="button" onClick={() => setShowPass(s => !s)} className="text-slate-400 hover:text-slate-600 transition-colors">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />
                  {mode === "register" && (
                    <label className="flex items-start gap-2.5 cursor-pointer mt-1">
                      <input type="checkbox" checked={tosAccepted} onChange={e => setTosAccepted(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-blue-600 rounded" />
                      <span className="text-xs text-slate-500 leading-relaxed">
                        I agree to the{" "}
                        <Link href="/terms" target="_blank" className="text-blue-600 hover:underline">Terms of Service</Link>
                        {" "}and{" "}
                        <Link href="/privacy" target="_blank" className="text-blue-600 hover:underline">Privacy Policy</Link>
                      </span>
                    </label>
                  )}
                  <button type="submit" disabled={busy}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm hover:from-blue-500 hover:to-indigo-500 transition-all disabled:opacity-50 mt-2 shadow-md shadow-blue-200">
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
                    <p className="text-sm text-slate-500 mb-1">Enter your email and we'll send you a one-click sign-in link — no password needed.</p>
                    <LightInput type="email" placeholder="Email address" value={email} onChange={setEmail} icon={Mail} disabled={busy} />
                    <button type="submit" disabled={busy}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm hover:from-blue-500 hover:to-indigo-500 transition-all disabled:opacity-50 shadow-md shadow-blue-200">
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                      Send Sign-In Link
                    </button>
                  </form>
                ) : (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                    <p className="text-slate-800 font-semibold mb-1">Check your email</p>
                    {success.startsWith("http") ? (
                      <>
                        <p className="text-xs text-slate-500 mb-3">Dev mode — click the link directly:</p>
                        <a href={success} className="text-xs text-blue-600 hover:underline break-all">{success}</a>
                      </>
                    ) : (
                      <p className="text-sm text-slate-500">{success}</p>
                    )}
                    <button onClick={() => { setSuccess(""); setEmail(""); }} className="text-xs text-slate-400 hover:text-slate-600 transition-colors mt-4">Send to a different email</button>
                  </motion.div>
                )}
              </motion.div>
            )}

          </AnimatePresence>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between mt-6 px-1">
          <p className="text-xs text-slate-400">
            <Link href="/terms" className="hover:text-slate-600 transition-colors">Terms</Link>
            {" · "}
            <Link href="/privacy" className="hover:text-slate-600 transition-colors">Privacy</Link>
          </p>
          <button
            onClick={() => { setTab(tab === "creator" ? "google" : "creator"); clearMessages(); }}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-600 transition-colors"
          >
            <Crown className="w-3.5 h-3.5" />
            {tab === "creator" ? "Back to sign in" : "Creator Mode"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
