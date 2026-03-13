import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor, Shield, Eye, Edit3, Terminal, CheckCircle2, Activity, Moon, Sun,
  RefreshCw, X, Copy, Users, MousePointer2,
  Video, VideoOff, Maximize2, Zap,
  PhoneOff, ScreenShare, ArrowRight, Info
} from "lucide-react";

type ConnectionState = "idle" | "connecting" | "connected" | "sleep";
type ControlMode = "observe" | "guide" | "control";

const permissionPresets = [
  { id: "observe", label: "Observer", icon: Eye, color: "text-sky-600", bg: "bg-sky-50", border: "border-sky-200", desc: "View screen only — no interaction" },
  { id: "guide", label: "Guided Fix", icon: Edit3, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200", desc: "Annotate & highlight — limited input" },
  { id: "control", label: "Full Control", icon: Terminal, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200", desc: "Complete keyboard & mouse control" },
];

const mockScreenContent = [
  { app: "Terminal", content: "$ systemctl status nginx\n● nginx.service — A high performance web server\n   Loaded: loaded (/lib/systemd/system/nginx.service)\n   Active: active (running) since Fri 2026-03-13 14:22:01\nMar 13 14:35:12 nginx[3821]: [notice] 1#1: signal 1 (SIGHUP)" },
  { app: "System Monitor", content: "CPU: 34%  MEM: 6.2/16 GB  DISK: 48/500 GB\nTop processes:\n nginx   3.2%  212 MB\n postgres 1.8%  398 MB\n node    4.1%  187 MB" },
  { app: "Log Viewer", content: "[14:34:11] ERROR: Database connection timeout after 30s\n[14:34:11] WARN: Retry attempt 1/3...\n[14:34:41] INFO: Connection re-established\n[14:35:02] INFO: Serving 842 active requests" },
];

const sessionLogItems = [
  { time: "14:32:01", action: "Session started", user: "You", type: "system" },
  { time: "14:32:15", action: "Navigated to /var/log/syslog", user: "Agent", type: "read" },
  { time: "14:33:02", action: "Viewed error logs (last 100 lines)", user: "Agent", type: "read" },
  { time: "14:34:18", action: "Requested: restart nginx service", user: "Agent", type: "request" },
  { time: "14:34:25", action: "Permission granted by Admin", user: "You", type: "grant" },
  { time: "14:34:30", action: "Service nginx restarted successfully", user: "Agent", type: "write" },
];

function LogTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    system: "bg-slate-100 text-slate-600",
    read:   "bg-sky-50 text-sky-600",
    write:  "bg-amber-50 text-amber-600",
    request:"bg-violet-50 text-violet-600",
    grant:  "bg-emerald-50 text-emerald-600",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${styles[type] ?? styles.system}`}>
      {type}
    </span>
  );
}

function SessionCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex items-center gap-2 bg-slate-900 rounded-xl px-4 py-2.5">
      <span className="font-mono text-lg font-bold text-emerald-400 tracking-widest">{code}</span>
      <button onClick={copy} className="text-slate-400 hover:text-white transition-colors ml-2">
        {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

function SleepScreen({ onWake }: { onWake: (summary: string) => void }) {
  const [nextSteps, setNextSteps] = useState("• Nginx service has been restarted and is responding on port 80.\n• A cron job was added to rotate logs every Sunday at 03:00.\n• Review the new error rate in your monitoring dashboard — it should drop within 10 minutes.");
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/97 backdrop-blur-xl flex items-center justify-center p-8">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/30">
          <Moon className="w-10 h-10 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Session Paused</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Your screen is hidden from public view. The support agent has access only to the permitted area. You'll be notified when the work is done.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 px-4 py-3 bg-white/5 rounded-xl border border-white/10">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm text-slate-300">Agent is actively working on your system</span>
        </div>
        <div className="text-left bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">When done, agent will summarize:</p>
          <textarea
            value={nextSteps}
            onChange={e => setNextSteps(e.target.value)}
            rows={4}
            className="w-full bg-transparent text-sm text-slate-200 resize-none focus:outline-none leading-relaxed"
          />
        </div>
        <button
          onClick={() => onWake(nextSteps)}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-base hover:from-emerald-400 hover:to-teal-400 transition-all shadow-lg shadow-emerald-500/30"
        >
          <Sun className="w-5 h-5" />
          Done — Wake Screen & Show Next Steps
        </button>
      </div>
    </div>
  );
}

function NextStepsPanel({ summary, onDismiss }: { summary: string; onDismiss: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
      className="fixed bottom-6 right-6 z-50 w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-300/40 overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-4 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
        <p className="font-semibold text-white">Remote Session Complete</p>
        <button onClick={onDismiss} className="ml-auto text-white/70 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Next Steps</p>
        <pre className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">{summary}</pre>
        <div className="mt-4 flex gap-2">
          <button className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors">
            Save to Vault
          </button>
          <button onClick={onDismiss} className="flex-1 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-400 transition-colors">
            Dismiss
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function MockScreen({ screenIdx, controlMode, isSleep }: { screenIdx: number; controlMode: ControlMode; isSleep: boolean }) {
  const content = mockScreenContent[screenIdx % mockScreenContent.length];
  return (
    <div className="relative w-full h-full bg-[#1a1a2e] rounded-xl overflow-hidden font-mono text-xs flex flex-col">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#16213e] border-b border-white/5">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <span className="text-slate-400 text-[11px] ml-2">{content?.app}</span>
        <div className="ml-auto flex items-center gap-2 text-slate-500 text-[10px]">
          <span>50 fps · 4K UHD</span>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 p-4 text-emerald-300/90 leading-relaxed text-[11px] overflow-auto whitespace-pre">
        {content?.content}
        <span className="animate-pulse">▊</span>
      </div>
      {/* Control overlay */}
      {controlMode === "observe" && (
        <div className="absolute inset-0 pointer-events-none border-2 border-sky-500/30 rounded-xl" />
      )}
      {controlMode === "guide" && (
        <div className="absolute inset-0 pointer-events-none border-2 border-violet-500/40 rounded-xl">
          <div className="absolute top-16 left-24 w-32 h-1 bg-yellow-400/70 rounded" style={{ transform: "rotate(-5deg)" }} />
          <MousePointer2 className="absolute top-14 left-52 w-5 h-5 text-yellow-400/80 animate-bounce" />
        </div>
      )}
      {controlMode === "control" && (
        <div className="absolute inset-0 pointer-events-none border-2 border-rose-500/50 rounded-xl" />
      )}
      {/* Quality badge */}
      <div className="absolute top-10 right-3 flex flex-col gap-1 items-end">
        <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[9px] font-bold">4K UHD</span>
        <span className="bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded text-[9px] font-bold">50 FPS</span>
        <span className="bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded text-[9px] font-bold">E2E ENC</span>
      </div>
    </div>
  );
}

export default function RemoteAssistance() {
  const [connState, setConnState] = useState<ConnectionState>("idle");
  const [controlMode, setControlMode] = useState<ControlMode>("observe");
  const [isSleeping, setIsSleeping] = useState(false);
  const [nextStepsSummary, setNextStepsSummary] = useState<string | null>(null);
  const [sessionCode] = useState(() => {
    const r = () => Math.floor(100 + Math.random() * 900);
    return `${r()}-${r()}-${r()}`;
  });
  const [elapsed, setElapsed] = useState(0);
  const [screenIdx, setScreenIdx] = useState(0);
  const [shareVideo, setShareVideo] = useState(true);
  const [shareAudio, setShareAudio] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [activeLog, setActiveLog] = useState(sessionLogItems);
  const [showFullscreen, setShowFullscreen] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (connState === "connected" || connState === "sleep") {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (connState === "idle") setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [connState]);

  useEffect(() => {
    if (connState !== "connected") return;
    const id = setInterval(() => setScreenIdx(i => (i + 1) % mockScreenContent.length), 8000);
    return () => clearInterval(id);
  }, [connState]);

  const connect = () => {
    setConnState("connecting");
    setTimeout(() => {
      setConnState("connected");
      setActiveLog([{ time: new Date().toLocaleTimeString("en-US", { hour12: false }), action: "Session established — E2E encrypted", user: "System", type: "system" }, ...sessionLogItems]);
    }, 2000);
  };

  const disconnect = () => {
    setConnState("idle");
    setIsSleeping(false);
    setNextStepsSummary(null);
    setControlMode("observe");
  };

  const enterSleep = () => {
    setIsSleeping(true);
    setConnState("sleep");
    setActiveLog(prev => [{ time: new Date().toLocaleTimeString("en-US", { hour12: false }), action: "Screen hidden — Sleep mode active", user: "System", type: "system" }, ...prev]);
  };

  const wake = (summary: string) => {
    setIsSleeping(false);
    setConnState("connected");
    setNextStepsSummary(summary);
    setActiveLog(prev => [{ time: new Date().toLocaleTimeString("en-US", { hour12: false }), action: "Session resumed — screen visible", user: "System", type: "system" }, ...prev]);
  };

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Remote Assistance</h1>
          <p className="text-sm text-slate-500">Secure, encrypted screen sharing with full session audit trail</p>
        </div>
        <div className="flex items-center gap-2">
          {connState === "connected" || connState === "sleep" ? (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-700">Live · {fmtTime(elapsed)}</span>
              </div>
              <button onClick={enterSleep} title="Sleep mode"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-full text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-all">
                <Moon className="w-3.5 h-3.5" />
                Sleep
              </button>
              <button onClick={disconnect}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full text-xs font-semibold text-red-600 hover:bg-red-100 transition-all">
                <PhoneOff className="w-3.5 h-3.5" />
                End Session
              </button>
            </>
          ) : connState === "connecting" ? (
            <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
              <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
              <span className="text-xs font-semibold text-amber-700">Connecting…</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-full">
              <div className="w-2 h-2 rounded-full bg-slate-400" />
              <span className="text-xs font-semibold text-slate-500">Not connected</span>
            </div>
          )}
        </div>
      </div>

      {connState === "idle" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Start a session */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center">
                <ScreenShare className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Share Your Screen</h3>
                <p className="text-xs text-slate-500">Generate a code and invite a support agent</p>
              </div>
            </div>
            <div className="mb-5">
              <p className="text-xs text-slate-500 mb-2">Your session code:</p>
              <SessionCode code={sessionCode} />
            </div>
            <div className="space-y-3 mb-5">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Stream Settings</p>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-700">Video stream</span>
                  <span className="text-xs text-slate-400">4K · 50fps</span>
                </div>
                <button onClick={() => setShareVideo(v => !v)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${shareVideo ? "bg-sky-500" : "bg-slate-200"}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${shareVideo ? "right-0.5" : "left-0.5"}`} />
                </button>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-700">Audio</span>
                </div>
                <button onClick={() => setShareAudio(a => !a)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${shareAudio ? "bg-sky-500" : "bg-slate-200"}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${shareAudio ? "right-0.5" : "left-0.5"}`} />
                </button>
              </div>
            </div>
            <button onClick={connect}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-semibold text-sm hover:from-sky-400 hover:to-indigo-400 transition-all shadow-md shadow-sky-200">
              <ScreenShare className="w-4 h-4" />
              Start Sharing
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Join a session */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center">
                <Users className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Join a Session</h3>
                <p className="text-xs text-slate-500">Enter a session code to connect as agent</p>
              </div>
            </div>
            <div className="space-y-3 mb-5">
              <input
                type="text" placeholder="XXX-XXX-XXX" value={joinCode}
                onChange={e => setJoinCode(e.target.value.replace(/[^0-9]/g, "").replace(/(\d{3})(\d{3})?(\d{3})?/, (_, a, b, c) => [a, b, c].filter(Boolean).join("-")))}
                maxLength={11}
                className="w-full font-mono text-2xl font-bold tracking-[0.3em] text-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-slate-800 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 placeholder:text-slate-300 placeholder:tracking-normal placeholder:text-base placeholder:font-normal"
              />
            </div>
            <button onClick={connect} disabled={joinCode.length < 11}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-sm hover:from-violet-500 hover:to-indigo-500 transition-all shadow-md shadow-violet-200 disabled:opacity-40">
              <ArrowRight className="w-4 h-4" />
              Connect to Session
            </button>

            {/* Feature highlights */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { icon: Shield, label: "E2E Encrypted", color: "text-emerald-600", bg: "bg-emerald-50" },
                { icon: Eye, label: "Audit Logged", color: "text-sky-600", bg: "bg-sky-50" },
                { icon: Zap, label: "50 FPS · 4K", color: "text-amber-600", bg: "bg-amber-50" },
              ].map(f => (
                <div key={f.label} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl ${f.bg} border border-transparent`}>
                  <f.icon className={`w-4 h-4 ${f.color}`} />
                  <span className={`text-[11px] font-semibold text-center ${f.color}`}>{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {(connState === "connected" || connState === "sleep") && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Main screen area */}
          <div className="xl:col-span-2 space-y-3">
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              {/* Toolbar */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-1.5">
                  {permissionPresets.map(p => (
                    <button key={p.id} onClick={() => setControlMode(p.id as ControlMode)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                        controlMode === p.id ? `${p.bg} ${p.border} ${p.color}` : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}>
                      <p.icon className="w-3.5 h-3.5" />
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {shareVideo && (
                    <button onClick={() => setShareVideo(false)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 transition-colors">
                      <VideoOff className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => setShowFullscreen(true)} className="text-slate-400 hover:text-slate-700 transition-colors">
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {/* Screen */}
              <div className="h-[340px] p-3">
                <MockScreen screenIdx={screenIdx} controlMode={controlMode} isSleep={connState === "sleep"} />
              </div>
              {/* Control mode desc */}
              <div className={`mx-3 mb-3 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${
                controlMode === "observe" ? "bg-sky-50 border-sky-200 text-sky-700"
                : controlMode === "guide" ? "bg-violet-50 border-violet-200 text-violet-700"
                : "bg-rose-50 border-rose-200 text-rose-700"
              }`}>
                <Info className="w-3.5 h-3.5 shrink-0" />
                {permissionPresets.find(p => p.id === controlMode)?.desc}
              </div>
            </div>

            {/* Sleep / controls */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={enterSleep}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all shadow-sm">
                <Moon className="w-4 h-4" />
                Sleep Mode
              </button>
              <button onClick={disconnect}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 font-semibold text-sm hover:bg-red-100 transition-all shadow-sm">
                <PhoneOff className="w-4 h-4" />
                End Session
              </button>
            </div>
          </div>

          {/* Side panel */}
          <div className="space-y-4">
            {/* Session info */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Session Details</p>
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Code</span>
                  <span className="font-mono font-bold text-slate-900">{sessionCode}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Duration</span>
                  <span className="font-mono font-bold text-slate-900">{fmtTime(elapsed)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Quality</span>
                  <span className="font-semibold text-emerald-600">4K · 50fps</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Encryption</span>
                  <span className="font-semibold text-emerald-600">AES-256 E2E</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Mode</span>
                  <span className={`font-semibold capitalize ${controlMode === "control" ? "text-rose-600" : controlMode === "guide" ? "text-violet-600" : "text-sky-600"}`}>
                    {controlMode}
                  </span>
                </div>
              </div>
            </div>

            {/* Activity log */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Session Log</p>
              <div className="space-y-2.5 max-h-48 overflow-y-auto">
                {activeLog.map((entry, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="font-mono text-[10px] text-slate-400 shrink-0 mt-0.5 w-14">{entry.time}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700 leading-snug">{entry.action}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <LogTypeBadge type={entry.type} />
                        <span className="text-[10px] text-slate-400">{entry.user}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {connState === "connecting" && (
        <div className="flex flex-col items-center justify-center py-24 gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-sky-100 border-t-sky-500 animate-spin" />
            <Monitor className="absolute inset-0 m-auto w-8 h-8 text-sky-500" />
          </div>
          <div className="text-center">
            <p className="font-bold text-slate-900 text-lg">Establishing secure connection...</p>
            <p className="text-slate-500 text-sm mt-1">Negotiating E2E encryption · Allocating 4K stream</p>
          </div>
        </div>
      )}

      {/* Sleep overlay */}
      <AnimatePresence>
        {isSleeping && <SleepScreen onWake={wake} />}
      </AnimatePresence>

      {/* Next steps panel */}
      <AnimatePresence>
        {nextStepsSummary && (
          <NextStepsPanel summary={nextStepsSummary} onDismiss={() => setNextStepsSummary(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
