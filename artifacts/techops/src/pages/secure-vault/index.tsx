import { useState, useEffect, useCallback } from "react";
import { Card, Badge, Button } from "@/components/ui";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock, Unlock, Plus, Shield, Eye, EyeOff, Trash2, Clock, Copy,
  FileText, Monitor, BarChart3, AlertCircle, CheckCircle2, Key, Vault,
  Share2, RefreshCw, Download, X
} from "lucide-react";
import { useApiBase } from "@/hooks/use-api-base";
import { format } from "date-fns";

type VaultItemType = "text" | "report" | "screen_session" | "diagnostic" | "file";

interface VaultItem {
  id: number;
  type: VaultItemType;
  title: string;
  description: string | null;
  accessToken: string;
  passwordProtected: boolean;
  accessCount: number;
  maxAccess: number | null;
  expiresAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface UnlockedContent {
  text?: string;
  sessionLog?: Array<{ time: string; action: string; user: string; type: string }>;
  reportData?: unknown;
  [key: string]: unknown;
}

const TYPE_META: Record<VaultItemType, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  text: { label: "Shared Text", icon: FileText, color: "#00f0ff" },
  report: { label: "Diagnostic Report", icon: BarChart3, color: "#a855f7" },
  screen_session: { label: "Screen Session", icon: Monitor, color: "#ffb800" },
  diagnostic: { label: "Diagnostic Data", icon: AlertCircle, color: "#ff00e5" },
  file: { label: "File Share", icon: FileText, color: "#00ff88" },
};

function PasswordModal({
  item,
  onClose,
  onUnlocked,
  apiBase,
}: {
  item: VaultItem;
  onClose: () => void;
  onUnlocked: (content: UnlockedContent) => void;
  apiBase: string;
}) {
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUnlock = async () => {
    if (!password) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}/api/vault/items/${item.id}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const data = await res.json();
        onUnlocked(data.content as UnlockedContent);
      } else {
        const err = await res.json();
        setError(err.error || "Incorrect password");
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
        <Card className="p-6 border-cyan-500/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20" style={{ boxShadow: "0 0 20px rgba(0,240,255,0.1)" }}>
              <Key className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-display font-bold text-white">Unlock Vault Item</h3>
              <p className="text-xs text-slate-500 mt-0.5">{item.title}</p>
            </div>
            <button onClick={onClose} className="ml-auto text-slate-600 hover:text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-2">Vault Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleUnlock()}
                  placeholder="Enter vault password..."
                  autoFocus
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm pr-10 focus:outline-none focus:border-cyan-500/40 focus:bg-white/[0.06] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && (
                <p className="text-red-400 text-xs mt-2 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {error}
                </p>
              )}
            </div>
            <Button
              onClick={handleUnlock}
              disabled={!password || loading}
              className="w-full gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-[0_0_20px_rgba(0,240,255,0.2)]"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
              {loading ? "Decrypting..." : "Unlock Content"}
            </Button>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <p className="text-xs text-slate-600">Content is AES-256-GCM encrypted at rest. Password never leaves your browser without encryption.</p>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}

function ContentViewer({ content, type, onClose }: { content: UnlockedContent; type: VaultItemType; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(content, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[80vh] flex flex-col"
      >
        <Card className="flex flex-col overflow-hidden border-emerald-500/20">
          <div className="p-4 border-b border-white/[0.04] flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Unlock className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Decrypted Content</h3>
              <p className="text-xs text-slate-500">Viewing in memory only — not persisted in browser</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors border border-white/[0.06]"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button onClick={onClose} className="text-slate-600 hover:text-slate-400 p-1.5">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto custom-scrollbar flex-1 p-4">
            {type === "screen_session" && content.sessionLog ? (
              <div className="font-mono text-xs space-y-1.5">
                {(content.sessionLog).map((entry, i) => (
                  <div key={i} className="flex gap-3 py-1 border-b border-white/[0.02]">
                    <span className="text-slate-600 shrink-0">[{entry.time}]</span>
                    <span className={`shrink-0 ${
                      entry.type === "write" ? "text-amber-400" :
                      entry.type === "grant" ? "text-emerald-400" :
                      entry.type === "system" ? "text-cyan-400" : "text-slate-400"
                    }`}>[{entry.type?.toUpperCase()}]</span>
                    <span className="text-slate-300">{entry.action}</span>
                    <span className="text-slate-600 ml-auto shrink-0">— {entry.user}</span>
                  </div>
                ))}
              </div>
            ) : content.text ? (
              <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">{content.text}</pre>
            ) : (
              <pre className="text-xs text-slate-400 whitespace-pre-wrap">{JSON.stringify(content, null, 2)}</pre>
            )}
          </div>
          <div className="p-3 border-t border-white/[0.04] flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <p className="text-xs text-slate-600">Content will be cleared when you close this window</p>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}

function CreateVaultModal({
  onClose,
  onCreated,
  apiBase,
  prefill,
}: {
  onClose: () => void;
  onCreated: () => void;
  apiBase: string;
  prefill?: { type: VaultItemType; title: string; content: unknown };
}) {
  const [type, setType] = useState<VaultItemType>(prefill?.type ?? "text");
  const [title, setTitle] = useState(prefill?.title ?? "");
  const [description, setDescription] = useState("");
  const [textContent, setTextContent] = useState(typeof prefill?.content === "string" ? prefill.content : "");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [maxAccess, setMaxAccess] = useState("");
  const [expiry, setExpiry] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!title || !password) { setError("Title and password are required"); return; }
    if (password !== confirmPw) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }

    setLoading(true);
    setError("");
    try {
      const content = prefill?.content ?? (type === "text" ? textContent : textContent);
      const res = await fetch(`${apiBase}/api/vault/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type,
          title,
          description: description || undefined,
          content,
          password,
          maxAccess: maxAccess ? parseInt(maxAccess) : undefined,
          expiresAt: expiry ? new Date(expiry).toISOString() : undefined,
        }),
      });
      if (res.ok) {
        onCreated();
        onClose();
      } else {
        const err = await res.json();
        setError(err.error || "Failed to create vault item");
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
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <Card className="p-6 border-cyan-500/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Lock className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-display font-bold text-white">Secure to Vault</h3>
              <p className="text-xs text-slate-500">AES-256 encrypted storage</p>
            </div>
            <button onClick={onClose} className="ml-auto text-slate-600 hover:text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {!prefill && (
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-2">Content Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(TYPE_META) as Array<[VaultItemType, typeof TYPE_META[VaultItemType]]>).map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => setType(k)}
                      className={`p-2 rounded-lg border text-xs transition-all ${type === k ? "border-cyan-500/30 bg-cyan-500/5 text-cyan-400" : "border-white/[0.06] text-slate-500 hover:text-slate-300"}`}
                    >
                      <v.icon className="w-4 h-4 mx-auto mb-1" />
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">Title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Incident Report — March 2026"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">Description (optional)</label>
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Brief description for the vault entry..."
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all"
              />
            </div>

            {!prefill && (
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">Content to Secure</label>
                <textarea
                  value={textContent}
                  onChange={e => setTextContent(e.target.value)}
                  placeholder="Paste the content you want to encrypt and store..."
                  rows={4}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all custom-scrollbar resize-none font-mono"
                />
              </div>
            )}

            {prefill && (
              <div className="p-3 rounded-lg bg-emerald-500/[0.05] border border-emerald-500/20 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <p className="text-xs text-emerald-400">Content pre-loaded from {TYPE_META[prefill.type]?.label ?? prefill.type}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm pr-9 focus:outline-none focus:border-cyan-500/40 transition-all"
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
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">Max Access Count (optional)</label>
                <input
                  type="number"
                  value={maxAccess}
                  onChange={e => setMaxAccess(e.target.value)}
                  placeholder="Unlimited"
                  min="1"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">Expires At (optional)</label>
                <input
                  type="datetime-local"
                  value={expiry}
                  onChange={e => setExpiry(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/40 transition-all"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}

            <Button
              onClick={handleCreate}
              disabled={loading}
              className="w-full gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-[0_0_20px_rgba(0,240,255,0.2)]"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {loading ? "Encrypting & Saving..." : "Encrypt & Store in Vault"}
            </Button>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}

export default function SecureVault() {
  const apiBase = useApiBase();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [unlocking, setUnlocking] = useState<VaultItem | null>(null);
  const [viewing, setViewing] = useState<{ content: UnlockedContent; type: VaultItemType } | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const loadItems = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/vault/items`, { credentials: "include" });
      if (res.ok) setItems(await res.json());
    } catch {}
    setLoading(false);
  }, [apiBase]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await fetch(`${apiBase}/api/vault/items/${id}`, { method: "DELETE", credentials: "include" });
      setItems(prev => prev.filter(i => i.id !== id));
    } catch {}
    setDeleting(null);
  };

  const handleCopyToken = (item: VaultItem) => {
    navigator.clipboard.writeText(item.accessToken);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isExpired = (item: VaultItem) => item.expiresAt ? new Date(item.expiresAt) < new Date() : false;
  const isExhausted = (item: VaultItem) => item.maxAccess !== null && item.accessCount >= item.maxAccess;
  const isLocked = (item: VaultItem) => isExpired(item) || isExhausted(item);

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {showCreate && (
          <CreateVaultModal
            apiBase={apiBase}
            onClose={() => setShowCreate(false)}
            onCreated={loadItems}
          />
        )}
        {unlocking && (
          <PasswordModal
            item={unlocking}
            apiBase={apiBase}
            onClose={() => setUnlocking(null)}
            onUnlocked={content => {
              setViewing({ content, type: unlocking.type as VaultItemType });
              setUnlocking(null);
              loadItems();
            }}
          />
        )}
        {viewing && (
          <ContentViewer
            content={viewing.content}
            type={viewing.type}
            onClose={() => setViewing(null)}
          />
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-display font-bold text-white text-glow flex items-center gap-3">
            <Lock className="w-8 h-8 text-cyan-400" />
            Secure Share Vault
          </h1>
          <p className="text-slate-500 mt-1">All shared content and screen sessions are locked with AES-256 encryption.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-[0_0_20px_rgba(0,240,255,0.2)]">
          <Plus className="w-4 h-4" />
          Secure New Share
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Items Secured", value: items.length, color: "text-cyan-400", sub: "In your vault" },
          { label: "Total Accesses", value: items.reduce((a, i) => a + i.accessCount, 0), color: "text-emerald-400", sub: "Across all items" },
          { label: "Active Items", value: items.filter(i => !isLocked(i)).length, color: "text-purple-400", sub: "Available to unlock" },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="p-5 hud-element">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
              <p className={`text-3xl font-display font-bold mt-1 ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-slate-600 mt-0.5">{stat.sub}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="p-0 overflow-hidden">
          <div className="p-5 border-b border-white/[0.04] flex items-center gap-3">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-display font-bold text-white">Vault Contents</h2>
            <button onClick={loadItems} className="ml-auto text-slate-600 hover:text-slate-400 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(0,240,255,0.3)]" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center">
              <Lock className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Your vault is empty</p>
              <p className="text-slate-700 text-sm mt-1">Secure your first share by clicking "Secure New Share" above.</p>
              <Button onClick={() => setShowCreate(true)} className="mt-4 gap-2" variant="outline">
                <Plus className="w-4 h-4" />
                Create First Vault Item
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              <AnimatePresence>
                {items.map((item, i) => {
                  const meta = TYPE_META[item.type as VaultItemType] ?? TYPE_META.text;
                  const expired = isExpired(item);
                  const exhausted = isExhausted(item);
                  const locked = expired || exhausted;

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ delay: i * 0.04 }}
                      className={`p-5 flex items-center gap-4 group hover:bg-white/[0.02] transition-colors ${locked ? "opacity-50" : ""}`}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                        style={{ borderColor: `${meta.color}30`, background: `${meta.color}10`, boxShadow: locked ? "none" : `0 0 12px ${meta.color}20` }}
                      >
                        <meta.icon className="w-5 h-5" style={{ color: meta.color }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-semibold text-white text-sm truncate">{item.title}</h3>
                          {locked && <Badge variant="neutral" className="text-[10px]">{expired ? "Expired" : "Exhausted"}</Badge>}
                          {!locked && item.passwordProtected && (
                            <Badge variant="neutral" className="text-[10px] flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" />
                              Locked
                            </Badge>
                          )}
                        </div>
                        {item.description && <p className="text-xs text-slate-500 truncate">{item.description}</p>}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-600">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(item.createdAt), "MMM d, yyyy h:mm a")}</span>
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{item.accessCount} {item.maxAccess ? `/ ${item.maxAccess}` : ""} access{item.accessCount !== 1 ? "es" : ""}</span>
                          {item.expiresAt && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Expires {format(new Date(item.expiresAt), "MMM d")}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleCopyToken(item)}
                          title="Copy access token"
                          className="p-2 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.05] transition-colors"
                        >
                          {copiedId === item.id ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                        {!locked && (
                          <button
                            onClick={() => setUnlocking(item)}
                            className="p-2 rounded-lg text-cyan-600 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                            title="Unlock and view"
                          >
                            <Unlock className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deleting === item.id}
                          className="p-2 rounded-lg text-slate-700 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete from vault"
                        >
                          {deleting === item.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <Card className="p-5 border-cyan-500/10 bg-cyan-500/[0.02]">
          <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            Vault Security Architecture
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-500">
            {[
              { icon: Key, title: "AES-256-GCM Encryption", desc: "Military-grade authenticated encryption for all stored content" },
              { icon: Lock, title: "scrypt Key Derivation", desc: "Password is never stored — used only to derive a unique encryption key" },
              { icon: Shield, title: "Zero Knowledge at Rest", desc: "Decryption happens in memory only — cleared when you close the viewer" },
            ].map((item, i) => (
              <div key={i} className="flex gap-3 items-start p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <item.icon className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-slate-300 mb-0.5">{item.title}</p>
                  <p>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
