import { useState, useEffect, useCallback } from "react";
import { Card, Button, Badge } from "@/components/ui";
import { motion } from "framer-motion";
import {
  Users, BarChart3, Brain, RefreshCw, Shield, Trash2,
  Plus, ChevronDown, BookOpen, AlertTriangle, Settings
} from "lucide-react";
import { useApiBase } from "@/hooks/use-api-base";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@workspace/replit-auth-web";

interface AdminUser {
  id: string;
  email?: string;
  name?: string;
  role: string;
  tier?: string;
  createdAt: string;
}

interface PlatformStats {
  users: { total: number; byTier: Record<string, number>; byRole: Record<string, number> };
  cases: { total: number; open: number; resolved: number; breached: number };
  kb: { totalNodes: number; byDomain: Record<string, number> };
  connectors: { totalChecks: number; failures: number };
}

interface KBNode {
  id: number;
  title: string;
  domain: string;
  createdAt: string;
}

type Tab = "users" | "stats" | "kb";

const TIER_COLORS: Record<string, string> = {
  starter:      "bg-sky-500/10 text-sky-400 border-sky-500/20",
  professional: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  business:     "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  enterprise:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
  free:         "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

export default function AdminPanel() {
  const apiBase  = useApiBase();
  const { toast } = useToast();
  const { user } = useAuth();
  const [tab, setTab]               = useState<Tab>("stats");
  const [users, setUsers]           = useState<AdminUser[]>([]);
  const [stats, setStats]           = useState<PlatformStats | null>(null);
  const [kbNodes, setKbNodes]       = useState<KBNode[]>([]);
  const [loading, setLoading]       = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [newNode, setNewNode]       = useState({ title: "", content: "", domain: "", tags: "" });
  const [addingNode, setAddingNode] = useState(false);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/stats`, { credentials: "include" });
      if (res.status === 403) { setAccessDenied(true); return; }
      if (res.ok) setStats(await res.json() as PlatformStats);
    } finally { setLoading(false); }
  }, [apiBase]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/users?limit=100`, { credentials: "include" });
      if (res.status === 403) { setAccessDenied(true); return; }
      if (res.ok) setUsers(await res.json() as AdminUser[]);
    } finally { setLoading(false); }
  }, [apiBase]);

  const loadKB = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/kb?limit=50`, { credentials: "include" });
      if (res.ok) setKbNodes(await res.json() as KBNode[]);
    } finally { setLoading(false); }
  }, [apiBase]);

  useEffect(() => {
    if (tab === "stats") void loadStats();
    else if (tab === "users") void loadUsers();
    else if (tab === "kb") void loadKB();
  }, [tab, loadStats, loadUsers, loadKB]);

  const updateRole = async (userId: string, role: string) => {
    setUpdatingUser(userId);
    try {
      const res = await fetch(`${apiBase}/api/admin/users/${userId}/role`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Failed");
      await loadUsers();
      toast({ title: "Role updated" });
    } catch {
      toast({ title: "Failed to update role", variant: "destructive" });
    } finally { setUpdatingUser(null); }
  };

  const deleteKBNode = async (id: number) => {
    try {
      await fetch(`${apiBase}/api/admin/kb/${id}`, { method: "DELETE", credentials: "include" });
      setKbNodes(ns => ns.filter(n => n.id !== id));
      toast({ title: "Node deleted" });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const addKBNode = async () => {
    if (!newNode.title.trim() || !newNode.content.trim() || !newNode.domain.trim()) return;
    setAddingNode(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/kb`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newNode.title.trim(),
          content: newNode.content.trim(),
          domain: newNode.domain.trim(),
          tags: newNode.tags ? newNode.tags.split(",").map(t => t.trim()) : [],
          nodeType: "article",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setNewNode({ title: "", content: "", domain: "", tags: "" });
      await loadKB();
      toast({ title: "KB node added" });
    } catch {
      toast({ title: "Failed to add node", variant: "destructive" });
    } finally { setAddingNode(false); }
  };

  if (accessDenied) {
    return (
      <div className="max-w-lg mx-auto pt-20 text-center">
        <Shield className="w-16 h-16 text-rose-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-slate-400">This panel requires admin role. Contact your platform administrator.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Admin Panel</h1>
          <p className="text-slate-500 mt-1">Platform management — users, stats, and knowledge base administration.</p>
        </div>
        <Button variant="outline" onClick={() => {
          if (tab === "stats") void loadStats();
          else if (tab === "users") void loadUsers();
          else void loadKB();
        }} disabled={loading} size="sm" className="flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-white/[0.02] border border-white/[0.04] rounded-xl w-fit">
        {([
          ["stats",  "Platform Stats", BarChart3],
          ["users",  "Users", Users],
          ["kb",     "Knowledge Base", Brain],
        ] as const).map(([t, label, Icon]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Stats ── */}
      {tab === "stats" && (
        loading ? <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <div key={i} className="h-28 bg-white/[0.04] rounded-xl animate-pulse" />)}</div>
        : !stats ? null : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Users", val: stats.users.total, color: "text-violet-400" },
                { label: "Total Cases", val: stats.cases.total, color: "text-sky-400" },
                { label: "Open Cases", val: stats.cases.open, color: "text-amber-400" },
                { label: "KB Nodes", val: stats.kb.totalNodes, color: "text-emerald-400" },
              ].map(({ label, val, color }) => (
                <Card key={label} className="p-5 bg-[#0d0f17] border border-white/[0.06]">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{label}</p>
                  <p className={`text-3xl font-bold ${color}`}>{val}</p>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-5 bg-[#0d0f17] border border-white/[0.06]">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Users by Tier</h3>
                {Object.keys(stats.users.byTier).length === 0 ? <p className="text-xs text-slate-500">No tier data yet.</p> :
                  <div className="space-y-2">
                    {Object.entries(stats.users.byTier).map(([tier, cnt]) => (
                      <div key={tier} className="flex items-center justify-between">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${TIER_COLORS[tier] || TIER_COLORS.free}`}>{tier}</span>
                        <span className="text-sm font-bold text-white">{cnt}</span>
                      </div>
                    ))}
                  </div>}
              </Card>
              <Card className="p-5 bg-[#0d0f17] border border-white/[0.06]">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">KB by Domain</h3>
                {Object.keys(stats.kb.byDomain).length === 0 ? <p className="text-xs text-slate-500">No KB data yet.</p> :
                  <div className="space-y-2">
                    {Object.entries(stats.kb.byDomain).map(([domain, cnt]) => (
                      <div key={domain} className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                        <span className="text-xs text-slate-400">{domain}</span>
                        <span className="text-sm font-bold text-violet-400">{cnt}</span>
                      </div>
                    ))}
                  </div>}
              </Card>
            </div>
          </div>
        )
      )}

      {/* ── Users ── */}
      {tab === "users" && (
        <Card className="p-6 bg-[#0d0f17] border border-white/[0.06]">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">All Users ({users.length})</h3>
          {loading ? <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-white/[0.04] rounded-lg animate-pulse" />)}</div>
          : (
            <div className="space-y-2 max-h-[550px] overflow-y-auto custom-scrollbar">
              {users.map(u => (
                <div key={u.id} className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                  <div className="w-8 h-8 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-xs text-violet-400 font-bold shrink-0">
                    {(u.name || u.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{u.name || u.email || u.id}</p>
                    {u.email && u.name && <p className="text-xs text-slate-500 truncate">{u.email}</p>}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${TIER_COLORS[u.tier || "free"] || TIER_COLORS.free}`}>
                    {u.tier || "free"}
                  </span>
                  <select value={u.role}
                    onChange={e => void updateRole(u.id, e.target.value)}
                    disabled={updatingUser === u.id || u.id === user?.id}
                    className="text-xs bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-slate-300 focus:outline-none disabled:opacity-40">
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── KB Admin ── */}
      {tab === "kb" && (
        <div className="space-y-6">
          <Card className="p-6 bg-[#0d0f17] border border-white/[0.06]">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2"><Plus className="w-4 h-4" />Add KB Node</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {[
                { key: "title",   label: "Title *",         placeholder: "Troubleshoot VPN disconnects" },
                { key: "domain",  label: "Domain *",        placeholder: "networking" },
                { key: "tags",    label: "Tags",            placeholder: "vpn, connectivity, tls" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs text-slate-500 mb-1.5 block">{label}</label>
                  <input value={newNode[key as keyof typeof newNode]} placeholder={placeholder}
                    onChange={e => setNewNode(n => ({ ...n, [key]: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40" />
                </div>
              ))}
              <div className="md:col-span-2">
                <label className="text-xs text-slate-500 mb-1.5 block">Content *</label>
                <textarea value={newNode.content} rows={4} placeholder="Detailed knowledge base content..."
                  onChange={e => setNewNode(n => ({ ...n, content: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40 resize-none" />
              </div>
            </div>
            <Button onClick={() => void addKBNode()} disabled={addingNode || !newNode.title || !newNode.content || !newNode.domain} className="flex items-center gap-2">
              {addingNode ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Node
            </Button>
          </Card>

          <Card className="p-6 bg-[#0d0f17] border border-white/[0.06]">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2"><BookOpen className="w-4 h-4" />KB Nodes ({kbNodes.length})</h3>
            {loading ? <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-white/[0.04] rounded-lg animate-pulse" />)}</div>
            : kbNodes.length === 0 ? (
              <div className="text-center py-8">
                <Brain className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No KB nodes yet.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                {kbNodes.map(n => (
                  <div key={n.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <BookOpen className="w-4 h-4 text-slate-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300 truncate">{n.title}</p>
                      <p className="text-xs text-slate-500">{n.domain} · {new Date(n.createdAt).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => void deleteKBNode(n.id)}
                      className="text-slate-600 hover:text-rose-400 transition-colors">
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
