import { useState, useEffect } from "react";
import { Card, Button } from "@/components/ui";
import { useApiBase } from "@/hooks/use-api-base";
import { Search, BookOpen, Shield, Cloud, Server, Terminal, Layers, GitBranch, ChevronRight, CheckCircle2, XCircle, AlertCircle, BarChart3, Cpu, ThumbsUp, ThumbsDown, X, Zap, ArrowRight, Brain } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface KBEntry {
  id: string; domain: string; subdomain: string; issueType: string;
  symptoms: string[]; resolutionSteps: string[]; tier: string;
  tags: string[]; historicalSuccess: number; estimatedTime: string;
  prerequisites?: string[]; selfHealable?: boolean; escalationConditions?: string[];
}

interface DecisionStep {
  stepId: string; action: string; rationale: string;
  expectedOutcome: string; fallbackStepId: string | null;
  escalateOnFail: boolean; automated: boolean; estimatedMinutes: number;
}

interface DecisionTree {
  treeId: string; kbId: string | null; severity: string;
  issueTitle: string; steps: DecisionStep[];
  escalationPath: { level: string; slaMinutes: number; contacts: string[]; autoEscalateAfterMinutes: number };
  totalEstimatedMinutes: number;
}

interface UDI {
  udiId: string; domain: string | null; subdomain: string | null;
  symptom: string; confidenceScore: number; action: string;
  decisionReason: string; escalationLevel: string; kbId: string | null;
  resolutionSteps: string[] | null; slaLimit: number;
  severity: string; intent: string; synonymsMatched: string[]; selfHealable: boolean;
}

interface KBStats {
  totalKBEntries: number; domains: number; avgSuccessRate: number;
  selfHealableCount: number; domainBreakdown: Record<string, number>;
  monitorStats: { activeDownConnectors: number; autoCreatedCasesCount: number; monitoredConnectors: number };
  userCaseStats: { total: number; resolved: number };
}

const DOMAIN_ICONS: Record<string, React.ElementType> = {
  Networking: Server, OS: Cpu, Database: Layers, Cloud, Security: Shield, DevOps: GitBranch, Application: Terminal,
};
const DOMAIN_COLORS: Record<string, string> = {
  Networking: "#00f0ff", OS: "#a855f7", Database: "#f59e0b", Cloud: "#22d3ee",
  Security: "#ef4444", DevOps: "#10b981", Application: "#6366f1",
};

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    P1: "bg-red-500/10 text-red-400 border-red-500/20",
    P2: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    P3: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    P4: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };
  return <span className={`text-xs px-2 py-0.5 rounded border font-mono font-bold ${colors[severity] || colors.P3}`}>{severity}</span>;
}

function IntentBadge({ intent }: { intent: string }) {
  const map: Record<string, { color: string; label: string }> = {
    diagnostic: { color: "text-cyan-400 bg-cyan-500/5 border-cyan-500/15", label: "Diagnostic" },
    informational: { color: "text-slate-400 bg-slate-500/5 border-slate-500/15", label: "Informational" },
    escalation: { color: "text-red-400 bg-red-500/5 border-red-500/15", label: "Escalation" },
    monitoring: { color: "text-emerald-400 bg-emerald-500/5 border-emerald-500/15", label: "Monitoring" },
  };
  const m = map[intent] || map.diagnostic;
  return <span className={`text-xs px-2 py-0.5 rounded border ${m.color}`}>{m.label}</span>;
}

function ConfidenceMeter({ score }: { score: number }) {
  const color = score >= 75 ? "#00ff88" : score >= 50 ? "#ffb800" : "#ff3355";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color, boxShadow: `0 0 8px ${color}40` }} />
      </div>
      <span className="text-xs font-bold font-mono" style={{ color }}>{score}%</span>
    </div>
  );
}

function DecisionTreeViewer({ tree, udi }: { tree: DecisionTree; udi: UDI }) {
  const [activeStep, setActiveStep] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={tree.severity} />
          <span className="text-xs text-slate-500">~{tree.totalEstimatedMinutes} min</span>
        </div>
        <span className="text-xs text-slate-600 font-mono">{tree.treeId}</span>
      </div>
      <div className="text-xs text-amber-400/80 bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5 flex items-center gap-2">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        Escalation: {tree.escalationPath.level} · SLA {tree.escalationPath.slaMinutes}min · Auto-escalate in {tree.escalationPath.autoEscalateAfterMinutes}min
      </div>
      <div className="space-y-2">
        {tree.steps.map((step, idx) => (
          <div key={step.stepId}>
            <button
              onClick={() => setActiveStep(activeStep === step.stepId ? null : step.stepId)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${activeStep === step.stepId ? "border-cyan-500/30 bg-cyan-500/5" : "border-white/[0.05] bg-white/[0.02] hover:border-white/10"}`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${step.automated ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/[0.05] text-slate-500 border border-white/[0.06]"}`}>
                  {step.automated ? <Zap className="w-3 h-3" /> : idx + 1}
                </div>
                <span className="text-xs text-slate-300 flex-1 text-left">{step.action.length > 90 ? step.action.slice(0, 90) + "…" : step.action}</span>
                {step.escalateOnFail && <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                <ChevronRight className={`w-3.5 h-3.5 text-slate-600 transition-transform ${activeStep === step.stepId ? "rotate-90" : ""}`} />
              </div>
            </button>
            <AnimatePresence>
              {activeStep === step.stepId && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="ml-8 p-3 rounded-b-lg bg-black/20 border border-t-0 border-white/[0.04] space-y-2 text-xs">
                    <p className="text-slate-400"><span className="text-slate-600">Rationale: </span>{step.rationale}</p>
                    <p className="text-slate-400"><span className="text-slate-600">Expected: </span>{step.expectedOutcome}</p>
                    <div className="flex items-center gap-3 pt-1">
                      {step.automated && <span className="text-emerald-400 flex items-center gap-1"><Zap className="w-3 h-3" />Auto-executable</span>}
                      {step.fallbackStepId && <span className="text-slate-600">Fallback → {step.fallbackStepId}</span>}
                      {step.escalateOnFail && <span className="text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Escalate if fails</span>}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

function KBEntryDetail({ entry, onClose, apiBase }: { entry: KBEntry; onClose: () => void; apiBase: string }) {
  const [feedbackSent, setFeedbackSent] = useState<"helpful" | "not_helpful" | null>(null);
  const [decisionTree, setDecisionTree] = useState<{ tree: DecisionTree; udi: UDI } | null>(null);
  const [loadingTree, setLoadingTree] = useState(false);
  const domainColor = DOMAIN_COLORS[entry.domain] || "#00f0ff";

  async function sendFeedback(helpful: boolean) {
    try {
      await fetch(`${apiBase}/api/kb/feedback`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kbId: entry.id, helpful }),
      });
      setFeedbackSent(helpful ? "helpful" : "not_helpful");
    } catch {}
  }

  async function loadDecisionTree() {
    setLoadingTree(true);
    try {
      const res = await fetch(`${apiBase}/api/kb/lookup`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: entry.symptoms[0], domain: entry.domain }),
      });
      const data = await res.json();
      setDecisionTree({ tree: data.decisionTree, udi: data.udi });
    } catch {} finally { setLoadingTree(false); }
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="h-full flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-slate-500">{entry.id}</span>
            <span className="text-xs text-slate-600">{entry.tier}</span>
          </div>
          <h2 className="font-display font-bold text-white text-lg">{entry.domain} / {entry.subdomain}</h2>
          <p className="text-sm text-slate-500">{entry.issueType}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-slate-600 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Success Rate</span>
          </div>
          <div className="flex items-center gap-3">
            <ConfidenceMeter score={Math.round(entry.historicalSuccess * 100)} />
            <span className="text-xs text-slate-600">{entry.estimatedTime}</span>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Symptoms</p>
          <div className="flex flex-wrap gap-1.5">
            {entry.symptoms.map((s, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded border border-white/[0.06] bg-white/[0.03] text-slate-400">{s}</span>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {entry.tags.map((t, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded border font-mono" style={{ borderColor: `${domainColor}25`, color: domainColor, background: `${domainColor}08` }}>{t}</span>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Resolution Steps</p>
          <ol className="space-y-2">
            {entry.resolutionSteps.map((step, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-xs text-slate-600 shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-xs text-slate-400 leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </div>

        {entry.escalationConditions && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Escalation Conditions</p>
            <div className="space-y-1">
              {entry.escalationConditions.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-amber-400/80">
                  <AlertCircle className="w-3 h-3 shrink-0" />{c}
                </div>
              ))}
            </div>
          </div>
        )}

        {entry.selfHealable && (
          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2.5">
            <Zap className="w-3.5 h-3.5" /> This issue can be auto-remediated by the Apphia Engine
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Decision Tree</p>
            {!decisionTree && (
              <button onClick={loadDecisionTree} disabled={loadingTree} className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1">
                {loadingTree ? <span className="w-3 h-3 border border-cyan-400 border-t-transparent rounded-full animate-spin" /> : <Brain className="w-3 h-3" />}
                Generate
              </button>
            )}
          </div>
          {decisionTree ? (
            <DecisionTreeViewer tree={decisionTree.tree} udi={decisionTree.udi} />
          ) : (
            <div className="text-xs text-slate-600 italic">Click Generate to build the branching decision tree for this KB entry</div>
          )}
        </div>

        <div className="pt-2 border-t border-white/[0.04]">
          <p className="text-xs text-slate-500 mb-3">Was this KB article helpful?</p>
          {feedbackSent ? (
            <div className="text-xs text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5" /> Thank you — Apphia has logged your feedback to improve future matches.
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => sendFeedback(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                <ThumbsUp className="w-3.5 h-3.5" /> Helpful
              </button>
              <button onClick={() => sendFeedback(false)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 transition-colors">
                <ThumbsDown className="w-3.5 h-3.5" /> Not helpful
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function KnowledgeBase() {
  const apiBase = useApiBase();
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [stats, setStats] = useState<KBStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeDomain, setActiveDomain] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<KBEntry | null>(null);
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupResult, setLookupResult] = useState<{ udi: UDI; decisionTree: DecisionTree; severity: string; intent: string } | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  async function loadEntries(domain?: string, searchQuery?: string) {
    setLoading(true);
    const params = new URLSearchParams();
    if (domain) params.set("domain", domain);
    if (searchQuery) params.set("search", searchQuery);
    try {
      const res = await fetch(`${apiBase}/api/kb/entries?${params}`, { credentials: "include" });
      const data = await res.json();
      setEntries(data.entries || []);
      setDomains(data.domains || []);
    } catch {} finally { setLoading(false); }
  }

  async function loadStats() {
    try {
      const res = await fetch(`${apiBase}/api/kb/stats`, { credentials: "include" });
      setStats(await res.json());
    } catch {}
  }

  useEffect(() => { loadEntries(); loadStats(); }, []);

  async function runLookup() {
    if (!lookupQuery.trim()) return;
    setLookupLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/kb/lookup`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: lookupQuery }),
      });
      const data = await res.json();
      setLookupResult(data);
    } catch {} finally { setLookupLoading(false); }
  }

  const debouncedSearch = (val: string) => {
    setSearch(val);
    clearTimeout((window as any).__kbDebounce);
    (window as any).__kbDebounce = setTimeout(() => loadEntries(activeDomain || undefined, val || undefined), 400);
  };

  const handleDomainFilter = (domain: string | null) => {
    setActiveDomain(domain);
    loadEntries(domain || undefined, search || undefined);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Knowledge Base</h1>
          <p className="text-slate-500 mt-1">Apphia Engine — {stats?.totalKBEntries || 0} structured resolution guides across {stats?.domains || 0} technology domains</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "KB Entries", value: stats.totalKBEntries, color: "#00f0ff", icon: BookOpen },
            { label: "Avg Success Rate", value: `${stats.avgSuccessRate}%`, color: "#00ff88", icon: BarChart3 },
            { label: "Auto-Healable", value: stats.selfHealableCount, color: "#a855f7", icon: Zap },
            { label: "Cases Resolved", value: stats.userCaseStats.resolved, color: "#f59e0b", icon: CheckCircle2 },
          ].map(s => (
            <Card key={s.label} className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/[0.06]" style={{ background: `${s.color}10` }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-2xl font-display font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-purple-400" /> Apphia Lookup — intent + severity + decision tree
        </p>
        <div className="flex gap-2">
          <input
            value={lookupQuery}
            onChange={e => setLookupQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && runLookup()}
            placeholder='Describe the issue, e.g. "VPN not connecting after password reset"'
            className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40 transition-colors"
          />
          <Button onClick={runLookup} disabled={lookupLoading} size="sm">
            {lookupLoading ? <span className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        <AnimatePresence>
          {lookupResult && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <SeverityBadge severity={lookupResult.udi.severity} />
                <IntentBadge intent={lookupResult.udi.intent} />
                <span className={`text-xs px-2 py-0.5 rounded border ${lookupResult.udi.action === "AutoResolve" ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" : lookupResult.udi.action === "Escalate" ? "text-red-400 border-red-500/20 bg-red-500/5" : "text-cyan-400 border-cyan-500/20 bg-cyan-500/5"}`}>
                  Action: {lookupResult.udi.action}
                </span>
                {lookupResult.udi.kbId && <span className="text-xs text-slate-500">→ KB: {lookupResult.udi.kbId}</span>}
              </div>
              <ConfidenceMeter score={lookupResult.udi.confidenceScore} />
              <p className="text-xs text-slate-400">{lookupResult.udi.decisionReason}</p>
              {lookupResult.udi.synonymsMatched.length > 0 && (
                <p className="text-xs text-slate-600">Semantic expansion: {lookupResult.udi.synonymsMatched.slice(0, 5).join(", ")}</p>
              )}
              {lookupResult.udi.resolutionSteps && (
                <div className="mt-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Decision Path</p>
                  <DecisionTreeViewer tree={lookupResult.decisionTree} udi={lookupResult.udi} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      <div className="flex gap-4">
        <div className="w-48 shrink-0 space-y-1">
          <button onClick={() => handleDomainFilter(null)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!activeDomain ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "text-slate-400 hover:text-white hover:bg-white/[0.03]"}`}>
            All Domains ({stats?.totalKBEntries || 0})
          </button>
          {domains.map(domain => {
            const Icon = DOMAIN_ICONS[domain] || BookOpen;
            const color = DOMAIN_COLORS[domain] || "#00f0ff";
            const count = stats?.domainBreakdown[domain] || 0;
            return (
              <button key={domain} onClick={() => handleDomainFilter(domain)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${activeDomain === domain ? "border" : "hover:bg-white/[0.03]"}`}
                style={activeDomain === domain ? { borderColor: `${color}30`, background: `${color}08`, color } : {}}>
                <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: activeDomain === domain ? color : undefined }} />
                <span className={activeDomain === domain ? "" : "text-slate-400"}>{domain}</span>
                <span className="ml-auto text-xs text-slate-600">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input
              value={search}
              onChange={e => debouncedSearch(e.target.value)}
              placeholder="Search symptoms, tags, or domains..."
              className="w-full pl-9 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40 transition-colors"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {entries.map(entry => {
                const Icon = DOMAIN_ICONS[entry.domain] || BookOpen;
                const color = DOMAIN_COLORS[entry.domain] || "#00f0ff";
                const successRate = Math.round(entry.historicalSuccess * 100);
                return (
                  <motion.button
                    key={entry.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -1 }}
                    onClick={() => setSelectedEntry(selectedEntry?.id === entry.id ? null : entry)}
                    className={`text-left p-4 rounded-xl border transition-all ${selectedEntry?.id === entry.id ? "border-cyan-500/30 bg-cyan-500/5" : "border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.03]"}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/[0.06]" style={{ background: `${color}12` }}>
                          <Icon className="w-4 h-4" style={{ color }} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{entry.subdomain} <span className="text-slate-600">/ {entry.issueType}</span></p>
                          <p className="text-xs text-slate-600">{entry.id} · {entry.tier}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {entry.selfHealable && <Zap className="w-3.5 h-3.5 text-emerald-400" title="Auto-healable" />}
                        <span className="text-xs font-bold" style={{ color: successRate >= 80 ? "#00ff88" : successRate >= 60 ? "#ffb800" : "#ff3355" }}>{successRate}%</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {entry.tags.slice(0, 4).map((t, i) => (
                        <span key={i} className="text-xs px-1.5 py-0.5 rounded border" style={{ borderColor: `${color}20`, color: `${color}cc`, background: `${color}06` }}>{t}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-600">{entry.resolutionSteps.length} steps · {entry.estimatedTime}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
                    </div>
                  </motion.button>
                );
              })}
              {entries.length === 0 && !loading && (
                <div className="col-span-2 text-center py-12 text-slate-600">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No KB entries match your search.
                </div>
              )}
            </div>
          )}
        </div>

        <AnimatePresence>
          {selectedEntry && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 360 }}
              exit={{ opacity: 0, width: 0 }}
              className="shrink-0 overflow-hidden"
            >
              <Card className="p-5 h-full w-[360px]">
                <KBEntryDetail entry={selectedEntry} onClose={() => setSelectedEntry(null)} apiBase={apiBase} />
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
