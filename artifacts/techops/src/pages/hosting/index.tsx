import { useState, useEffect, useCallback } from "react";
import { Card, Button, Badge } from "@/components/ui";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Plus, Trash2, RefreshCw, Shield, CheckCircle2,
  AlertTriangle, Clock, Server, Code2, ExternalLink, ChevronDown, ChevronUp, Copy
} from "lucide-react";
import { useApiBase } from "@/hooks/use-api-base";
import { useToast } from "@/hooks/use-toast";

interface HostedProject {
  id: number;
  name: string;
  type: "web" | "app" | "api";
  status: "active" | "building" | "stopped" | "error";
  buildCommand?: string;
  startCommand?: string;
  publicUrl?: string;
  internalPort?: number;
  createdAt: string;
  updatedAt: string;
}

interface HostedDomain {
  id: number;
  projectId: number;
  domain: string;
  subdomain?: string;
  sslStatus: "none" | "pending" | "active" | "error";
  verificationStatus: "pending" | "verified" | "failed";
  dnsRecords?: Array<{ type: string; name: string; value: string; ttl: number }>;
}

const STATUS_STYLES: Record<string, string> = {
  active:   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  building: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  stopped:  "bg-slate-500/10 text-slate-400 border-slate-500/20",
  error:    "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  web: Globe,
  app: Code2,
  api: Server,
};

function DomainRow({ domain }: { domain: HostedDomain }) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();

  const copy = (val: string) => {
    void navigator.clipboard.writeText(val);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="border border-white/[0.06] rounded-lg overflow-hidden">
      <button onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/[0.03] transition-colors text-left">
        <div className="flex items-center gap-3">
          <Globe className="w-4 h-4 text-slate-500" />
          <span className="text-sm text-slate-300 font-mono">{domain.subdomain ? `${domain.subdomain}.${domain.domain}` : domain.domain}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${domain.sslStatus === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-500/10 text-slate-500 border-slate-500/20"}`}>
            {domain.sslStatus === "active" ? "SSL ✓" : `SSL ${domain.sslStatus}`}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${domain.verificationStatus === "verified" ? "bg-sky-500/10 text-sky-400 border-sky-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
            {domain.verificationStatus}
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      <AnimatePresence>
        {expanded && domain.dnsRecords && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-3 pb-3 space-y-2 border-t border-white/[0.04]">
              <p className="text-xs text-slate-500 pt-3 mb-2">DNS Records — configure these with your domain registrar</p>
              {domain.dnsRecords.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs font-mono bg-white/[0.02] rounded p-2">
                  <span className="text-violet-400 w-10 shrink-0">{r.type}</span>
                  <span className="text-slate-400 truncate flex-1">{r.name}</span>
                  <span className="text-slate-300 truncate flex-1">{r.value}</span>
                  <button onClick={() => copy(r.value)} className="text-slate-600 hover:text-slate-400">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProjectCard({ project, apiBase, onDelete }: {
  project: HostedProject;
  apiBase: string;
  onDelete: (id: number) => void;
}) {
  const [domains, setDomains]       = useState<HostedDomain[]>([]);
  const [domainsOpen, setDomainsOpen] = useState(false);
  const [newDomain, setNewDomain]   = useState("");
  const [addingDomain, setAddingDomain] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const { toast } = useToast();
  const Icon = TYPE_ICONS[project.type] || Globe;

  const loadDomains = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/hosting/projects/${project.id}/domains`, { credentials: "include" });
      if (res.ok) setDomains(await res.json() as HostedDomain[]);
    } catch { /* ignore */ }
  }, [apiBase, project.id]);

  useEffect(() => { if (domainsOpen) void loadDomains(); }, [domainsOpen, loadDomains]);

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;
    setAddingDomain(true);
    try {
      const res = await fetch(`${apiBase}/api/hosting/projects/${project.id}/domains`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain.trim() }),
      });
      if (!res.ok) throw new Error("Failed to add domain");
      setNewDomain("");
      await loadDomains();
      toast({ title: "Domain added", description: "Configure the DNS records shown below." });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    } finally { setAddingDomain(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await fetch(`${apiBase}/api/hosting/projects/${project.id}`, { method: "DELETE", credentials: "include" });
      onDelete(project.id);
    } finally { setDeleting(false); }
  };

  return (
    <Card className="p-6 bg-[#0d0f17] border border-white/[0.06]">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Icon className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">{project.name}</h3>
            <p className="text-xs text-slate-500 mt-0.5 uppercase">{project.type}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLES[project.status]}`}>
            {project.status}
          </span>
          {project.publicUrl && (
            <a href={project.publicUrl} target="_blank" rel="noopener noreferrer"
              className="text-slate-500 hover:text-sky-400 transition-colors">
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button onClick={handleDelete} disabled={deleting}
            className="text-slate-600 hover:text-rose-400 transition-colors disabled:opacity-40">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
        {project.buildCommand && (
          <div className="bg-white/[0.02] rounded-lg p-2.5">
            <p className="text-slate-500 mb-1">Build</p>
            <code className="text-slate-300 font-mono text-[10px]">{project.buildCommand}</code>
          </div>
        )}
        {project.startCommand && (
          <div className="bg-white/[0.02] rounded-lg p-2.5">
            <p className="text-slate-500 mb-1">Start</p>
            <code className="text-slate-300 font-mono text-[10px]">{project.startCommand}</code>
          </div>
        )}
        {project.internalPort && (
          <div className="bg-white/[0.02] rounded-lg p-2.5">
            <p className="text-slate-500 mb-1">Port</p>
            <span className="text-slate-300 font-mono">{project.internalPort}</span>
          </div>
        )}
        <div className="bg-white/[0.02] rounded-lg p-2.5">
          <p className="text-slate-500 mb-1">Created</p>
          <span className="text-slate-400">{new Date(project.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      <button onClick={() => setDomainsOpen(o => !o)}
        className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors py-2 border-t border-white/[0.04]">
        <span>Domains {domains.length > 0 && `(${domains.length})`}</span>
        {domainsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      <AnimatePresence>
        {domainsOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-3 space-y-2">
              {domains.map(d => <DomainRow key={d.id} domain={d} />)}
              <div className="flex gap-2 mt-2">
                <input value={newDomain} onChange={e => setNewDomain(e.target.value)}
                  placeholder="example.com"
                  onKeyDown={e => { if (e.key === "Enter") void handleAddDomain(); }}
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40" />
                <Button size="sm" onClick={() => void handleAddDomain()} disabled={addingDomain || !newDomain.trim()} variant="outline">
                  {addingDomain ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

type ProjectType = "web" | "app" | "api";

export default function Hosting() {
  const apiBase = useApiBase();
  const { toast } = useToast();
  const [projects, setProjects]     = useState<HostedProject[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showNew, setShowNew]       = useState(false);
  const [creating, setCreating]     = useState(false);
  const [form, setForm]             = useState({ name: "", type: "web" as ProjectType, buildCommand: "", startCommand: "", internalPort: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/hosting/projects`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json() as { projects?: HostedProject[] } | HostedProject[];
        setProjects(Array.isArray(data) ? data : (data as { projects?: HostedProject[] }).projects ?? []);
      }
    } finally { setLoading(false); }
  }, [apiBase]);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`${apiBase}/api/hosting/projects`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type,
          buildCommand: form.buildCommand || undefined,
          startCommand: form.startCommand || undefined,
          internalPort: form.internalPort ? parseInt(form.internalPort) : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create project");
      setForm({ name: "", type: "web", buildCommand: "", startCommand: "", internalPort: "" });
      setShowNew(false);
      await load();
      toast({ title: "Project created" });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    } finally { setCreating(false); }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">App & Web Hosting</h1>
          <p className="text-slate-500 mt-1">Deploy and manage hosted projects with custom domains and SSL.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => void load()} disabled={loading} size="sm" className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={() => setShowNew(s => !s)} className="flex items-center gap-2 neon-glow">
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </div>
      </motion.div>

      {/* New project form */}
      <AnimatePresence>
        {showNew && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
            <Card className="p-6 bg-[#0d0f17] border border-violet-500/20">
              <h3 className="text-sm font-semibold text-white mb-4">New Hosted Project</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Project Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="my-web-app"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as ProjectType }))}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-violet-500/40">
                    <option value="web">Web App</option>
                    <option value="app">Mobile App Backend</option>
                    <option value="api">API Server</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Build Command</label>
                  <input value={form.buildCommand} onChange={e => setForm(f => ({ ...f, buildCommand: e.target.value }))}
                    placeholder="npm run build"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Start Command</label>
                  <input value={form.startCommand} onChange={e => setForm(f => ({ ...f, startCommand: e.target.value }))}
                    placeholder="npm start"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Internal Port</label>
                  <input value={form.internalPort} onChange={e => setForm(f => ({ ...f, internalPort: e.target.value }))}
                    type="number" placeholder="3000"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/40" />
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => void handleCreate()} disabled={creating || !form.name.trim()} className="flex items-center gap-2">
                  {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create Project
                </Button>
                <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Projects", val: loading ? "—" : String(projects.length), Icon: Server, color: "text-violet-400" },
          { label: "Active", val: loading ? "—" : String(projects.filter(p => p.status === "active").length), Icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Attention Needed", val: loading ? "—" : String(projects.filter(p => p.status === "error" || p.status === "stopped").length), Icon: AlertTriangle, color: "text-amber-400" },
        ].map(({ label, val, Icon, color }) => (
          <Card key={label} className="p-4 bg-[#0d0f17] border border-white/[0.06]">
            <div className="flex items-center gap-3">
              <Icon className={`w-5 h-5 ${color}`} />
              <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{val}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Projects list */}
      {loading ? (
        <div className="space-y-4">{[...Array(2)].map((_, i) => <div key={i} className="h-40 bg-white/[0.04] rounded-xl animate-pulse" />)}</div>
      ) : projects.length === 0 ? (
        <Card className="p-16 text-center bg-[#0d0f17] border border-white/[0.06]">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8 text-violet-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No Hosted Projects</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">Create your first hosted project to start deploying apps and managing custom domains with SSL.</p>
          <Button onClick={() => setShowNew(true)} className="neon-glow">
            <Plus className="w-4 h-4 mr-2" />
            Create First Project
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} apiBase={apiBase} onDelete={id => setProjects(ps => ps.filter(x => x.id !== id))} />
          ))}
        </div>
      )}
    </div>
  );
}
