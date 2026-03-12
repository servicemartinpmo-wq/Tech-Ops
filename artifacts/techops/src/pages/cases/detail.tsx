import { useParams, Link } from "wouter";
import { useGetCase, useUpdateCase } from "@workspace/api-client-react";
import { useSseDiagnostic } from "@/hooks/use-sse-diagnostic";
import { useApiBase } from "@/hooks/use-api-base";
import { Card, Button, Badge } from "@/components/ui";
import { ArrowLeft, Play, Terminal, CheckCircle2, AlertTriangle, ShieldAlert, Brain, GitBranch, ThumbsUp, ThumbsDown, Zap, AlertCircle, ChevronRight, BookOpen, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DecisionStep {
  stepId: string; action: string; rationale: string;
  expectedOutcome: string; fallbackStepId: string | null;
  escalateOnFail: boolean; automated: boolean; estimatedMinutes: number;
}
interface DecisionTree {
  treeId: string; kbId: string | null; severity: string; issueTitle: string;
  steps: DecisionStep[];
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

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    P1: "bg-red-500/10 text-red-400 border-red-500/20",
    P2: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    P3: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    P4: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };
  return <span className={`text-xs px-2 py-0.5 rounded border font-mono font-bold ${colors[severity] || colors.P3}`}>{severity}</span>;
}

function ConfidenceMeter({ score }: { score: number }) {
  const color = score >= 75 ? "#00ff88" : score >= 50 ? "#ffb800" : "#ff3355";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: color, boxShadow: `0 0 8px ${color}40` }} />
      </div>
      <span className="text-xs font-bold font-mono" style={{ color }}>{score}%</span>
    </div>
  );
}

function DecisionTreePanel({ tree, udi, caseId, apiBase }: { tree: DecisionTree; udi: UDI; caseId: number; apiBase: string }) {
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [failedSteps, setFailedSteps] = useState<Set<string>>(new Set());
  const [feedbackSent, setFeedbackSent] = useState<"helpful" | "not_helpful" | null>(null);

  async function sendFeedback(helpful: boolean) {
    if (!udi.kbId) return;
    try {
      await fetch(`${apiBase}/api/kb/feedback`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kbId: udi.kbId, caseId, helpful }),
      });
      setFeedbackSent(helpful ? "helpful" : "not_helpful");
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <SeverityBadge severity={tree.severity} />
        <span className={`text-xs px-2 py-0.5 rounded border ${udi.action === "AutoResolve" ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" : udi.action === "Escalate" ? "text-red-400 border-red-500/20 bg-red-500/5" : "text-cyan-400 border-cyan-500/20 bg-cyan-500/5"}`}>
          {udi.action === "AutoResolve" && <Zap className="w-3 h-3 inline mr-1" />}
          {udi.action}
        </span>
        <span className="text-xs text-slate-500">~{tree.totalEstimatedMinutes} min · SLA {udi.slaLimit}min</span>
      </div>

      <ConfidenceMeter score={udi.confidenceScore} />
      <p className="text-xs text-slate-400">{udi.decisionReason}</p>

      {udi.synonymsMatched.length > 0 && (
        <p className="text-xs text-slate-600">Semantic expansion: {udi.synonymsMatched.slice(0, 6).join(" · ")}</p>
      )}

      <div className="text-xs text-amber-400/80 bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5">
        <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
        Escalation path: {tree.escalationPath.level} — auto-escalate in {tree.escalationPath.autoEscalateAfterMinutes} min
      </div>

      <div className="space-y-2">
        {tree.steps.map((step, idx) => {
          const done = completedSteps.has(step.stepId);
          const failed = failedSteps.has(step.stepId);
          return (
            <div key={step.stepId}>
              <button
                onClick={() => setActiveStep(activeStep === step.stepId ? null : step.stepId)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${done ? "border-emerald-500/20 bg-emerald-500/5" : failed ? "border-red-500/20 bg-red-500/5" : activeStep === step.stepId ? "border-cyan-500/30 bg-cyan-500/5" : "border-white/[0.05] bg-white/[0.02] hover:border-white/10"}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${done ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : failed ? "bg-red-500/20 text-red-400 border border-red-500/30" : step.automated ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-white/[0.05] text-slate-500 border border-white/[0.06]"}`}>
                    {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : failed ? <AlertCircle className="w-3.5 h-3.5" /> : step.automated ? <Zap className="w-3 h-3" /> : idx + 1}
                  </div>
                  <span className="text-xs text-slate-300 flex-1">{step.action.length > 85 ? step.action.slice(0, 85) + "…" : step.action}</span>
                  {step.escalateOnFail && <AlertCircle className="w-3 h-3 text-red-400/60 shrink-0" />}
                  <ChevronRight className={`w-3.5 h-3.5 text-slate-700 transition-transform ${activeStep === step.stepId ? "rotate-90" : ""}`} />
                </div>
              </button>
              <AnimatePresence>
                {activeStep === step.stepId && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="ml-8 p-3 bg-black/20 border border-t-0 border-white/[0.04] rounded-b-lg space-y-3 text-xs">
                      <p className="text-slate-400"><span className="text-slate-600">Action: </span>{step.action}</p>
                      <p className="text-slate-400"><span className="text-slate-600">Expected: </span>{step.expectedOutcome}</p>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => { setCompletedSteps(s => new Set([...s, step.stepId])); setActiveStep(step.fallbackStepId); }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </button>
                        <button
                          onClick={() => { setFailedSteps(s => new Set([...s, step.stepId])); setActiveStep(step.fallbackStepId || "STEP-ESC"); }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <AlertCircle className="w-3 h-3" /> Failed — try next
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {udi.kbId && (
        <div className="pt-3 border-t border-white/[0.04]">
          <p className="text-xs text-slate-500 mb-2">KB Article {udi.kbId} — was this helpful?</p>
          {feedbackSent ? (
            <p className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Apphia logged your feedback — success rate updated.</p>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => sendFeedback(true)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                <ThumbsUp className="w-3 h-3" /> Helpful
              </button>
              <button onClick={() => sendFeedback(false)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 transition-colors">
                <ThumbsDown className="w-3 h-3" /> Not helpful
              </button>
              <Link href={`/kb`} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded border border-white/[0.06] bg-white/[0.02] text-slate-500 hover:text-white transition-colors ml-auto">
                <BookOpen className="w-3 h-3" /> View in KB
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CaseDetail() {
  const { id } = useParams();
  const caseId = parseInt(id || "0", 10);
  const apiBase = useApiBase();
  
  const { data: diagnosticCase, isLoading } = useGetCase(caseId);
  const { mutate: updateCase } = useUpdateCase();
  const { runDiagnostic, isRunning, logs } = useSseDiagnostic(caseId);
  const logEndRef = useRef<HTMLDivElement>(null);
  const [decisionData, setDecisionData] = useState<{ udi: UDI; tree: DecisionTree } | null>(null);
  const [loadingDecision, setLoadingDecision] = useState(false);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  async function loadDecisionTree() {
    setLoadingDecision(true);
    try {
      const res = await fetch(`${apiBase}/api/kb/decision-tree`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      });
      const data = await res.json();
      setDecisionData({ udi: data.udi, tree: data.tree });
    } catch {} finally { setLoadingDecision(false); }
  }

  if (isLoading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!diagnosticCase) return <div className="p-8 text-center text-red-400">Case not found</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <Link href="/cases" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-cyan-400 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Cases
      </Link>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-mono text-slate-600 bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.06]">#{diagnosticCase.id}</span>
            <Badge variant={diagnosticCase.status === 'resolved' ? 'success' : 'neutral'}>
              {diagnosticCase.status}
            </Badge>
            {diagnosticCase.diagnosticTier && (
              <Badge variant="default">Tier {diagnosticCase.diagnosticTier} Analysis</Badge>
            )}
          </div>
          <h1 className="text-3xl font-display font-bold text-white">{diagnosticCase.title}</h1>
          <p className="text-slate-500 mt-2 max-w-3xl leading-relaxed">{diagnosticCase.description || "No description provided."}</p>
        </div>

        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="lg"
            onClick={loadDecisionTree}
            disabled={loadingDecision}
            className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
          >
            {loadingDecision ? <span className="w-4 h-4 border border-purple-400 border-t-transparent rounded-full animate-spin mr-2" /> : <Brain className="w-5 h-5 mr-2" />}
            Decision Engine
          </Button>
          <Button 
            size="lg" 
            onClick={runDiagnostic} 
            disabled={isRunning || diagnosticCase.status === 'resolved'}
            className="shadow-xl shadow-cyan-500/20 neon-glow-cyan"
          >
            <Play className="w-5 h-5 mr-2" />
            {isRunning ? "Running Pipeline..." : "Run Apphia Pipeline"}
          </Button>
        </div>
      </motion.div>

      <AnimatePresence>
        {decisionData && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Card className="p-6 border-purple-500/20 bg-purple-500/[0.03]">
              <h3 className="font-display font-bold text-white flex items-center gap-2 mb-4">
                <GitBranch className="w-5 h-5 text-purple-400" />
                Apphia Decision Engine
                <span className="ml-auto text-xs font-mono text-slate-600">{decisionData.tree.treeId}</span>
              </h3>
              <DecisionTreePanel tree={decisionData.tree} udi={decisionData.udi} caseId={caseId} apiBase={apiBase} />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-0 overflow-hidden h-[500px] flex flex-col relative">
            <div className="flex items-center gap-2 p-3 bg-black/40 border-b border-white/[0.04]">
              <Terminal className="w-4 h-4 text-slate-600" />
              <span className="font-semibold text-slate-500 text-xs tracking-wider font-mono">APPHIA ENGINE // PIPELINE EXECUTION</span>
              {isRunning && <span className="ml-auto flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>}
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 space-y-2 custom-scrollbar bg-[#0a0a10] font-mono text-sm text-slate-400">
              {logs.length === 0 ? (
                <div className="text-slate-700 italic h-full flex items-center justify-center">
                  Pipeline idle. Ready for execution.
                </div>
              ) : (
                <AnimatePresence>
                  {logs.map((log, i) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={i} 
                      className={`flex gap-3 ${log.type === 'error' ? 'text-red-400' : log.type === 'system_error' ? 'text-amber-400' : log.type === 'complete' ? 'text-emerald-400' : ''}`}
                    >
                      <span className="text-slate-700 select-none">[{new Date().toLocaleTimeString().split(' ')[0]}]</span>
                      <div className="flex-1 break-words">
                        {log.type === 'signal' && <span className="text-cyan-400 mr-2">EXTRACT:</span>}
                        {log.type === 'udo_path' && <span className="text-purple-400 mr-2">UDO TRAVERSAL:</span>}
                        {log.type === 'system_error' && <span className="text-amber-400 mr-2">⚠ PLATFORM ERROR:</span>}
                        {log.message}
                        {log.data && (
                          <pre className="mt-1 p-2 bg-black/40 rounded text-xs text-slate-500 overflow-x-auto border border-white/[0.03]">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
              <div ref={logEndRef} />
            </div>
          </Card>

          {logs.some((l) => l.type === "system_error") && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-5 bg-amber-50 border-amber-200">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-display font-bold text-amber-800">Platform Error</h3>
                    <p className="text-sm text-amber-700 mt-1">
                      This diagnostic failed due to a platform-side error. The case has been reset and does not count against your quota. You can re-run at no additional cost.
                    </p>
                    <Button size="sm" variant="outline" className="mt-3 border-amber-300 text-amber-700 hover:bg-amber-100" onClick={runDiagnostic} disabled={isRunning}>
                      <Play className="w-4 h-4 mr-1" /> Retry Diagnostic
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
          {(diagnosticCase.rootCause || diagnosticCase.resolution) && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-6 neon-border">
                <h3 className="font-display font-bold text-lg text-white mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Diagnostic Results
                </h3>
                <div className="space-y-4">
                  {diagnosticCase.rootCause && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">PROBABLE ROOT CAUSE</p>
                      <p className="text-slate-300 bg-white/[0.03] p-3 rounded-lg border border-white/[0.06]">{diagnosticCase.rootCause}</p>
                    </div>
                  )}
                  {diagnosticCase.resolution && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">RECOMMENDED RESOLUTION</p>
                      <p className="text-slate-300 bg-white/[0.03] p-3 rounded-lg border border-white/[0.06]">{diagnosticCase.resolution}</p>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="font-display font-bold text-white mb-4 text-sm uppercase tracking-wider">Metadata</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-white/[0.04] pb-2">
                <span className="text-slate-500">Created</span>
                <span className="font-medium text-slate-300">{format(new Date(diagnosticCase.createdAt), "MMM d, yyyy")}</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.04] pb-2">
                <span className="text-slate-500">Confidence</span>
                <span className="font-bold text-cyan-400">{diagnosticCase.confidenceScore || 0}%</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-slate-500">Status</span>
                <span className="font-medium capitalize text-slate-300">{diagnosticCase.status.replace("_", " ")}</span>
              </div>
            </div>
          </Card>

          {diagnosticCase.signals && (
            <Card className="p-5 neon-border">
              <h3 className="font-display font-bold text-cyan-400 mb-3 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Extracted Signals
              </h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(diagnosticCase.signals).map(([k, v]) => (
                  <span key={k} className="px-2 py-1 bg-cyan-500/5 border border-cyan-500/10 text-cyan-400 text-xs rounded">
                    {k}: {String(v)}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {!decisionData && (
            <Card className="p-5 border-dashed border-purple-500/20 bg-purple-500/[0.02]">
              <div className="text-center space-y-2">
                <Brain className="w-8 h-8 text-purple-400/50 mx-auto" />
                <p className="text-xs text-slate-500">Run the Decision Engine to get a branching resolution path with escalation logic</p>
                <button onClick={loadDecisionTree} disabled={loadingDecision} className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 mx-auto">
                  {loadingDecision ? <span className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin" /> : <ArrowRight className="w-3 h-3" />}
                  Generate now
                </button>
              </div>
            </Card>
          )}

          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => updateCase({ id: caseId, data: { status: "resolved" } })}
            disabled={diagnosticCase.status === 'resolved'}
          >
            Mark as Resolved
          </Button>
        </div>
      </div>
    </div>
  );
}
