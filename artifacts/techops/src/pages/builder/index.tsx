import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Blocks, Plus, Trash2, Copy, Check, Eye, EyeOff, Key,
  ExternalLink, Globe, Code2, Rocket, Clock, RefreshCw, AlertCircle,
  Terminal, CheckCircle, XCircle, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const API = "/api";

interface ApiKey {
  id: number;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  revoked: boolean;
  createdAt: string;
}

interface Project {
  id: number;
  name: string;
  slug: string;
  type: string;
  status: string;
  previewUrl: string | null;
  deployedAt: string | null;
  updatedAt: string;
}

interface Deployment {
  id: number;
  version: number;
  status: string;
  deployedUrl: string | null;
  triggeredBy: string;
  createdAt: string;
  completedAt: string | null;
}

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="sm" onClick={copy} className="h-7 gap-1.5 text-xs">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  return (
    <div className="relative">
      <div className="absolute top-2 right-2 flex items-center gap-1">
        <span className="text-[10px] text-slate-400 uppercase tracking-wider">{lang}</span>
        <CopyButton value={code} />
      </div>
      <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 text-xs overflow-x-auto leading-relaxed pr-24">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function ApiKeysTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newKeyName, setNewKeyName] = useState("");
  const [expiry, setExpiry] = useState("never");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery<{ keys: ApiKey[] }>({
    queryKey: ["/api/builder/api-keys"],
    queryFn: () => fetch(`${API}/builder/api-keys`, { credentials: "include" }).then(r => r.json()),
  });

  const createKey = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { name: newKeyName };
      if (expiry !== "never") body.expiresInDays = parseInt(expiry, 10);
      const res = await fetch(`${API}/builder/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create key");
      return res.json();
    },
    onSuccess: (data) => {
      setRevealedKey(data.key);
      setShowKey(true);
      setOpen(false);
      setNewKeyName("");
      qc.invalidateQueries({ queryKey: ["/api/builder/api-keys"] });
    },
    onError: () => toast({ title: "Failed to create API key", variant: "destructive" }),
  });

  const revokeKey = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API}/builder/api-keys/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to revoke");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Key revoked" });
      qc.invalidateQueries({ queryKey: ["/api/builder/api-keys"] });
    },
    onError: () => toast({ title: "Failed to revoke key", variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      {revealedKey && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-green-800 mb-1">API key created — copy it now</p>
                <p className="text-xs text-green-700 mb-3">This key will not be shown again after you dismiss this notice.</p>
                <div className="flex items-center gap-2 bg-white rounded-lg border border-green-200 px-3 py-2">
                  <code className="text-xs font-mono flex-1 truncate text-slate-800">
                    {showKey ? revealedKey : "tk_" + "•".repeat(40)}
                  </code>
                  <button onClick={() => setShowKey(s => !s)} className="text-slate-400 hover:text-slate-700">
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <CopyButton value={revealedKey} />
                </div>
              </div>
              <button onClick={() => setRevealedKey(null)} className="text-green-600 hover:text-green-800 text-xs">Dismiss</button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">API Keys</h3>
          <p className="text-xs text-slate-500 mt-0.5">Use these keys to authenticate b-stage with the tech-ops API.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
              <Plus className="w-3.5 h-3.5" /> New Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-xs text-slate-600 mb-1.5 block">Key name</Label>
                <Input
                  placeholder="e.g. b-stage production"
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600 mb-1.5 block">Expires</Label>
                <Select value={expiry} onValueChange={setExpiry}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => createKey.mutate()}
                disabled={!newKeyName.trim() || createKey.isPending}
              >
                {createKey.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Key
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-24">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : data?.keys.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Key className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No API keys yet. Create one to connect b-stage.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data?.keys.map(key => (
            <div key={key.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <Key className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-800 truncate">{key.name}</p>
                  {key.revoked && <Badge variant="destructive" className="text-[10px] py-0">Revoked</Badge>}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <code className="text-[11px] text-slate-500 font-mono">{key.keyPrefix}···</code>
                  {key.lastUsedAt && (
                    <span className="text-[11px] text-slate-400">
                      Last used {new Date(key.lastUsedAt).toLocaleDateString()}
                    </span>
                  )}
                  {key.expiresAt && (
                    <span className="text-[11px] text-slate-400">
                      Expires {new Date(key.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              {!key.revoked && (
                <Button
                  variant="ghost" size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7"
                  onClick={() => revokeKey.mutate(key.id)}
                  disabled={revokeKey.isPending}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<number | null>(null);

  const { data: projectsData } = useQuery<{ projects: Project[] }>({
    queryKey: ["/api/hosting/projects"],
    queryFn: () => fetch(`${API}/hosting/projects`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: deploymentsData } = useQuery<{ deployments: Deployment[] }>({
    queryKey: ["/api/builder/projects", selectedProject, "deployments"],
    queryFn: () => fetch(`${API}/builder/projects/${selectedProject}/deployments`, { credentials: "include" }).then(r => r.json()),
    enabled: !!selectedProject,
  });

  const deploy = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API}/builder/projects/${id}/deploy`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Deploy failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Deployment started", description: data.message });
      qc.invalidateQueries({ queryKey: ["/api/hosting/projects"] });
      if (selectedProject) qc.invalidateQueries({ queryKey: ["/api/builder/projects", selectedProject, "deployments"] });
    },
    onError: (err: Error) => toast({ title: "Deploy failed", description: err.message, variant: "destructive" }),
  });

  const statusColor = (s: string) => {
    if (s === "live" || s === "deployed") return "bg-green-100 text-green-700";
    if (s === "building") return "bg-blue-100 text-blue-700";
    if (s === "draft") return "bg-slate-100 text-slate-600";
    if (s === "failed") return "bg-red-100 text-red-700";
    return "bg-amber-100 text-amber-700";
  };

  const statusIcon = (s: string) => {
    if (s === "live" || s === "deployed") return <CheckCircle className="w-3.5 h-3.5" />;
    if (s === "building") return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
    if (s === "failed") return <XCircle className="w-3.5 h-3.5" />;
    return <Clock className="w-3.5 h-3.5" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">Projects</h3>
        <p className="text-xs text-slate-500 mt-0.5">All projects managed from b-stage or the Site Builder.</p>
      </div>

      {!projectsData?.projects?.length ? (
        <div className="text-center py-12 text-slate-400">
          <Globe className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No projects yet. Create one from the Site Builder or b-stage.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projectsData.projects.map(proj => (
            <div
              key={proj.id}
              className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${selectedProject === proj.id ? "border-indigo-300 ring-1 ring-indigo-200" : "border-slate-200"}`}
            >
              <div className="flex items-center gap-3 p-4">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <Globe className="w-4.5 h-4.5 text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800 truncate">{proj.name}</p>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColor(proj.status)}`}>
                      {statusIcon(proj.status)} {proj.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <code className="text-[11px] text-slate-500">/{proj.slug}</code>
                    {proj.previewUrl && (
                      <a href={proj.previewUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] text-indigo-500 hover:text-indigo-700 flex items-center gap-0.5">
                        <ExternalLink className="w-2.5 h-2.5" /> Preview
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost" size="sm"
                    className="h-7 text-xs text-slate-500"
                    onClick={() => setSelectedProject(selectedProject === proj.id ? null : proj.id)}
                  >
                    History
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
                    onClick={() => deploy.mutate(proj.id)}
                    disabled={deploy.isPending}
                  >
                    <Rocket className="w-3 h-3" />
                    Deploy
                  </Button>
                </div>
              </div>

              {selectedProject === proj.id && (
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Deployment History</p>
                  {!deploymentsData?.deployments?.length ? (
                    <p className="text-xs text-slate-400">No deployments yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {deploymentsData.deployments.map(d => (
                        <div key={d.id} className="flex items-center gap-2 text-xs">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColor(d.status)}`}>
                            {statusIcon(d.status)} {d.status}
                          </span>
                          <span className="text-slate-500">v{d.version}</span>
                          <span className="text-slate-400">{new Date(d.createdAt).toLocaleString()}</span>
                          <span className="text-slate-400 capitalize">· {d.triggeredBy.replace("_", " ")}</span>
                          {d.deployedUrl && (
                            <a href={d.deployedUrl} target="_blank" rel="noopener noreferrer"
                              className="text-indigo-500 hover:text-indigo-700 flex items-center gap-0.5 ml-auto">
                              <ExternalLink className="w-3 h-3" /> View
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ApiDocsTab() {
  const apiBase = window.location.origin.replace(/:\d+/, ":8080").replace(window.location.pathname, "");
  const techOpsApi = "https://[your-techops-domain]/api";

  const createProjectExample = `fetch("${techOpsApi}/hosting/projects", {
  method: "POST",
  headers: {
    "Authorization": "Bearer tk_YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    name: "My Website",
    slug: "my-website",
    type: "web",
    description: "Built with b-stage"
  })
})`;

  const saveContentExample = `fetch("${techOpsApi}/builder/projects/PROJECT_ID/content", {
  method: "PUT",
  headers: {
    "Authorization": "Bearer tk_YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    html: "<html>...</html>",
    css: "body { ... }",
    js: "console.log('loaded')",
    pageName: "index",
    config: { title: "My Site", theme: "dark" }
  })
})`;

  const deployExample = `fetch("${techOpsApi}/builder/projects/PROJECT_ID/deploy", {
  method: "POST",
  headers: {
    "Authorization": "Bearer tk_YOUR_API_KEY"
  }
})`;

  const domainExample = `fetch("${techOpsApi}/hosting/domains", {
  method: "POST",
  headers: {
    "Authorization": "Bearer tk_YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    domain: "martinpmo.com",
    projectId: PROJECT_ID,
    registrar: "Google Cloud DNS"
  })
})`;

  const endpoints = [
    { method: "GET",    path: "/api/hosting/projects",                   desc: "List all your projects" },
    { method: "POST",   path: "/api/hosting/projects",                   desc: "Create a new project" },
    { method: "GET",    path: "/api/hosting/projects/:id",               desc: "Get a project with its domains" },
    { method: "PATCH",  path: "/api/hosting/projects/:id",               desc: "Update project settings" },
    { method: "DELETE", path: "/api/hosting/projects/:id",               desc: "Delete a project" },
    { method: "GET",    path: "/api/builder/projects/:id/content",       desc: "Get all pages/content for a project" },
    { method: "PUT",    path: "/api/builder/projects/:id/content",       desc: "Save/update page content (HTML, CSS, JS)" },
    { method: "POST",   path: "/api/builder/projects/:id/deploy",        desc: "Trigger a live deployment" },
    { method: "GET",    path: "/api/builder/projects/:id/deployments",   desc: "Get deployment history" },
    { method: "GET",    path: "/api/hosting/domains",                    desc: "List all domains" },
    { method: "POST",   path: "/api/hosting/domains",                    desc: "Add a custom domain" },
    { method: "POST",   path: "/api/hosting/domains/:id/verify",         desc: "Verify domain ownership" },
    { method: "DELETE", path: "/api/hosting/domains/:id",                desc: "Remove a domain" },
    { method: "GET",    path: "/api/builder/api-keys",                   desc: "List your API keys" },
    { method: "POST",   path: "/api/builder/api-keys",                   desc: "Create a new API key" },
    { method: "DELETE", path: "/api/builder/api-keys/:id",               desc: "Revoke an API key" },
  ];

  const methodColor = (m: string) => {
    if (m === "GET")    return "bg-blue-100 text-blue-700";
    if (m === "POST")   return "bg-green-100 text-green-700";
    if (m === "PATCH")  return "bg-amber-100 text-amber-700";
    if (m === "PUT")    return "bg-amber-100 text-amber-700";
    if (m === "DELETE") return "bg-red-100 text-red-700";
    return "bg-slate-100 text-slate-600";
  };

  return (
    <div className="space-y-8">
      <Card className="border-indigo-100 bg-indigo-50/50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <Terminal className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-indigo-900 mb-1">Base URL</p>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono text-indigo-800 bg-indigo-100 px-2 py-1 rounded">{techOpsApi}</code>
                <CopyButton value={techOpsApi} />
              </div>
              <p className="text-xs text-indigo-600 mt-2">
                All requests must include: <code className="bg-indigo-100 px-1 rounded">Authorization: Bearer tk_YOUR_API_KEY</code>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3">All Endpoints</h3>
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          {endpoints.map((ep, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-2.5 text-xs ${i % 2 === 0 ? "bg-white" : "bg-slate-50"} ${i < endpoints.length - 1 ? "border-b border-slate-100" : ""}`}>
              <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${methodColor(ep.method)}`}>{ep.method}</span>
              <code className="text-slate-700 font-mono truncate flex-1">{ep.path}</code>
              <span className="text-slate-400 shrink-0 hidden sm:block">{ep.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Integration Examples</h3>
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">1</span>
              Create a project
            </p>
            <CodeBlock code={createProjectExample} lang="js" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">2</span>
              Save website content
            </p>
            <CodeBlock code={saveContentExample} lang="js" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">3</span>
              Deploy to production
            </p>
            <CodeBlock code={deployExample} lang="js" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">4</span>
              Link a custom domain
            </p>
            <CodeBlock code={domainExample} lang="js" />
          </div>
        </div>
      </div>

      <Card className="border-amber-100 bg-amber-50/50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-800 space-y-1">
              <p className="font-semibold">CORS & Authentication</p>
              <p>The API accepts cross-origin requests from any domain. Use API keys (not session cookies) for all b-stage → tech-ops requests. Keys are passed in the <code className="bg-amber-100 px-1 rounded">Authorization</code> header and never expire unless you set a date.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function BuilderConnect() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0">
          <Blocks className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">B-Stage Connect</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage your b-stage integration — create API keys, track deployments, and view the full API reference.
          </p>
        </div>
      </div>

      <Tabs defaultValue="keys" className="space-y-4">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="keys" className="gap-1.5 text-xs">
            <Key className="w-3.5 h-3.5" /> API Keys
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-1.5 text-xs">
            <Globe className="w-3.5 h-3.5" /> Projects
          </TabsTrigger>
          <TabsTrigger value="docs" className="gap-1.5 text-xs">
            <Code2 className="w-3.5 h-3.5" /> API Reference
          </TabsTrigger>
        </TabsList>

        <TabsContent value="keys">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="pt-6">
              <ApiKeysTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="pt-6">
              <ProjectsTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="pt-6">
              <ApiDocsTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
