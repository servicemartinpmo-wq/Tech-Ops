import type { UDI, IssueSeverity, KBEntry } from "./knowledge-base";
import { KB } from "./knowledge-base";

export interface DecisionStep {
  stepId: string;
  action: string;
  rationale: string;
  expectedOutcome: string;
  fallbackStepId: string | null;
  escalateOnFail: boolean;
  automated: boolean;
  estimatedMinutes: number;
}

export interface DecisionTree {
  treeId: string;
  kbId: string | null;
  severity: IssueSeverity;
  issueTitle: string;
  steps: DecisionStep[];
  escalationPath: EscalationPath;
  createdAt: string;
  totalEstimatedMinutes: number;
}

export interface EscalationPath {
  level: string;
  slaMinutes: number;
  contacts: string[];
  autoEscalateAfterMinutes: number;
  requiresApproval: boolean;
}

export interface DecisionResult {
  treeId: string;
  completedSteps: string[];
  currentStepId: string | null;
  outcome: "resolved" | "escalated" | "pending" | "in_progress";
  confidence: number;
  nextAction: string;
  timestamp: string;
}

const ESCALATION_PATHS: Record<IssueSeverity, EscalationPath> = {
  P1: {
    level: "Tier4 — Executive + On-call SRE",
    slaMinutes: 15,
    contacts: ["on-call-sre@company.com", "engineering-manager@company.com", "cto@company.com"],
    autoEscalateAfterMinutes: 5,
    requiresApproval: false,
  },
  P2: {
    level: "Tier3 — Senior Engineer + Engineering Manager",
    slaMinutes: 30,
    contacts: ["on-call-sre@company.com", "engineering-manager@company.com"],
    autoEscalateAfterMinutes: 15,
    requiresApproval: false,
  },
  P3: {
    level: "Tier2 — Support Engineer",
    slaMinutes: 240,
    contacts: ["support-team@company.com"],
    autoEscalateAfterMinutes: 120,
    requiresApproval: true,
  },
  P4: {
    level: "Tier1 — Self-service + Documentation",
    slaMinutes: 1440,
    contacts: ["support-team@company.com"],
    autoEscalateAfterMinutes: 480,
    requiresApproval: true,
  },
};

function buildStepsFromKBEntry(entry: KBEntry, severity: IssueSeverity): DecisionStep[] {
  const steps: DecisionStep[] = entry.resolutionSteps.map((step, idx) => {
    const isLast = idx === entry.resolutionSteps.length - 1;
    const isAutomatic = !!entry.selfHealable && idx < 2;
    return {
      stepId: `STEP-${idx + 1}`,
      action: step,
      rationale: `KB entry ${entry.id} (${entry.domain}/${entry.subdomain}) — Step ${idx + 1} of ${entry.resolutionSteps.length}`,
      expectedOutcome: isLast ? "Issue resolved — verify normal operation" : "Eliminate this cause and proceed to next step if unresolved",
      fallbackStepId: isLast ? null : `STEP-${idx + 2}`,
      escalateOnFail: isLast && (severity === "P1" || severity === "P2"),
      automated: isAutomatic,
      estimatedMinutes: Math.round((parseInt(entry.estimatedTime.split("-")[0]) || 15) / entry.resolutionSteps.length),
    };
  });

  if (entry.escalationConditions && entry.escalationConditions.length > 0) {
    steps.push({
      stepId: `STEP-ESC`,
      action: `Escalation check: verify none of the following conditions apply: ${entry.escalationConditions.join("; ")}`,
      rationale: "Mandatory escalation check from KB entry",
      expectedOutcome: "Confirm whether escalation is required based on findings",
      fallbackStepId: null,
      escalateOnFail: true,
      automated: false,
      estimatedMinutes: 5,
    });
  }

  return steps;
}

function buildGenericSteps(severity: IssueSeverity, issueTitle: string): DecisionStep[] {
  return [
    {
      stepId: "STEP-1",
      action: `Collect initial signals: gather error messages, affected users, start time, and recent changes for: "${issueTitle}"`,
      rationale: "Signal collection is the foundation of all diagnostic work",
      expectedOutcome: "Clear picture of scope, start time, and symptoms",
      fallbackStepId: "STEP-2",
      escalateOnFail: false,
      automated: false,
      estimatedMinutes: 5,
    },
    {
      stepId: "STEP-2",
      action: "Check monitoring dashboards: review CPU, memory, disk, and network metrics for anomalies in the last 30 minutes",
      rationale: "Metrics often reveal the root cause faster than logs",
      expectedOutcome: "Anomalous metric identified or eliminated as root cause",
      fallbackStepId: "STEP-3",
      escalateOnFail: false,
      automated: true,
      estimatedMinutes: 5,
    },
    {
      stepId: "STEP-3",
      action: "Review system logs: check application logs, system logs, and event logs for errors in the timeframe of the incident",
      rationale: "Logs provide the trail of what happened leading to the issue",
      expectedOutcome: "Error pattern identified or logs clear (which is also useful information)",
      fallbackStepId: "STEP-4",
      escalateOnFail: false,
      automated: false,
      estimatedMinutes: 10,
    },
    {
      stepId: "STEP-4",
      action: "Test basic connectivity and service availability: ping, port check, and health endpoint tests",
      rationale: "Network and service reachability eliminate the most common causes quickly",
      expectedOutcome: "Connectivity status confirmed — either identified as issue or eliminated",
      fallbackStepId: "STEP-ESC",
      escalateOnFail: severity === "P1" || severity === "P2",
      automated: true,
      estimatedMinutes: 5,
    },
    {
      stepId: "STEP-ESC",
      action: "Escalate to engineering team with full incident report: steps taken, findings, current state, and affected scope",
      rationale: "After 4 diagnostic steps without resolution, human expertise is required",
      expectedOutcome: "Incident formally escalated with all context preserved",
      fallbackStepId: null,
      escalateOnFail: false,
      automated: false,
      estimatedMinutes: 10,
    },
  ];
}

export function buildDecisionTree(udi: UDI, issueTitle: string): DecisionTree {
  const treeId = `TREE-${Date.now()}-${Math.floor(Math.random() * 999)}`;
  const kbEntry = udi.kbId ? KB.find(e => e.id === udi.kbId) : null;

  const steps = kbEntry
    ? buildStepsFromKBEntry(kbEntry, udi.severity)
    : buildGenericSteps(udi.severity, issueTitle);

  const escalationPath = ESCALATION_PATHS[udi.severity];

  const totalEstimatedMinutes = steps.reduce((sum, s) => sum + s.estimatedMinutes, 0);

  return {
    treeId,
    kbId: udi.kbId,
    severity: udi.severity,
    issueTitle,
    steps,
    escalationPath,
    createdAt: new Date().toISOString(),
    totalEstimatedMinutes,
  };
}

export function evaluateDecisionStep(
  tree: DecisionTree,
  stepId: string,
  stepSucceeded: boolean,
  notes?: string,
): DecisionResult {
  const stepIndex = tree.steps.findIndex(s => s.stepId === stepId);
  const step = tree.steps[stepIndex];

  if (!step) {
    return {
      treeId: tree.treeId,
      completedSteps: [],
      currentStepId: null,
      outcome: "escalated",
      confidence: 0,
      nextAction: "Step not found — escalating",
      timestamp: new Date().toISOString(),
    };
  }

  const completedSteps = tree.steps.slice(0, stepIndex + 1).map(s => s.stepId);

  if (stepSucceeded) {
    const isLastStep = stepIndex === tree.steps.length - 1 || !step.fallbackStepId;
    return {
      treeId: tree.treeId,
      completedSteps,
      currentStepId: isLastStep ? null : step.fallbackStepId,
      outcome: isLastStep ? "resolved" : "in_progress",
      confidence: Math.min(100, 60 + stepIndex * 10),
      nextAction: isLastStep ? "Issue resolved — monitor for 15 minutes" : `Proceed to: ${step.fallbackStepId}`,
      timestamp: new Date().toISOString(),
    };
  }

  if (step.escalateOnFail) {
    return {
      treeId: tree.treeId,
      completedSteps,
      currentStepId: null,
      outcome: "escalated",
      confidence: 20,
      nextAction: `Escalating to ${tree.escalationPath.level}. Contacts: ${tree.escalationPath.contacts[0]}. Auto-escalate in ${tree.escalationPath.autoEscalateAfterMinutes} minutes.`,
      timestamp: new Date().toISOString(),
    };
  }

  const nextStep = step.fallbackStepId ? tree.steps.find(s => s.stepId === step.fallbackStepId) : null;
  return {
    treeId: tree.treeId,
    completedSteps,
    currentStepId: nextStep?.stepId || null,
    outcome: nextStep ? "in_progress" : "escalated",
    confidence: Math.max(20, 50 - stepIndex * 10),
    nextAction: nextStep ? `Step failed — trying fallback: ${nextStep.action.slice(0, 80)}` : "All steps exhausted — escalating",
    timestamp: new Date().toISOString(),
  };
}

export function priorityMatrix(cases: Array<{ title: string; severity: IssueSeverity; createdAt: Date }>): Array<{ title: string; severity: IssueSeverity; urgencyScore: number; recommendation: string }> {
  const now = Date.now();
  return cases.map(c => {
    const ageMinutes = (now - new Date(c.createdAt).getTime()) / 60000;
    const slaDef = ESCALATION_PATHS[c.severity].slaMinutes;
    const slaRemaining = Math.max(0, slaDef - ageMinutes);
    const urgencyScore = (1 - slaRemaining / slaDef) * 100;

    let recommendation = "Monitor";
    if (urgencyScore > 80 || slaRemaining < 5) recommendation = "IMMEDIATE — SLA breach imminent";
    else if (urgencyScore > 60) recommendation = "Urgent — assign engineer now";
    else if (urgencyScore > 40) recommendation = "Elevated — review within 30 minutes";
    else recommendation = "Normal — handle in queue";

    return { title: c.title, severity: c.severity, urgencyScore: Math.round(urgencyScore), recommendation };
  }).sort((a, b) => b.urgencyScore - a.urgencyScore);
}
