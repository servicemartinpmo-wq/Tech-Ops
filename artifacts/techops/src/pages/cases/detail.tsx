import { useParams, Link, useLocation } from "wouter";

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    .replace(/_{1,3}([^_]+)_{1,3}/g, "$1")
    .replace(/`{1,3}([^`]+)`{1,3}/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/>\s+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
import { useGetCase, useUpdateCase } from "@workspace/api-client-react";
import { useSseDiagnostic, type KnowledgeSource } from "@/hooks/use-sse-diagnostic";
import { useApiBase } from "@/hooks/use-api-base";
import { Card, Button, Badge } from "@/components/ui";
import {
  ArrowLeft, Play, Terminal, CheckCircle2, AlertTriangle, ShieldAlert, Brain,
  GitBranch, ThumbsUp, ThumbsDown, Zap, AlertCircle, ChevronRight, BookOpen,
  ArrowRight, Cpu, Monitor, X, Clock, FileText, ImageIcon, Paperclip, Database,
  ChevronDown, StopCircle, MousePointer2, Eye, EyeOff, BedDouble, WifiOff
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useEffect, useRef, useState, useCallback } from "react";
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
    P1: "bg-red-50 text-red-600 border-red-200",
    P2: "bg-amber-50 text-amber-600 border-amber-200",
    P3: "bg-blue-50 text-blue-600 border-blue-200",
    P4: "bg-slate-100 text-slate-500 border-slate-200",
  };
  return <span className={`text-xs px-2 py-0.5 rounded border font-mono font-bold ${colors[severity] || colors.P3}`}>{severity}</span>;
}

function ConfidenceMeter({ score }: { score: number }) {
  const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 0.8, ease: "easeOut" }} style={{ background: color }} />
      </div>
      <span className="text-xs font-bold font-mono" style={{ color }}>{score}%</span>
    </div>
  );
}

function AutoDeployPanel({
  resolution, confidenceScore, selfHealable, autoMode, setAutoMode, onDeploy, isRunning
}: {
  resolution: string | null; confidenceScore: number | null;
  selfHealable: boolean; autoMode: boolean; setAutoMode: (v: boolean) => void;
  onDeploy: (withScreenShare: boolean) => void; isRunning: boolean;
}) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState(0);
  const [withScreen, setWithScreen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const cancelCountdown = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCountdown(null);
  }, []);

  useEffect(() => {
    if (autoMode && resolution && !deploying && !isRunning) {
      const delay = setTimeout(() => {
        setCountdown(10);
        timerRef.current = setInterval(() => {
          setCountdown(c => {
            if (c === null || c <= 1) {
              clearInterval(timerRef.current!);
              setDeploying(true);
              setDeployStep(0);
              onDeploy(withScreen);
              return null;
            }
            return c - 1;
          });
        }, 1000);
      }, 800);
      return () => { clearTimeout(delay); if (timerRef.current) clearInterval(timerRef.current); };
    }
    return undefined;
  }, [autoMode, resolution, deploying, isRunning]);

  useEffect(() => {
    if (!deploying) return;
    const steps = ["Initializing execution context...", "Applying solution steps...", "Verifying outcome...", "Updating case status..."];
    const iv = setInterval(() => {
      setDeployStep(s => {
        if (s >= steps.length - 1) { clearInterval(iv); return s; }
        return s + 1;
      });
    }, 1800);
    return () => clearInterval(iv);
  }, [deploying]);

  const deploySteps = [
    "Initializing execution context...",
    "Applying solution steps...",
    "Verifying outcome...",
    "Updating case status...",
  ];

  return (
    <Card className="p-5 border-sky-200 bg-gradient-to-r from-sky-50 to-indigo-50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sky-500 flex items-center justify-center shadow-sm">
            <Cpu className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-display font-bold text-slate-900">Autonomous Execution</h3>
            <p className="text-[11px] text-slate-500">Deploy solution without manual confirmation</p>
          </div>
        </div>
        <button
          onClick={() => { setAutoMode(!autoMode); cancelCountdown(); setDeploying(false); }}
          className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${autoMode ? "bg-sky-500" : "bg-slate-200"}`}
        >
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${autoMode ? "left-7" : "left-1"}`} />
        </button>
      </div>

      {!autoMode && (
        <div className="text-xs text-slate-500 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
          When enabled, Apphia will automatically deploy the solution once diagnosis is complete — no button click required.
          {!resolution && " Run the pipeline first to generate a solution."}
        </div>
      )}

      {autoMode && !resolution && !isRunning && (
        <div className="text-xs text-slate-500 flex items-start gap-2">
          <Zap className="w-3.5 h-3.5 text-sky-500 mt-0.5 shrink-0" />
          Autonomous mode is armed. Run the Apphia Pipeline — when a solution is ready, deployment will begin automatically.
        </div>
      )}

      {autoMode && !resolution && isRunning && (
        <div className="flex items-center gap-2 text-xs text-sky-600 font-medium">
          <span className="w-3 h-3 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          Pipeline running — monitoring for solution readiness...
        </div>
      )}

      {autoMode && resolution && countdown !== null && !deploying && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-sky-200">
            <div className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center text-white font-bold text-lg font-display shrink-0" style={{ animation: "sphere-breathe 1s ease-in-out infinite" }}>
              {countdown}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">Deploying solution in {countdown}s</p>
              <p className="text-xs text-slate-500">Apphia has a solution ready. Deployment begins automatically.</p>
            </div>
            <button onClick={cancelCountdown} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-slate-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
            <input type="checkbox" checked={withScreen} onChange={e => setWithScreen(e.target.checked)} className="w-3.5 h-3.5 rounded accent-sky-500" />
            <Monitor className="w-3.5 h-3.5 text-slate-400" />
            Include screen share for guided walkthrough
          </label>
        </div>
      )}

      {autoMode && deploying && (
        <div className="space-y-2">
          {deploySteps.map((step, i) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: i <= deployStep ? 1 : 0.3, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-2 text-xs"
            >
              {i < deployStep ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : i === deployStep ? (
                <span className="w-3.5 h-3.5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-slate-200 shrink-0" />
              )}
              <span className={i <= deployStep ? "text-slate-700" : "text-slate-400"}>{step}</span>
            </motion.div>
          ))}
          {deployStep >= deploySteps.length - 1 && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 mt-2 pt-2 border-t border-sky-100 text-xs font-semibold text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
              Solution deployed successfully by Apphia
            </motion.div>
          )}
        </div>
      )}

      {autoMode && resolution && countdown === null && !deploying && (
        <div className="flex gap-2 mt-1">
          <Button size="sm" onClick={() => onDeploy(false)} className="gap-1.5 text-xs bg-sky-500 hover:bg-sky-400 text-white shadow-sm">
            <Zap className="w-3.5 h-3.5" />
            Deploy Now
          </Button>
          <Button size="sm" onClick={() => onDeploy(true)} variant="outline" className="gap-1.5 text-xs border-sky-200 text-sky-600">
            <Monitor className="w-3.5 h-3.5" />
            Deploy with Screen Share
          </Button>
        </div>
      )}
    </Card>
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
        <span className={`text-xs px-2 py-0.5 rounded border font-medium ${udi.action === "AutoResolve" ? "text-emerald-600 border-emerald-200 bg-emerald-50" : udi.action === "Escalate" ? "text-red-600 border-red-200 bg-red-50" : "text-sky-600 border-sky-200 bg-sky-50"}`}>
          {udi.action === "AutoResolve" && <Zap className="w-3 h-3 inline mr-1" />}
          {udi.action}
        </span>
        <span className="text-xs text-slate-500">~{tree.totalEstimatedMinutes} min · SLA {udi.slaLimit}min</span>
      </div>

      <ConfidenceMeter score={udi.confidenceScore} />
      <p className="text-xs text-slate-500">{udi.decisionReason}</p>

      {udi.synonymsMatched.length > 0 && (
        <p className="text-xs text-slate-400">Semantic expansion: {udi.synonymsMatched.slice(0, 6).join(" · ")}</p>
      )}

      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
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
                className={`w-full text-left p-3 rounded-lg border transition-all text-sm ${done ? "border-emerald-200 bg-emerald-50" : failed ? "border-red-200 bg-red-50" : activeStep === step.stepId ? "border-sky-200 bg-sky-50" : "border-slate-100 bg-white hover:border-slate-200"}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${done ? "bg-emerald-100 text-emerald-600 border border-emerald-200" : failed ? "bg-red-100 text-red-600 border border-red-200" : step.automated ? "bg-violet-100 text-violet-600 border border-violet-200" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                    {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : failed ? <AlertCircle className="w-3.5 h-3.5" /> : step.automated ? <Zap className="w-3 h-3" /> : idx + 1}
                  </div>
                  <span className="text-xs text-slate-700 flex-1">{step.action.length > 85 ? step.action.slice(0, 85) + "…" : step.action}</span>
                  {step.escalateOnFail && <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />}
                  <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${activeStep === step.stepId ? "rotate-90" : ""}`} />
                </div>
              </button>
              <AnimatePresence>
                {activeStep === step.stepId && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="ml-8 p-3 bg-slate-50 border border-t-0 border-slate-100 rounded-b-lg space-y-3 text-xs">
                      <p className="text-slate-600"><span className="font-semibold text-slate-500">Action: </span>{step.action}</p>
                      <p className="text-slate-600"><span className="font-semibold text-slate-500">Expected: </span>{step.expectedOutcome}</p>
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => { setCompletedSteps(s => new Set([...s, step.stepId])); setActiveStep(step.fallbackStepId); }} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </button>
                        <button onClick={() => { setFailedSteps(s => new Set([...s, step.stepId])); setActiveStep(step.fallbackStepId || "STEP-ESC"); }} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
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
        <div className="pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-500 mb-2">KB Article {udi.kbId} — was this helpful?</p>
          {feedbackSent ? (
            <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Apphia logged your feedback — success rate updated.</p>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => sendFeedback(true)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">
                <ThumbsUp className="w-3 h-3" /> Helpful
              </button>
              <button onClick={() => sendFeedback(false)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                <ThumbsDown className="w-3 h-3" /> Not helpful
              </button>
              <Link href="/kb" className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded border border-slate-200 bg-white text-slate-500 hover:text-slate-700 transition-colors ml-auto">
                <BookOpen className="w-3 h-3" /> View in KB
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KnowledgeSourcesPanel({ sources }: { sources: KnowledgeSource[] }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card className="p-0 overflow-hidden border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-teal-50/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 p-4 text-left hover:bg-emerald-50/50 transition-colors"
      >
        <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm shrink-0">
          <Database className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-display font-bold text-slate-900">Knowledge Sources Consulted</h3>
          <p className="text-[11px] text-slate-500">{sources.length} node{sources.length !== 1 ? "s" : ""} retrieved from the knowledge graph via cosine similarity</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              {sources.map((source, i) => (
                <div key={source.id} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-emerald-100">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-600 border border-emerald-200 shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900">{source.title}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">{source.externalId}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500">{source.domain}{source.subdomain ? ` / ${source.subdomain}` : ""}</span>
                      <span className="text-[10px] text-slate-300">|</span>
                      <span className={`text-xs font-medium ${source.confidenceScore >= 75 ? "text-emerald-600" : source.confidenceScore >= 50 ? "text-amber-600" : "text-slate-500"}`}>
                        {source.confidenceScore}% match
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

interface EnvironmentSnapshot {
  id: number;
  osInfo: string | null;
  techStack: string[] | null;
  activeServices: string[] | null;
  recentErrors: Array<{ message: string; timestamp: string }> | null;
  environment: string;
  cloudProvider: string | null;
  region: string | null;
  createdAt: string;
}

function EnvironmentPanel({ snapshot }: { snapshot: EnvironmentSnapshot }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card className="p-0 overflow-hidden border-indigo-200 bg-gradient-to-r from-indigo-50/50 to-violet-50/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 p-4 text-left hover:bg-indigo-50/50 transition-colors"
      >
        <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center shadow-sm shrink-0">
          <Monitor className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-display font-bold text-slate-900">Environment Context</h3>
          <p className="text-[11px] text-slate-500">
            {[snapshot.osInfo, snapshot.environment, snapshot.techStack?.length ? `${snapshot.techStack.length} technologies` : null].filter(Boolean).join(" · ")}
          </p>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {snapshot.osInfo && (
                  <div className="p-3 bg-white rounded-lg border border-indigo-100">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1">Operating System</p>
                    <p className="text-sm font-semibold text-slate-900">{snapshot.osInfo}</p>
                  </div>
                )}
                <div className="p-3 bg-white rounded-lg border border-indigo-100">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1">Environment</p>
                  <p className="text-sm font-semibold text-slate-900 capitalize">{snapshot.environment}</p>
                </div>
                {snapshot.cloudProvider && (
                  <div className="p-3 bg-white rounded-lg border border-indigo-100">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1">Cloud Provider</p>
                    <p className="text-sm font-semibold text-slate-900">{snapshot.cloudProvider}</p>
                  </div>
                )}
                {snapshot.region && (
                  <div className="p-3 bg-white rounded-lg border border-indigo-100">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1">Region</p>
                    <p className="text-sm font-semibold text-slate-900">{snapshot.region}</p>
                  </div>
                )}
              </div>

              {snapshot.techStack && snapshot.techStack.length > 0 && (
                <div className="p-3 bg-white rounded-lg border border-indigo-100">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-2">Tech Stack</p>
                  <div className="flex flex-wrap gap-1.5">
                    {snapshot.techStack.map(tech => (
                      <span key={tech} className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-medium">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {snapshot.activeServices && snapshot.activeServices.length > 0 && (
                <div className="p-3 bg-white rounded-lg border border-indigo-100">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-2">Active Services</p>
                  <div className="flex flex-wrap gap-1.5">
                    {snapshot.activeServices.map(svc => (
                      <span key={svc} className="text-xs px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 font-medium">
                        {svc}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {snapshot.recentErrors && snapshot.recentErrors.length > 0 && (
                <div className="p-3 bg-white rounded-lg border border-red-100">
                  <p className="text-[10px] uppercase tracking-wider text-red-400 font-medium mb-2">Recent Errors</p>
                  <div className="space-y-1.5">
                    {snapshot.recentErrors.slice(0, 5).map((err, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                        <span className="text-slate-700 flex-1">{err.message}</span>
                        <span className="text-slate-400 text-[10px] shrink-0">{err.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

const WALKTHROUGH_STEPS = [
  "Scanning page structure...",
  "Testing form validation logic...",
  "Checking button responses...",
  "Verifying API connectivity...",
  "Reviewing error state rendering...",
  "Confirming navigation links...",
  "Testing data load states...",
  "Checking auth session...",
];

function ScreenSharePanel({
  stream, onStop, caseId,
}: { stream: MediaStream; onStop: () => void; caseId: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [walkthroughActive, setWalkthroughActive] = useState(false);
  const [sleepMode, setSleepMode] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [stepDone, setStepDone] = useState<number[]>([]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  useEffect(() => {
    if (!walkthroughActive || sleepMode) return;
    const id = setInterval(() => {
      setStepIdx(i => {
        const next = (i + 1) % WALKTHROUGH_STEPS.length;
        setStepDone(d => [...d, i]);
        return next;
      });
    }, 2800);
    return () => clearInterval(id);
  }, [walkthroughActive, sleepMode]);

  const handleTakeControl = () => {
    setSleepMode(true);
    setWalkthroughActive(false);
  };

  const handleDone = () => {
    setSleepMode(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <AnimatePresence>
        {sleepMode && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <BedDouble className="w-5 h-5 text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">You have control</p>
              <p className="text-xs text-amber-600">Automated actions are paused. Tap Done when you're finished — the session will resume.</p>
            </div>
            <button onClick={handleDone}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-white text-xs font-semibold rounded-lg transition-colors">
              Done
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="p-4 border-sky-200 bg-sky-50/50 overflow-hidden">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
            <span className="text-sm font-semibold text-slate-800">Screen Sharing — Ticket #{caseId}</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => { setWalkthroughActive(v => !v); if (sleepMode) setSleepMode(false); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${walkthroughActive && !sleepMode ? "bg-violet-100 border-violet-200 text-violet-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {walkthroughActive && !sleepMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {walkthroughActive && !sleepMode ? "Stop Walkthrough" : "Guided Walkthrough"}
            </button>
            <button onClick={handleTakeControl} disabled={sleepMode}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border bg-white border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">
              <MousePointer2 className="w-3.5 h-3.5" />
              Take Control
            </button>
            <button onClick={onStop}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border bg-red-50 border-red-200 text-red-600 hover:bg-red-100 transition-colors">
              <StopCircle className="w-3.5 h-3.5" />
              End Session
            </button>
          </div>
        </div>

        <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-700" style={{ aspectRatio: "16/9", maxHeight: "340px" }}>
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-contain" />
          {sleepMode && (
            <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center gap-3">
              <WifiOff className="w-10 h-10 text-amber-400" />
              <p className="text-white font-semibold text-sm">User in control — session paused</p>
              <p className="text-slate-400 text-xs">Tap Done above to resume</p>
            </div>
          )}
          {walkthroughActive && !sleepMode && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              className="absolute bottom-3 right-3 bg-slate-900/90 backdrop-blur border border-violet-500/30 rounded-xl p-3 w-56">
              <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider mb-2">Apphia is checking</p>
              <div className="space-y-1">
                {WALKTHROUGH_STEPS.slice(0, 5).map((step, i) => {
                  const done = stepDone.includes(i);
                  const active = i === stepIdx % 5;
                  return (
                    <div key={i} className={`flex items-center gap-2 text-[11px] transition-colors ${active ? "text-white" : done ? "text-slate-500 line-through" : "text-slate-600"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? "bg-violet-400 animate-pulse" : done ? "bg-emerald-500" : "bg-slate-700"}`} />
                      {step}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>

        {walkthroughActive && !sleepMode && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-center gap-2 p-3 bg-violet-50 border border-violet-100 rounded-lg">
            <span className="flex h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
            <p className="text-xs text-violet-700 font-medium">{WALKTHROUGH_STEPS[stepIdx % WALKTHROUGH_STEPS.length]}</p>
            <button onClick={handleTakeControl} className="ml-auto text-xs text-violet-500 hover:text-violet-700 underline underline-offset-2">
              I'll handle this
            </button>
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
}

export default function CaseDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const caseId = parseInt(id || "0", 10);
  const apiBase = useApiBase();

  const { data: diagnosticCase, isLoading, refetch } = useGetCase(caseId);
  const { mutate: updateCase } = useUpdateCase();
  const { runDiagnostic, isRunning, logs, knowledgeSources } = useSseDiagnostic(caseId);
  const logEndRef = useRef<HTMLDivElement>(null);
  const [decisionData, setDecisionData] = useState<{ udi: UDI; tree: DecisionTree } | null>(null);
  const [loadingDecision, setLoadingDecision] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [envSnapshot, setEnvSnapshot] = useState<EnvironmentSnapshot | null>(null);
  const [shareStream, setShareStream] = useState<MediaStream | null>(null);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      stream.getVideoTracks()[0].addEventListener("ended", () => setShareStream(null));
      setShareStream(stream);
    } catch {
      // user cancelled or not supported
    }
  }, []);

  const stopScreenShare = useCallback(() => {
    shareStream?.getTracks().forEach(t => t.stop());
    setShareStream(null);
  }, [shareStream]);

  useEffect(() => {
    if (!caseId) return;
    fetch(`${apiBase}/api/cases/${caseId}/environment`, { credentials: "include" })
      .then(r => r.json())
      .then(data => { if (data && data.id) setEnvSnapshot(data); })
      .catch(() => {});
  }, [caseId, apiBase]);

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

  function handleDeploy(_withScreenShare: boolean) {
    updateCase({ id: caseId, data: { status: "resolved" } }, { onSuccess: () => refetch() });
  }

  if (isLoading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" /></div>;
  if (!diagnosticCase) return <div className="p-8 text-center text-red-500">Case not found</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-20">
      <Link href="/cases" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-sky-600 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Cases
      </Link>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">#{diagnosticCase.id}</span>
            <Badge variant={diagnosticCase.status === 'resolved' ? 'success' : 'neutral'}>{diagnosticCase.status}</Badge>
            {diagnosticCase.diagnosticTier && <Badge variant="default">Tier {diagnosticCase.diagnosticTier} Analysis</Badge>}
          </div>
          <h1 className="text-2xl font-display font-bold text-slate-900">{diagnosticCase.title}</h1>
          <p className="text-slate-500 mt-1.5 max-w-3xl leading-relaxed text-sm">{diagnosticCase.description || "No description provided."}</p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {shareStream ? (
            <Button variant="outline" size="sm" onClick={stopScreenShare} className="border-red-200 text-red-600 hover:bg-red-50">
              <StopCircle className="w-4 h-4 mr-2" />
              End Sharing
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => void startScreenShare()} className="border-sky-200 text-sky-600 hover:bg-sky-50">
              <Monitor className="w-4 h-4 mr-2" />
              Start Screen Sharing
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={loadDecisionTree} disabled={loadingDecision} className="border-violet-200 text-violet-600 hover:bg-violet-50">
            {loadingDecision ? <span className="w-4 h-4 border border-violet-400 border-t-transparent rounded-full animate-spin mr-2" /> : <Brain className="w-4 h-4 mr-2" />}
            Decision Engine
          </Button>
          <Button size="sm" onClick={runDiagnostic} disabled={isRunning || diagnosticCase.status === 'resolved'} className="bg-sky-500 hover:bg-sky-400 text-white shadow-sm">
            <Play className="w-4 h-4 mr-2" />
            {isRunning ? "Running Pipeline..." : "Run Apphia Pipeline"}
          </Button>
        </div>
      </motion.div>

      <AnimatePresence>
        {shareStream && (
          <ScreenSharePanel stream={shareStream} onStop={stopScreenShare} caseId={caseId} />
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <AutoDeployPanel
          resolution={diagnosticCase.resolution || null}
          confidenceScore={diagnosticCase.confidenceScore || null}
          selfHealable={!!(decisionData?.udi.selfHealable)}
          autoMode={autoMode}
          setAutoMode={setAutoMode}
          onDeploy={handleDeploy}
          isRunning={isRunning}
        />
      </motion.div>

      {envSnapshot && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <EnvironmentPanel snapshot={envSnapshot} />
        </motion.div>
      )}

      <AnimatePresence>
        {knowledgeSources.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <KnowledgeSourcesPanel sources={knowledgeSources} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {decisionData && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Card className="p-5 border-violet-100 bg-violet-50/50">
              <h3 className="font-display font-bold text-slate-900 flex items-center gap-2 mb-4">
                <GitBranch className="w-4 h-4 text-violet-500" />
                Apphia Decision Engine
                <span className="ml-auto text-xs font-mono text-slate-400">{decisionData.tree.treeId}</span>
              </h3>
              <DecisionTreePanel tree={decisionData.tree} udi={decisionData.udi} caseId={caseId} apiBase={apiBase} />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-4">
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-0 overflow-hidden h-[480px] flex flex-col">
            <div className="flex items-center gap-2 p-3 bg-slate-900 border-b border-slate-800">
              <Terminal className="w-4 h-4 text-slate-500" />
              <span className="font-semibold text-slate-500 text-xs tracking-wider font-mono">APPHIA ENGINE // PIPELINE EXECUTION</span>
              {isRunning && <span className="ml-auto flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]" />}
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-2 custom-scrollbar bg-[#0a0a10] font-mono text-sm text-slate-400">
              {logs.length === 0 ? (
                <div className="text-slate-600 italic h-full flex items-center justify-center text-sm">
                  Pipeline idle. Ready for execution.
                </div>
              ) : (
                <AnimatePresence>
                  {logs.map((log, i) => (
                    <motion.div initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} key={i}
                      className={`flex gap-3 ${log.type === 'error' ? 'text-red-400' : log.type === 'system_error' ? 'text-amber-400' : log.type === 'complete' ? 'text-emerald-400' : ''}`}>
                      <span className="text-slate-700 select-none">[{new Date().toLocaleTimeString().split(' ')[0]}]</span>
                      <div className="flex-1 break-words">
                        {log.type === 'knowledge_sources' && <span className="text-emerald-400 mr-2">KB RETRIEVAL:</span>}
                        {log.type === 'signal' && <span className="text-sky-400 mr-2">EXTRACT:</span>}
                        {log.type === 'udo_path' && <span className="text-violet-400 mr-2">UDO TRAVERSAL:</span>}
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
                  <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-display font-bold text-amber-800">Platform Error</h3>
                    <p className="text-sm text-amber-700 mt-1">This diagnostic failed due to a platform error. You can re-run at no additional cost.</p>
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
              <Card className="p-5 border-emerald-100 bg-emerald-50/40">
                <h3 className="font-display font-bold text-slate-900 flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Diagnostic Results
                </h3>
                <div className="space-y-4">
                  {diagnosticCase.rootCause && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Root Cause</p>
                      <p className="text-sm text-slate-700 bg-white p-3 rounded-lg border border-emerald-100">{stripMarkdown(diagnosticCase.rootCause)}</p>
                    </div>
                  )}
                  {diagnosticCase.resolution && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Recommended Resolution</p>
                      <p className="text-sm text-slate-700 bg-white p-3 rounded-lg border border-emerald-100">{stripMarkdown(diagnosticCase.resolution)}</p>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5 bg-white border border-slate-100">
            <h3 className="font-display font-bold text-slate-900 mb-4 text-sm uppercase tracking-wider">Case Metadata</h3>
            <div className="space-y-2.5 text-sm">
              {[
                { label: "Created", value: format(new Date(diagnosticCase.createdAt), "MMM d, yyyy") },
                { label: "Confidence", value: `${diagnosticCase.confidenceScore || 0}%`, highlight: true },
                { label: "Status", value: diagnosticCase.status.replace("_", " ") },
                { label: "Priority", value: diagnosticCase.priority || "medium" },
              ].map(row => (
                <div key={row.label} className="flex justify-between py-2 border-b border-slate-50 last:border-0">
                  <span className="text-slate-400 text-xs">{row.label}</span>
                  <span className={`text-xs font-semibold capitalize ${row.highlight ? "text-sky-600" : "text-slate-700"}`}>{row.value}</span>
                </div>
              ))}

              {(diagnosticCase as unknown as { slaDeadline?: string | null }).slaDeadline && (() => {
                const deadline = new Date((diagnosticCase as unknown as { slaDeadline: string }).slaDeadline);
                const isBreached = deadline < new Date();
                const slaStatus = (diagnosticCase as unknown as { slaStatus?: string }).slaStatus || "on_track";
                const label = isBreached || slaStatus === "breached" ? "SLA BREACHED" : `Due ${formatDistanceToNow(deadline, { addSuffix: true })}`;
                const cls = isBreached || slaStatus === "breached" ? "text-red-500" : deadline.getTime() - Date.now() < 2 * 3600 * 1000 ? "text-amber-500" : "text-emerald-500";
                return (
                  <div className="flex justify-between py-2 border-b border-slate-50 last:border-0">
                    <span className="text-slate-400 text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> SLA</span>
                    <span className={`text-xs font-semibold ${cls}`}>{label}</span>
                  </div>
                );
              })()}
            </div>
          </Card>

          {diagnosticCase.signals && (
            <Card className="p-4 border-sky-100 bg-sky-50/50">
              <h3 className="font-display font-bold text-slate-900 mb-3 text-sm flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Extracted Signals
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(diagnosticCase.signals).map(([k, v]) => (
                  <span key={k} className="px-2 py-0.5 bg-sky-100 border border-sky-200 text-sky-700 text-[10px] rounded font-mono">
                    {k}: {String(v)}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {(diagnosticCase as unknown as { attachments?: Array<{name: string; type: string; size: number; data: string}> | null }).attachments && (() => {
            const atts = (diagnosticCase as unknown as { attachments: Array<{name: string; type: string; size: number; data: string}> }).attachments;
            if (!atts?.length) return null;
            return (
              <Card className="p-4 border-slate-100">
                <h3 className="font-display font-bold text-slate-900 mb-3 text-sm flex items-center gap-2">
                  <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                  Attachments ({atts.length})
                </h3>
                <div className="space-y-2">
                  {atts.map((att, i) => {
                    const isImage = att.type.startsWith("image/");
                    const sizeLabel = att.size < 1024 ? `${att.size}B` : att.size < 1024*1024 ? `${(att.size/1024).toFixed(1)}KB` : `${(att.size/(1024*1024)).toFixed(1)}MB`;
                    return (
                      <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                        {isImage ? <ImageIcon className="w-4 h-4 text-violet-400 shrink-0" /> : <FileText className="w-4 h-4 text-sky-400 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">{att.name}</p>
                          <p className="text-[10px] text-slate-400">{sizeLabel}</p>
                        </div>
                        {isImage && (
                          <a
                            href={`data:${att.type};base64,${att.data}`}
                            download={att.name}
                            className="text-[10px] text-sky-500 hover:text-sky-600 font-medium"
                          >
                            View
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })()}

          {!decisionData && (
            <Card className="p-4 border-dashed border-violet-200 bg-violet-50/40">
              <div className="text-center space-y-2">
                <Brain className="w-7 h-7 text-violet-300 mx-auto" />
                <p className="text-xs text-slate-500">Run the Decision Engine to get a branching resolution path with escalation logic</p>
                <button onClick={loadDecisionTree} disabled={loadingDecision} className="text-xs text-violet-500 hover:text-violet-600 transition-colors flex items-center gap-1 mx-auto font-medium">
                  {loadingDecision ? <span className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" /> : <ArrowRight className="w-3 h-3" />}
                  Generate now
                </button>
              </div>
            </Card>
          )}

          <Button
            variant="outline"
            className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            onClick={() => updateCase({ id: caseId, data: { status: "resolved" } })}
            disabled={diagnosticCase.status === 'resolved'}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Mark as Resolved
          </Button>
        </div>
      </div>
    </div>
  );
}
