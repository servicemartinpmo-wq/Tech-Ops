import { useState, useRef, useCallback } from "react";
import { Card, Badge, Button } from "@/components/ui";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor, Shield, Eye, Edit, Terminal, Wifi, Lock, Unlock,
  Play, Square, Clock, CheckCircle2, AlertTriangle, Activity,
  Vault, KeyRound, EyeOff, RefreshCw, AlertCircle, X
} from "lucide-react";
import { useApiBase } from "@/hooks/use-api-base";
import { Link } from "wouter";

const permissionPresets = [
  { id: "readonly", label: "Read-only Observer", desc: "View screen only — no interaction allowed", icon: Eye, level: "low" },
  { id: "guided", label: "Guided Fix Mode", desc: "Highlight and annotate — limited interaction", icon: Edit, level: "medium" },
  { id: "trusted", label: "Trusted Agent", desc: "Approved actions within defined boundaries", icon: Shield, level: "high" },
  { id: "full", label: "Full Access", desc: "Complete control of the session", icon: Terminal, level: "critical" },
];

const permissionCategories = [
  { id: "fs_read", label: "File System Read", description: "View files and directories" },
  { id: "fs_write", label: "File System Write", description: "Create, modify, or delete files" },
  { id: "shell", label: "Shell Commands", description: "Execute terminal commands" },
  { id: "service", label: "Service Control", description: "Start, stop, restart services" },
  { id: "network", label: "Network Access", description: "Make network requests" },
  { id: "env", label: "Environment Variables", description: "View or modify env vars" },
];

const sessionLog = [
  { time: "14:32:01", action: "Session started", user: "Admin", type: "system" },
  { time: "14:32:15", action: "Navigated to /var/log/syslog", user: "Agent", type: "read" },
  { time: "14:33:02", action: "Viewed error logs (last 100 lines)", user: "Agent", type: "read" },
  { time: "14:34:18", action: "Permission requested: restart nginx service", user: "Agent", type: "request" },
  { time: "14:34:25", action: "Permission granted by Admin", user: "Admin", type: "grant" },
  { time: "14:34:30", action: "Service nginx restarted", user: "Agent", type: "write" },
];

function SaveToVaultModal({
  sessionLog,
  onClose,
  apiBase,
}: {
  sessionLog: Array<{ time: string; action: string; user: string; type: string }>;
  onClose: () => void;
  apiBase: string;
}) {
  const [title, setTitle] = useState(`Screen Session — ${new Date().toLocaleDateString()}`);
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!password) { setError("Password is required"); return; }
    if (password !== confirmPw) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}/api/vault/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: "screen_session",
          title,
          description: `Screen sharing session with ${sessionLog.length} logged actions`,
          content: { sessionLog, savedAt: new Date().toISOString() },
          password,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(onClose, 2000);
      } else {
        const err = await res.json();
        setError(err.error || "Failed to save to vault");
      }
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md"
      >
        <Card className="p-6 border-amber-500/20">
          {saved ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 shadow-[0_0_20px_rgba(52,211,153,0.4)]" />
              <h3 className="font-display font-bold text-white text-lg">Session Secured</h3>
              <p className="text-slate-500 text-sm mt-1">Your session log has been encrypted and stored in the vault.</p>
              <Link href="/secure-vault" className="inline-flex items-center gap-2 mt-4 text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                <Lock className="w-3.5 h-3.5" />
                View in Secure Vault
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-white">Save Session to Vault</h3>
                  <p className="text-xs text-slate-500">{sessionLog.length} actions will be encrypted</p>
                </div>
                <button onClick={onClose} className="ml-auto text-slate-600 hover:text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">Session Title</label>
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/40 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">Vault Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm pr-9 focus:outline-none focus:border-amber-500/40 transition-all"
                    />
                    <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600">
                      {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">Confirm Password</label>
                  <input
                    type={showPw ? "text" : "password"}
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/40 transition-all"
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {error}
                  </p>
                )}

                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="w-full gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  {loading ? "Encrypting..." : "Encrypt & Store in Vault"}
                </Button>
              </div>
            </>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}

export default function RemoteAssistance() {
  const apiBase = useApiBase();
  const [isSharing, setIsSharing] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("readonly");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    fs_read: true, fs_write: false, shell: false, service: false, network: false, env: false,
  });
  const [sessionActive, setSessionActive] = useState(false);
  const [showSaveToVault, setShowSaveToVault] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleStartShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsSharing(true);
      setSessionActive(true);
      stream.getVideoTracks()[0].onended = () => {
        setIsSharing(false);
        setSessionActive(false);
        streamRef.current = null;
      };
    } catch {
      console.log("Screen share cancelled");
    }
  }, []);

  const handleStopShare = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsSharing(false);
    setSessionActive(false);
  }, []);

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    const presetPerms: Record<string, Record<string, boolean>> = {
      readonly: { fs_read: true, fs_write: false, shell: false, service: false, network: false, env: false },
      guided: { fs_read: true, fs_write: false, shell: false, service: false, network: true, env: false },
      trusted: { fs_read: true, fs_write: true, shell: true, service: true, network: true, env: false },
      full: { fs_read: true, fs_write: true, shell: true, service: true, network: true, env: true },
    };
    setPermissions(presetPerms[presetId] || presetPerms.readonly);
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {showSaveToVault && (
          <SaveToVaultModal
            sessionLog={sessionLog}
            apiBase={apiBase}
            onClose={() => setShowSaveToVault(false)}
          />
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-display font-bold text-white text-glow flex items-center gap-3">
            <Monitor className="w-8 h-8 text-cyan-400" />
            Remote Assistance
          </h1>
          <p className="text-slate-500 mt-1">Secure screen sharing with granular permission controls.</p>
        </div>
        <Button
          onClick={() => setShowSaveToVault(true)}
          variant="outline"
          className="gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
        >
          <Lock className="w-4 h-4" />
          Save Session to Vault
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-white/[0.04] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isSharing ? "bg-emerald-400 pulse-dot" : "bg-slate-600"}`} />
                <span className="text-sm font-medium text-slate-300">
                  {isSharing ? "Sharing Active" : "Not Sharing"}
                </span>
                {sessionActive && (
                  <Badge variant="success" className="ml-2">Live Session</Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                {sessionActive && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    Session Token: <code className="text-cyan-400">t8k_x2f9</code>
                  </div>
                )}
                {isSharing ? (
                  <Button variant="destructive" size="sm" onClick={handleStopShare} className="gap-1.5">
                    <Square className="w-3.5 h-3.5" />
                    Stop Sharing
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleStartShare} className="gap-1.5">
                    <Play className="w-3.5 h-3.5" />
                    Start Sharing
                  </Button>
                )}
              </div>
            </div>
            <div className="bg-black aspect-video flex items-center justify-center relative">
              {isSharing ? (
                <video ref={videoRef} autoPlay muted className="w-full h-full object-contain" />
              ) : (
                <div className="text-center">
                  <Monitor className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-600 text-sm">Click "Start Sharing" to share your screen</p>
                  <p className="text-slate-700 text-xs mt-1">Uses browser's native screen capture API</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-white/[0.04]">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Session Action Log
              </h3>
            </div>
            <div className="p-4 max-h-[300px] overflow-y-auto custom-scrollbar font-mono text-xs">
              {sessionLog.map((entry, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex gap-3 py-1.5 border-b border-white/[0.02] last:border-0"
                >
                  <span className="text-slate-600 shrink-0">[{entry.time}]</span>
                  <span className={`shrink-0 ${
                    entry.type === "write" ? "text-amber-400" :
                    entry.type === "request" ? "text-purple-400" :
                    entry.type === "grant" ? "text-emerald-400" :
                    entry.type === "system" ? "text-cyan-400" :
                    "text-slate-400"
                  }`}>
                    [{entry.type.toUpperCase()}]
                  </span>
                  <span className="text-slate-300">{entry.action}</span>
                  <span className="text-slate-600 ml-auto shrink-0">— {entry.user}</span>
                </motion.div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              Permission Presets
            </h3>
            <div className="space-y-2">
              {permissionPresets.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetChange(preset.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedPreset === preset.id
                      ? "border-cyan-500/30 bg-cyan-500/5"
                      : "border-white/[0.04] hover:border-white/[0.08]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <preset.icon className={`w-4 h-4 ${selectedPreset === preset.id ? "text-cyan-400" : "text-slate-500"}`} />
                    <span className={`text-sm font-medium ${selectedPreset === preset.id ? "text-cyan-400" : "text-slate-300"}`}>
                      {preset.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 ml-6">{preset.desc}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              Individual Permissions
            </h3>
            <div className="space-y-3">
              {permissionCategories.map(perm => (
                <div key={perm.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-300">{perm.label}</p>
                    <p className="text-xs text-slate-600">{perm.description}</p>
                  </div>
                  <button
                    onClick={() => setPermissions(p => ({ ...p, [perm.id]: !p[perm.id] }))}
                    className={`w-10 h-5 rounded-full transition-colors relative ${
                      permissions[perm.id] ? "bg-cyan-500" : "bg-white/10"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform ${
                      permissions[perm.id] ? "translate-x-5" : "translate-x-0.5"
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Session Security</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400">Temporary session tokens</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400">30-minute session timeout</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400">End-to-end audit trail</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
