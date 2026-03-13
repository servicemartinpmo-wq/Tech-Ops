import { useState, useEffect, useCallback } from "react";
import { Card, Button } from "@/components/ui";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, BarChart3, Brain, RefreshCw, Shield, Trash2, Plus, BookOpen,
  AlertTriangle, ChevronDown, ChevronRight, Edit2, X, Check, Loader2,
  Sparkles, Code2, FileSearch, Zap, Copy, CheckCheck, Search, Crown
} from "lucide-react";
import { useApiBase } from "@/hooks/use-api-base";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@workspace/replit-auth-web";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  subscriptionTier?: string;
  caseCount?: number;
  createdAt: string;
}

interface PlatformStats {
  users: { total: number; activeThisMonth: number };
  cases: { total: number; thisMonth: number; resolved: number; avgConfidence: number };
  knowledgeBase: { nodes: number; edges: number };
  batches: { total: number; thisMonth: number };
  alerts: { total: number; unacknowledged: number };
  auditEvents: { total: number; thisMonth: number };
}

interface KBNode {
  id: number;
  title: string;
  domain: string;
  createdAt: string;
}

interface CaseRecord {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  diagnosticTier?: number;
  rootCause?: string;
  resolution?: string;
  confidenceScore?: number;
  userId: string;
  createdAt: string;
  resolvedAt?: string;
  escalated?: boolean;
  slaStatus?: string;
}

interface AiResult {
  summary: string;
  steps: string[];
  codeSnippet?: string | null;
  language?: string | null;
  confidence?: string;
}

type Tab = "overview" | "users" | "cases" | "fix-studio" | "kb";

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripMd(t: string) {
  return t
    .replace(/#{1,6}\s+/g, "").replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    .replace(/_{1,3}([^_]+)_{1,3}/g, "$1").replace(/`{1,3}([^`]+)`{1,3}/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "").replace(/>\s+/g, "").trim();
}

const TIER_PILL: Record<string, string> = {
  free:         "bg-slate-100 text-slate-500 border-slate-200",
  starter:      "bg-sky-50 text-sky-600 border-sky-200",
  professional: "bg-violet-50 text-violet-600 border-violet-200",
  business:     "bg-emerald-50 text-emerald-600 border-emerald-200",
  enterprise:   "bg-amber-50 text-amber-700 border-amber-200",
};

const STATUS_PILL: Record<string, string> = {
  open:          "bg-sky-50 text-sky-600 border-sky-200",
  resolved:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  "in-progress": "bg-violet-50 text-violet-600 border-violet-200",
  closed:        "bg-slate-100 text-slate-500 border-slate-200",
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <Card className="p-5 bg-white border border-slate-100">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-display font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </Card>
  );
}

function UserRow({
  user, currentUserId, apiBase,
  onRefresh, toast,
}: { user: AdminUser; currentUserId?: string; apiBase: string; onRefresh: () => void; toast: (t: { title: string; variant?: "destructive" }) => void }) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ firstName: user.firstName || "", lastName: user.lastName || "", email: user.email || "" });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const initials = [user.firstName, user.lastName].filter(Boolean).join(" ").trim().charAt(0).toUpperCase()
    || user.email?.charAt(0).toUpperCase() || "?";
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || user.id;

  const patch = async (url: string, body: object) => {
    setBusy(true);
    try {
      const r = await fetch(url, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error();
      onRefresh();
    } catch { toast({ title: "Update failed", variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const saveProfile = async () => {
    await patch(`${apiBase}/api/admin/users/${user.id}`, { firstName: form.firstName, lastName: form.lastName, email: form.email });
    setEditing(false);
  };

  const deleteUser = async () => {
    setBusy(true);
    try {
      await fetch(`${apiBase}/api/admin/users/${user.id}`, { method: "DELETE", credentials: "include" });
      onRefresh();
      toast({ title: "User removed" });
    } catch { toast({ title: "Delete failed", variant: "destructive" }); setBusy(false); }
  };

  const isSelf = user.id === currentUserId;

  return (
    <div className="border border-slate-100 rounded-xl p-4 bg-white hover:border-slate-200 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-sm font-bold text-indigo-600 shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2 mb-2">
              <div className="grid grid-cols-2 gap-2">
                <input value={form.firstName} placeholder="First name"
                  onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400 bg-white" />
                <input value={form.lastName} placeholder="Last name"
                  onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400 bg-white" />
              </div>
              <input value={form.email} placeholder="Email"
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400 bg-white" />
              <div className="flex gap-2">
                <button onClick={() => void saveProfile()} disabled={busy}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
                </button>
                <button onClick={() => { setEditing(false); setForm({ firstName: user.firstName || "", lastName: user.lastName || "", email: user.email || "" }); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors">
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-semibold text-slate-800 truncate">{displayName}</p>
              {isSelf && <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded font-medium">You</span>}
            </div>
          )}
          {!editing && user.email && displayName !== user.email && (
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${TIER_PILL[user.subscriptionTier || "free"] || TIER_PILL.free}`}>
              {user.subscriptionTier || "free"}
            </span>
            {(user.caseCount ?? 0) > 0 && (
              <span className="text-[11px] text-slate-400">{user.caseCount} ticket{user.caseCount !== 1 ? "s" : ""}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select value={user.role}
            onChange={e => void patch(`${apiBase}/api/admin/users/${user.id}/role`, { role: e.target.value })}
            disabled={busy || isSelf}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 focus:outline-none focus:border-indigo-400 disabled:opacity-40">
            <option value="viewer">Viewer</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <select value={user.subscriptionTier || "free"}
            onChange={e => void patch(`${apiBase}/api/admin/users/${user.id}/tier`, { tier: e.target.value })}
            disabled={busy}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 focus:outline-none focus:border-indigo-400 disabled:opacity-40">
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="professional">Professional</option>
            <option value="business">Business</option>
            <option value="enterprise">Enterprise</option>
          </select>
          {!editing && (
            <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {!isSelf && (
            confirmDelete ? (
              <div className="flex items-center gap-1">
                <button onClick={() => void deleteUser()} disabled={busy}
                  className="p-1.5 rounded-lg bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 transition-colors">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setConfirmDelete(false)} className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function CaseRecordRow({ record }: { record: CaseRecord }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden bg-white hover:border-slate-200 transition-colors">
      <button onClick={() => setExpanded(v => !v)} className="w-full flex items-center gap-3 p-4 text-left">
        <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0`}>#{record.id}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{record.title}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_PILL[record.status] || STATUS_PILL.open}`}>{record.status}</span>
            {record.diagnosticTier && <span className="text-[10px] text-slate-400">Tier {record.diagnosticTier}</span>}
            {record.confidenceScore != null && (
              <span className={`text-[10px] font-medium ${record.confidenceScore >= 75 ? "text-emerald-600" : record.confidenceScore >= 50 ? "text-amber-500" : "text-slate-400"}`}>
                {record.confidenceScore}% confidence
              </span>
            )}
          </div>
        </div>
        <span className="text-xs text-slate-400 shrink-0">{new Date(record.createdAt).toLocaleDateString()}</span>
        <ChevronRight className={`w-4 h-4 text-slate-300 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 border-t border-slate-100 pt-4 space-y-3">
              {record.description && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">What the user described</p>
                  <p className="text-sm text-slate-600">{record.description}</p>
                </div>
              )}
              {record.rootCause && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Root Cause</p>
                  <p className="text-sm text-slate-700 bg-red-50 border border-red-100 rounded-lg p-3">{stripMd(record.rootCause)}</p>
                </div>
              )}
              {record.resolution && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Resolution Applied</p>
                  <p className="text-sm text-slate-700 bg-emerald-50 border border-emerald-100 rounded-lg p-3">{stripMd(record.resolution)}</p>
                </div>
              )}
              {!record.rootCause && !record.resolution && (
                <p className="text-sm text-slate-400 italic">No diagnosis data yet — run the Apphia Pipeline on this ticket to generate a root cause and resolution.</p>
              )}
              <div className="flex items-center gap-4 pt-1 text-xs text-slate-400">
                {record.resolvedAt && <span>Resolved {new Date(record.resolvedAt).toLocaleDateString()}</span>}
                {record.escalated && <span className="text-amber-500 font-medium">Escalated</span>}
                {record.slaStatus && <span>SLA: {record.slaStatus.replace("_", " ")}</span>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const apiBase = useApiBase();
  const { toast } = useToast();
  const { user } = useAuth();

  const [tab, setTab] = useState<Tab>("overview");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [kbNodes, setKbNodes] = useState<KBNode[]>([]);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [caseSearch, setCaseSearch] = useState("");

  // KB
  const [newNode, setNewNode] = useState({ title: "", content: "", domain: "", tags: "" });
  const [addingNode, setAddingNode] = useState(false);

  // Add User modal
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", firstName: "", lastName: "", password: "", role: "user", tier: "free" });
  const [addingUser, setAddingUser] = useState(false);

  // Fix Studio
  const [issue, setIssue] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [copied, setCopied] = useState(false);

  // ── Loaders ──────────────────────────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${apiBase}/api/admin/stats`, { credentials: "include" });
      if (r.status === 403) { setAccessDenied(true); return; }
      if (r.ok) setStats(await r.json());
    } finally { setLoading(false); }
  }, [apiBase]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${apiBase}/api/admin/users?limit=200`, { credentials: "include" });
      if (r.status === 403) { setAccessDenied(true); return; }
      if (r.ok) {
        const data = await r.json();
        setUsers(Array.isArray(data) ? data : data.data || []);
      }
    } finally { setLoading(false); }
  }, [apiBase]);

  const loadKB = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${apiBase}/api/admin/kb?limit=100`, { credentials: "include" });
      if (r.ok) setKbNodes(await r.json());
    } finally { setLoading(false); }
  }, [apiBase]);

  const loadCases = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${apiBase}/api/admin/case-intelligence?limit=200`, { credentials: "include" });
      if (r.ok) {
        const data = await r.json();
        setCases(data.data || []);
      }
    } finally { setLoading(false); }
  }, [apiBase]);

  useEffect(() => {
    if (tab === "overview") void loadStats();
    else if (tab === "users") void loadUsers();
    else if (tab === "kb") void loadKB();
    else if (tab === "cases") void loadCases();
  }, [tab, loadStats, loadUsers, loadKB, loadCases]);

  // ── Add User ──────────────────────────────────────────────────────────────────

  const addUser = async () => {
    if (!newUser.email.trim()) return;
    setAddingUser(true);
    try {
      const r = await fetch(`${apiBase}/api/admin/users`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      const body = await r.json();
      if (!r.ok) { toast({ title: body.error || "Failed to add user", variant: "destructive" }); return; }
      setNewUser({ email: "", firstName: "", lastName: "", password: "", role: "user", tier: "free" });
      setShowAddUser(false);
      await loadUsers();
      toast({ title: "User added" });
    } catch { toast({ title: "Failed to add user", variant: "destructive" }); }
    finally { setAddingUser(false); }
  };

  // ── KB ────────────────────────────────────────────────────────────────────────

  const addKBNode = async () => {
    if (!newNode.title.trim() || !newNode.content.trim() || !newNode.domain.trim()) return;
    setAddingNode(true);
    try {
      const r = await fetch(`${apiBase}/api/admin/kb`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newNode.title.trim(), content: newNode.content.trim(), domain: newNode.domain.trim(), tags: newNode.tags ? newNode.tags.split(",").map(t => t.trim()) : [] }),
      });
      if (!r.ok) throw new Error();
      setNewNode({ title: "", content: "", domain: "", tags: "" });
      await loadKB();
      toast({ title: "KB article added" });
    } catch { toast({ title: "Failed to add article", variant: "destructive" }); }
    finally { setAddingNode(false); }
  };

  const deleteKBNode = async (id: number) => {
    await fetch(`${apiBase}/api/admin/kb/${id}`, { method: "DELETE", credentials: "include" });
    setKbNodes(ns => ns.filter(n => n.id !== id));
    toast({ title: "Article removed" });
  };

  // ── Fix Studio ────────────────────────────────────────────────────────────────

  const runAiAssist = async () => {
    if (!issue.trim()) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const r = await fetch(`${apiBase}/api/admin/ai-assist`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue: issue.trim(), context: extraContext.trim() }),
      });
      if (!r.ok) throw new Error();
      const { result } = await r.json();
      setAiResult(result);
    } catch { toast({ title: "Could not get suggestions — try again", variant: "destructive" }); }
    finally { setAiLoading(false); }
  };

  const copyCode = () => {
    if (aiResult?.codeSnippet) {
      void navigator.clipboard.writeText(aiResult.codeSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Filtered lists ────────────────────────────────────────────────────────────

  const filteredUsers = users.filter(u => {
    const q = userSearch.toLowerCase();
    return !q || (u.email || "").includes(q) || (u.firstName || "").toLowerCase().includes(q) || (u.lastName || "").toLowerCase().includes(q);
  });

  const filteredCases = cases.filter(c => {
    const q = caseSearch.toLowerCase();
    return !q || c.title.toLowerCase().includes(q) || (c.rootCause || "").toLowerCase().includes(q) || (c.resolution || "").toLowerCase().includes(q);
  });

  // ── Access denied ─────────────────────────────────────────────────────────────

  if (accessDenied) {
    return (
      <div className="max-w-lg mx-auto pt-20 text-center">
        <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-slate-500">This panel requires admin access.</p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-5 h-5 text-amber-500" />
            <h1 className="text-3xl font-display font-bold text-slate-900">Creator Panel</h1>
          </div>
          <p className="text-slate-500">Manage your platform, fix issues, and see exactly what Apphia diagnosed.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          if (tab === "overview") void loadStats();
          else if (tab === "users") void loadUsers();
          else if (tab === "kb") void loadKB();
          else if (tab === "cases") void loadCases();
        }} disabled={loading} className="flex items-center gap-2 shrink-0">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-slate-100 border border-slate-200 rounded-xl w-fit overflow-x-auto">
        {([
          ["overview",   "Overview",       BarChart3,  "text-sky-600"],
          ["users",      "Users",          Users,      "text-indigo-600"],
          ["cases",      "Case Records",   FileSearch, "text-violet-600"],
          ["fix-studio", "Fix Studio",     Sparkles,   "text-emerald-600"],
          ["kb",         "Knowledge Base", Brain,      "text-amber-600"],
        ] as const).map(([t, label, Icon, activeColor]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${tab === t ? "bg-white shadow-sm " + activeColor : "text-slate-500 hover:text-slate-700"}`}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />)}</div>
        ) : !stats ? null : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard label="Total Users" value={stats.users.total} sub={`${stats.users.activeThisMonth} new this month`} color="text-sky-600" />
              <StatCard label="Total Tickets" value={stats.cases.total} sub={`${stats.cases.thisMonth} this month`} color="text-indigo-600" />
              <StatCard label="Resolved" value={stats.cases.resolved} sub={`${stats.cases.avgConfidence}% avg confidence`} color="text-emerald-600" />
              <StatCard label="KB Articles" value={stats.knowledgeBase.nodes} sub={`${stats.knowledgeBase.edges} connections`} color="text-violet-600" />
              <StatCard label="Active Alerts" value={stats.alerts.unacknowledged} sub={`${stats.alerts.total} total`} color={stats.alerts.unacknowledged > 0 ? "text-red-500" : "text-slate-700"} />
              <StatCard label="Audit Events" value={stats.auditEvents.total} sub={`${stats.auditEvents.thisMonth} this month`} color="text-amber-600" />
            </div>
            <Card className="p-5 bg-white border border-slate-100">
              <p className="text-sm font-semibold text-slate-700 mb-1">Batch Runs</p>
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.batches.total}</p>
                  <p className="text-xs text-slate-400">All time</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-indigo-600">{stats.batches.thisMonth}</p>
                  <p className="text-xs text-slate-400">This month</p>
                </div>
              </div>
            </Card>
          </div>
        )
      )}

      {/* ── Users ── */}
      {tab === "users" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search users..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 bg-white" />
            </div>
            <button onClick={() => setShowAddUser(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors">
              <Plus className="w-4 h-4" /> Add User
            </button>
          </div>

          {/* Add User Panel */}
          <AnimatePresence>
            {showAddUser && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <Card className="p-5 bg-white border border-indigo-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Plus className="w-4 h-4 text-indigo-500" />New User</h3>
                    <button onClick={() => setShowAddUser(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {[
                      { key: "firstName", label: "First name", placeholder: "Jane" },
                      { key: "lastName",  label: "Last name",  placeholder: "Smith" },
                      { key: "email",     label: "Email *",    placeholder: "jane@company.com" },
                      { key: "password",  label: "Password",   placeholder: "Leave blank to invite later" },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <label className="text-xs text-slate-500 mb-1 block">{label}</label>
                        <input value={newUser[key as keyof typeof newUser]} placeholder={placeholder}
                          type={key === "password" ? "password" : "text"}
                          onChange={e => setNewUser(n => ({ ...n, [key]: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400 bg-white" />
                      </div>
                    ))}
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Role</label>
                      <select value={newUser.role} onChange={e => setNewUser(n => ({ ...n, role: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400 bg-white">
                        <option value="viewer">Viewer</option>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Plan</label>
                      <select value={newUser.tier} onChange={e => setNewUser(n => ({ ...n, tier: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400 bg-white">
                        <option value="free">Free</option>
                        <option value="starter">Starter</option>
                        <option value="professional">Professional</option>
                        <option value="business">Business</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>
                  </div>
                  <Button onClick={() => void addUser()} disabled={addingUser || !newUser.email.trim()} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white">
                    {addingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create User
                  </Button>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">{userSearch ? "No users match your search." : "No users found."}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 pb-1">{filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}</p>
              {filteredUsers.map(u => (
                <UserRow key={u.id} user={u} currentUserId={user?.id} apiBase={apiBase} onRefresh={() => void loadUsers()} toast={toast} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Case Records ── */}
      {tab === "cases" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={caseSearch} onChange={e => setCaseSearch(e.target.value)} placeholder="Search tickets, root causes..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-violet-400 bg-white" />
            </div>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>
          ) : filteredCases.length === 0 ? (
            <div className="text-center py-12">
              <FileSearch className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">{caseSearch ? "No tickets match your search." : "No tickets yet."}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 pb-1">{filteredCases.length} ticket{filteredCases.length !== 1 ? "s" : ""}</p>
              {filteredCases.map(c => <CaseRecordRow key={c.id} record={c} />)}
            </div>
          )}
        </div>
      )}

      {/* ── Fix Studio ── */}
      {tab === "fix-studio" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Card className="p-5 bg-white border border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Fix Studio</h3>
                  <p className="text-xs text-slate-500">Describe any problem — get clear steps and code to fix it</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">What's the problem?</label>
                  <textarea value={issue} rows={4}
                    placeholder="Example: A user on the Professional plan can't connect their Slack integration. The connection appears to save but fails silently on the settings page."
                    onChange={e => setIssue(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-400 bg-white resize-none placeholder:text-slate-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">Extra context (optional)</label>
                  <textarea value={extraContext} rows={2}
                    placeholder="Environment, recent changes, error messages, affected users..."
                    onChange={e => setExtraContext(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-400 bg-white resize-none placeholder:text-slate-400" />
                </div>
                <button onClick={() => void runAiAssist()} disabled={aiLoading || !issue.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-semibold rounded-xl transition-colors">
                  {aiLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Working on it...</> : <><Sparkles className="w-4 h-4" />Get Fix Suggestions</>}
                </button>
              </div>
            </Card>
          </div>

          <div>
            <AnimatePresence mode="wait">
              {aiLoading && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-48 gap-3">
                  <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-slate-500">Apphia is analysing the problem...</p>
                </motion.div>
              )}
              {!aiLoading && aiResult && (
                <motion.div key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <Card className="p-5 bg-white border border-slate-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-4 h-4 text-emerald-500" />
                      <p className="text-sm font-semibold text-slate-800">What's likely happening</p>
                      {aiResult.confidence && (
                        <span className={`ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full border ${aiResult.confidence === "high" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : aiResult.confidence === "medium" ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                          {aiResult.confidence} confidence
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{aiResult.summary}</p>
                  </Card>

                  {aiResult.steps.length > 0 && (
                    <Card className="p-5 bg-white border border-slate-100">
                      <p className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        Steps to fix it
                      </p>
                      <div className="space-y-2">
                        {aiResult.steps.map((step, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                            <p className="text-sm text-slate-700">{step}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {aiResult.codeSnippet && (
                    <Card className="p-5 bg-white border border-slate-100">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                          <Code2 className="w-4 h-4 text-indigo-500" />
                          {aiResult.language ? aiResult.language.toUpperCase() : "Code"}
                        </p>
                        <button onClick={copyCode} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors">
                          {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          {copied ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
                        {aiResult.codeSnippet}
                      </pre>
                    </Card>
                  )}
                </motion.div>
              )}
              {!aiLoading && !aiResult && (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-48 gap-3 text-center">
                  <Sparkles className="w-10 h-10 text-slate-200" />
                  <p className="text-sm text-slate-400">Describe the problem on the left<br />and Apphia will suggest a fix.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ── Knowledge Base ── */}
      {tab === "kb" && (
        <div className="space-y-6">
          <Card className="p-5 bg-white border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-amber-500" />Add Knowledge Article</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {[
                { key: "title",  label: "Title *",  placeholder: "How to fix VPN disconnects" },
                { key: "domain", label: "Domain *", placeholder: "networking" },
                { key: "tags",   label: "Tags",     placeholder: "vpn, tls, connectivity" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs text-slate-500 mb-1.5 block">{label}</label>
                  <input value={newNode[key as keyof typeof newNode]} placeholder={placeholder}
                    onChange={e => setNewNode(n => ({ ...n, [key]: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-400 bg-white" />
                </div>
              ))}
              <div className="md:col-span-2">
                <label className="text-xs text-slate-500 mb-1.5 block">Content *</label>
                <textarea value={newNode.content} rows={4} placeholder="Detailed knowledge base content..."
                  onChange={e => setNewNode(n => ({ ...n, content: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-400 bg-white resize-none" />
              </div>
            </div>
            <Button onClick={() => void addKBNode()} disabled={addingNode || !newNode.title || !newNode.content || !newNode.domain} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white">
              {addingNode ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Article
            </Button>
          </Card>

          <Card className="p-5 bg-white border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2"><BookOpen className="w-4 h-4 text-amber-500" />Articles ({kbNodes.length})</h3>
            {loading ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />)}</div>
            ) : kbNodes.length === 0 ? (
              <div className="text-center py-8">
                <Brain className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No knowledge articles yet.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {kbNodes.map(n => (
                  <div key={n.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                    <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 truncate font-medium">{n.title}</p>
                      <p className="text-xs text-slate-400">{n.domain} · {new Date(n.createdAt).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => void deleteKBNode(n.id)} className="text-slate-300 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
