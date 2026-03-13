import { Router, type IRouter, type Response } from "express";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import {
  db, pool, casesTable, diagnosticAttemptsTable, usersTable,
  analyticsEventsTable, errorPatternsTable, escalationHistoryTable,
  knowledgeNodesTable,
} from "@workspace/db";
import { CreateCaseBody, UpdateCaseBody, RunBatchDiagnosticsBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import type { AuthenticatedRequest } from "../types";
import type { Case } from "@workspace/db";
import { getTierLimits } from "../middleware/tierGating";
import { buildSystemPrompt, classifySeverity, classifyIntent } from "../kb/knowledge-base";
import { sendEmail, buildCriticalCaseEmail } from "../emailService";
import { generateEmbedding } from "../services/embeddings";

const SLA_HOURS: Record<string, number> = { critical: 4, high: 8, medium: 24, low: 72 };
function getSlaDeadline(priority: string): Date {
  return new Date(Date.now() + (SLA_HOURS[priority] ?? 24) * 60 * 60 * 1000);
}

function buildApphiaDiagnosticPrompt(profile?: { communicationStyle?: string; detailLevel?: string; technicalDepth?: string } | null): string {
  const base = `You are Apphia, the diagnostic knowledge engine for Tech-Ops by Martin PMO. Never refer to yourself as "AI", "assistant", or "bot".`;
  if (!profile) return base;
  const depth = { simplified: "use plain language", moderate: "use standard technical terms", technical: "use precise engineering-level language" }[profile.technicalDepth || "moderate"] ?? "use standard technical terms";
  const detail = { summary: "keep your analysis concise", standard: "provide standard diagnostic depth", comprehensive: "provide exhaustive analysis" }[profile.detailLevel || "standard"] ?? "provide standard diagnostic depth";
  return `${base} For this user: ${depth}, and ${detail}.`;
}

async function countUserCasesForQuota(userId: string): Promise<number> {
  const result = await db.select({ count: sql<number>`count(*)` }).from(casesTable)
    .where(and(eq(casesTable.userId, userId), inArray(casesTable.status, ["resolved", "in_progress"])));
  return Number(result[0]?.count || 0);
}

async function trackEvent(data: {
  userId?: string; eventType: string; entityType?: string; entityId?: string;
  domain?: string; severity?: string; stage?: number; confidenceScore?: number;
  durationMs?: number; tokenCount?: number; metadata?: Record<string, unknown>;
}) {
  try {
    await db.insert(analyticsEventsTable).values(data);
  } catch { /* non-critical */ }
}

async function trackEscalation(data: {
  caseId: number; userId: string; fromTier?: string; toTier: string;
  reason: string; triggeredBy?: string; confidenceAtEscalation?: number;
  pipelineStageAtEscalation?: number;
}) {
  try {
    await db.insert(escalationHistoryTable).values({
      ...data,
      triggeredBy: data.triggeredBy ?? "system",
    });
  } catch { /* non-critical */ }
}

async function updateErrorPattern(domain: string, caseId: number, kbId?: string | null, confidenceScore?: number) {
  const key = `${domain.toLowerCase()}-${new Date().toISOString().slice(0, 7)}`;
  try {
    const [existing] = await db.select().from(errorPatternsTable).where(eq(errorPatternsTable.patternKey, key));
    if (existing) {
      await db.update(errorPatternsTable).set({
        occurrenceCount: existing.occurrenceCount + 1,
        lastSeen: new Date(),
        avgConfidence: confidenceScore !== undefined ? ((existing.avgConfidence ?? 0) + confidenceScore) / 2 : existing.avgConfidence,
        relatedCaseIds: [...(existing.relatedCaseIds ?? []), caseId].slice(-20),
        relatedKbIds: kbId ? [...new Set([...(existing.relatedKbIds ?? []), kbId])].slice(-10) : existing.relatedKbIds,
      }).where(eq(errorPatternsTable.id, existing.id));
    } else {
      await db.insert(errorPatternsTable).values({
        patternKey: key, domain, title: `${domain} issues (${new Date().toISOString().slice(0, 7)})`,
        relatedCaseIds: [caseId], relatedKbIds: kbId ? [kbId] : [],
        avgConfidence: confidenceScore ?? null,
      });
    }
  } catch { /* non-critical */ }
}

async function kbSemanticSearch(query: string, domain?: string, limit = 5): Promise<Array<{
  id: number; externalId: string; title: string; domain: string; subdomain: string | null;
  resolutionSteps: string[] | null; symptoms: string[] | null; selfHealable: string | null;
  confidence: number; method: string;
}>> {
  try {
    const embedding = await generateEmbedding(query);
    const embeddingStr = `[${embedding.join(",")}]`;
    const params: unknown[] = [embeddingStr, limit];
    let domainClause = "";
    if (domain) {
      params.push(domain);
      domainClause = `AND domain ILIKE $${params.length}`;
    }
    const result = await pool.query(
      `SELECT id, external_id, title, domain, subdomain, resolution_steps, symptoms, self_healable,
        round((1 - (embedding <=> $1::vector))::numeric, 4) AS similarity
      FROM knowledge_nodes
      WHERE embedding IS NOT NULL ${domainClause}
      ORDER BY embedding <=> $1::vector
      LIMIT $2`,
      params
    );
    return (result.rows as Array<Record<string, unknown>>).map(r => ({
      id: Number(r.id), externalId: String(r.external_id), title: String(r.title),
      domain: String(r.domain), subdomain: r.subdomain ? String(r.subdomain) : null,
      resolutionSteps: r.resolution_steps as string[] ?? null,
      symptoms: r.symptoms as string[] ?? null,
      selfHealable: r.self_healable ? String(r.self_healable) : null,
      confidence: parseFloat(String(r.similarity ?? 0)) * 100,
      method: "vector",
    }));
  } catch {
    return [];
  }
}

const router: IRouter = Router();

router.get("/cases", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }
  const cases = await db.select().from(casesTable)
    .where(eq(casesTable.userId, authReq.user.id))
    .orderBy(desc(casesTable.createdAt))
    .limit(100);
  res.json(cases);
});

router.post("/cases", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const parsed = CreateCaseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { storage: storageModule } = await import("../storage");
  const user = await storageModule.getUser(authReq.user.id);
  const tier = user?.subscriptionTier || "free";
  const limits = getTierLimits(tier);

  const quotaCount = await countUserCasesForQuota(authReq.user.id);
  if (quotaCount >= limits.maxCases) {
    res.status(403).json({
      error: "Case quota exceeded",
      message: `Your tier allows ${limits.maxCases} cases. You have ${quotaCount} active.`,
      currentCount: quotaCount, limit: limits.maxCases,
    });
    return;
  }

  const priority = parsed.data.priority || "medium";
  const slaDeadline = getSlaDeadline(priority);

  const [newCase] = await db.insert(casesTable).values({
    ...parsed.data,
    userId: authReq.user.id,
    slaDeadline,
    slaStatus: "on_track",
  }).returning();

  await trackEvent({ userId: authReq.user.id, eventType: "case_created", entityType: "case", entityId: String(newCase.id), severity: priority });

  if (priority === "critical" || priority === "high") {
    try {
      const [userRecord] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, authReq.user.id));
      if (userRecord?.email) {
        const emailPayload = buildCriticalCaseEmail(newCase.title, priority, newCase.id, userRecord.email);
        sendEmail(emailPayload).catch(e => console.error("[Cases] Email error:", e));
      }
    } catch { /* non-critical */ }
  }

  res.status(201).json(newCase);
});

router.get("/cases/:id", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }
  const id = parseInt(req.params.id, 10);
  const [caseItem] = await db.select().from(casesTable).where(and(eq(casesTable.id, id), eq(casesTable.userId, authReq.user.id)));
  if (!caseItem) { res.status(404).json({ error: "Case not found" }); return; }
  res.json(caseItem);
});

router.patch("/cases/:id", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }
  const id = parseInt(req.params.id, 10);
  const parsed = UpdateCaseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updateData: Partial<Case> = { ...parsed.data };
  if (parsed.data.status === "resolved") updateData.resolvedAt = new Date();
  const [updated] = await db.update(casesTable).set(updateData)
    .where(and(eq(casesTable.id, id), eq(casesTable.userId, authReq.user.id))).returning();
  if (!updated) { res.status(404).json({ error: "Case not found" }); return; }

  if (parsed.data.status === "resolved") {
    try {
      const [latestAttempt] = await db.select({ udoGraph: diagnosticAttemptsTable.udoGraph })
        .from(diagnosticAttemptsTable)
        .where(eq(diagnosticAttemptsTable.caseId, id))
        .orderBy(desc(diagnosticAttemptsTable.createdAt))
        .limit(1);
      const citedIds = (latestAttempt?.udoGraph as Record<string, unknown>)?.citedKbNodeIds as number[] | undefined;
      if (citedIds && citedIds.length > 0) {
        await pool.query(
          `UPDATE knowledge_nodes SET confidence_score = LEAST(1.0, confidence_score + 0.01) WHERE id = ANY($1::int[])`,
          [citedIds]
        );
      }
    } catch { /* non-critical */ }
  }

  res.json(updated);
});

router.delete("/cases/:id", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }
  const id = parseInt(req.params.id, 10);
  const [deleted] = await db.delete(casesTable)
    .where(and(eq(casesTable.id, id), eq(casesTable.userId, authReq.user.id))).returning();
  if (!deleted) { res.status(404).json({ error: "Case not found" }); return; }
  res.json({ success: true, id });
});

router.post("/cases/:id/diagnose", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const id = parseInt(req.params.id, 10);
  const [caseItem] = await db.select().from(casesTable)
    .where(and(eq(casesTable.id, id), eq(casesTable.userId, authReq.user.id)));
  if (!caseItem) { res.status(404).json({ error: "Case not found" }); return; }

  const { storage: storageModule } = await import("../storage");
  const user = await storageModule.getUser(authReq.user.id);
  const tier = user?.subscriptionTier || "free";
  const limits = getTierLimits(tier);

  if (caseItem.status !== "resolved" && caseItem.status !== "in_progress") {
    const quotaCount = await countUserCasesForQuota(authReq.user.id);
    if (quotaCount >= limits.maxCases) {
      res.status(403).json({ error: "Case quota exceeded", currentCount: quotaCount, limit: limits.maxCases });
      return;
    }
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  await db.update(casesTable).set({ status: "in_progress" }).where(eq(casesTable.id, id));

  const sendEvent = (data: Record<string, unknown>) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const pipelineStart = Date.now();

  try {
    const ctx: PipelineContext = {
      signals: [], udoGraph: {}, rootCauses: [], tierOutputs: [], kbEvidence: [],
      environmentContext: null, quickFixCandidate: null, playbookId: null,
      costEstimate: "low", guardrailsPassed: true, totalTokens: 0,
    };

    let userProfile = null;
    try {
      const [userRecord] = await db.select({ preferencesProfile: usersTable.preferencesProfile })
        .from(usersTable).where(eq(usersTable.id, authReq.user.id));
      if (userRecord?.preferencesProfile) userProfile = JSON.parse(userRecord.preferencesProfile);
    } catch { /* default */ }

    const profileSuffix = buildApphiaDiagnosticPrompt(userProfile);
    const queryText = `${caseItem.title} ${caseItem.description || ""}`;
    const severity = classifySeverity(queryText);
    const intent = classifyIntent(queryText);

    const [attempt] = await db.insert(diagnosticAttemptsTable).values({
      caseId: id, userId: authReq.user.id, tier: 1, status: "running",
    }).returning();

    sendEvent({ type: "pipeline_start", stages: 12, severity, intent, caseId: id });

    // ─── PRE-STAGE: KB Semantic Retrieval (before any LLM calls) ─────────────
    const kbResults = await kbSemanticSearch(queryText, undefined, 5);
    ctx.kbEvidence = kbResults;

    sendEvent({
      type: "knowledge_sources",
      data: kbResults.map(k => ({
        id: k.id,
        externalId: k.externalId,
        title: k.title,
        domain: k.domain,
        subdomain: k.subdomain,
        confidenceScore: Math.round(k.confidence),
      })),
    });

    const retrievedContextBlock = kbResults.length > 0
      ? `\n\nRetrieved context from knowledge graph (${kbResults.length} nodes, cosine similarity):\n` +
        kbResults.map((r, i) =>
          `[${i + 1}] ${r.externalId} — ${r.title} (${r.domain}/${r.subdomain || "general"}) — similarity: ${r.confidence.toFixed(1)}%\n` +
          `   Symptoms: ${(r.symptoms || []).slice(0, 3).join("; ")}\n` +
          `   Resolution hints: ${(r.resolutionSteps || []).slice(0, 2).join("; ")}\n` +
          `   Self-healable: ${r.selfHealable || "unknown"}`
        ).join("\n")
      : "\n\nNo knowledge graph matches found. Proceed with first-principles analysis.";

    const runStage = async (stage: number, systemMsg: string, userMsg: string, streaming = true): Promise<string> => {
      const label = getStageName(stage);
      sendEvent({ type: "stage_start", stage, label, totalStages: 12 });
      let response = "";
      let tokens = 0;
      const stageStart = Date.now();

      if (streaming) {
        const stream = await openai.chat.completions.create({
          model: "gpt-4o", max_completion_tokens: 4096,
          messages: [{ role: "system", content: systemMsg }, { role: "user", content: userMsg }],
          stream: true,
        });
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) { response += content; tokens += content.length; sendEvent({ type: "stage_content", stage, content }); }
        }
      } else {
        const result = await openai.chat.completions.create({
          model: "gpt-4o", max_completion_tokens: 4096,
          messages: [{ role: "system", content: systemMsg }, { role: "user", content: userMsg }],
          stream: false,
        });
        response = result.choices[0]?.message?.content || "";
        tokens = response.length;
        sendEvent({ type: "stage_content", stage, content: response });
      }

      ctx.totalTokens += tokens;
      const durationMs = Date.now() - stageStart;
      sendEvent({ type: "stage_complete", stage, label, durationMs, tokenCount: tokens });
      await trackEvent({ userId: authReq.user.id, eventType: "pipeline_stage", entityId: String(id), stage, durationMs, tokenCount: tokens });
      return response;
    };

    // ─── STAGE 1: Classification & Typed Signal Extraction ────────────────────
    sendEvent({ type: "progress", stage: 1, message: "Stage 1/12: Classification & Typed Signal Extraction" });
    const stage1 = await runStage(1,
      `You are Apphia. ${profileSuffix}${retrievedContextBlock}`,
      `Case: "${caseItem.title}"
Description: ${caseItem.description || "No description"}
Priority: ${caseItem.priority || "medium"}

Stage 1 — Classification & Typed Signal Extraction:
1. Classify into domains: infrastructure|database|network|application|security|performance|configuration
2. Extract observable signals as typed array. Format: signals: ["signal1", "signal2", ...]
3. Categorize each signal: (performance|connectivity|security|configuration|resource|data_integrity)
4. Identify environment context: environment type, cloud provider, region if mentioned
5. Flag quick-fix candidates with confidence > 92% (format: quick_fix_confidence: <number>)
6. Identify any immediate self-healing opportunities`
    );
    ctx.tierOutputs.push(stage1);

    const sigMatch = stage1.match(/signals?:?\s*\[(.*?)\]/is);
    if (sigMatch) ctx.signals = sigMatch[1].split(",").map(s => s.trim().replace(/["']/g, "")).filter(Boolean);
    const envMatch = stage1.match(/environment[:\s]+([^\n.]+)/i);
    if (envMatch) ctx.environmentContext = envMatch[1].trim();

    sendEvent({ type: "signal", data: { count: ctx.signals.length, signals: ctx.signals.slice(0, 8), domain: caseItem.priority } });

    // ─── STAGE 2: Quick-Fix Confidence Gate ───────────────────────────────────
    sendEvent({ type: "progress", stage: 2, message: "Stage 2/12: Quick-Fix Confidence Gate" });
    const qfMatch = stage1.match(/quick_fix_confidence[:\s]+(\d+)/i);
    const quickFixConfidence = qfMatch ? parseInt(qfMatch[1]) : 0;

    if (quickFixConfidence >= 92) {
      ctx.quickFixCandidate = { confidence: quickFixConfidence, fromStage: 1 };
      sendEvent({ type: "quick_fix_gate", passed: true, confidence: quickFixConfidence, message: `Quick-fix gate passed at ${quickFixConfidence}% confidence. Routing to Stage 12 for immediate resolution.` });

      const quickFix = await runStage(12,
        `You are Apphia. ${profileSuffix} A quick-fix gate at ${quickFixConfidence}% confidence was triggered. Provide immediate, human-readable resolution in two parts: executive summary and engineering detail.`,
        `Case: "${caseItem.title}"\nSignals: ${ctx.signals.join(", ")}\n\nProvide JSON: {"rootCause": string, "confidenceScore": number, "resolution": string, "executiveSummary": string, "engineeringDetail": string, "signals": string[], "failurePrediction": string, "selfAssessment": string}`
      );
      await finalizePipeline(id, caseItem, ctx, quickFix, attempt.id, pipelineStart, authReq.user.id, sendEvent);
      return;
    }

    sendEvent({ type: "quick_fix_gate", passed: false, confidence: quickFixConfidence, message: "Quick-fix confidence insufficient. Continuing full pipeline." });

    // ─── STAGE 3: KB Evidence Correlation (uses pre-retrieved knowledge) ──────
    sendEvent({ type: "progress", stage: 3, message: "Stage 3/12: KB Evidence Correlation" });
    const label3 = getStageName(3);
    sendEvent({ type: "stage_start", stage: 3, label: label3, totalStages: 12 });

    const kbSummary = ctx.kbEvidence.length > 0
      ? ctx.kbEvidence.map((r, i) => `[${i + 1}] ${r.title} (${r.domain}/${r.subdomain || "general"}) — confidence: ${r.confidence.toFixed(1)}%\nResolution hints: ${(r.resolutionSteps || []).slice(0, 2).join("; ")}`).join("\n\n")
      : "No KB matches found. Proceeding with first-principles analysis.";

    sendEvent({ type: "kb_evidence", data: { count: ctx.kbEvidence.length, topMatch: ctx.kbEvidence[0]?.title || null, topConfidence: ctx.kbEvidence[0]?.confidence || 0 } });
    sendEvent({ type: "stage_content", stage: 3, content: kbSummary });
    sendEvent({ type: "stage_complete", stage: 3, label: label3, tokenCount: kbSummary.length });
    ctx.tierOutputs.push(kbSummary);

    // ─── STAGE 4: UDO Graph Traversal & Environment Modeling ──────────────────
    sendEvent({ type: "progress", stage: 4, message: "Stage 4/12: UDO Graph Traversal & Environment Modeling" });
    const stage4 = await runStage(4,
      `You are Apphia. ${profileSuffix}`,
      `Case: "${caseItem.title}"\nDescription: ${caseItem.description || ""}\nSignals: ${ctx.signals.join(", ")}\nEnvironment Context: ${ctx.environmentContext || "Unknown"}\nKB Evidence:\n${ctx.kbEvidence.slice(0, 3).map(k => k.title).join(", ")}

Stage 4 — UDO (Unified Diagnostic Object) Graph Traversal:
1. Build the UDO dependency graph: map all affected components and relationships
2. Trace signal propagation from origin to observable symptoms
3. Model environment topology: services, databases, networks, cloud components
4. Map upstream causes and downstream impacts per component
5. Identify cross-component dependency chains and failure cascade paths
6. Cross-reference KB evidence with observed topology
7. Output structured component tree with impact annotations and propagation paths`
    );
    ctx.udoGraph = { traversalComplete: true, nodesAnalyzed: stage4.split("\n").length, summary: stage4.slice(0, 400) };
    ctx.tierOutputs.push(stage4);
    sendEvent({ type: "udo_graph", data: ctx.udoGraph });

    // ─── STAGE 5: Probabilistic Root Cause Ranking ────────────────────────────
    sendEvent({ type: "progress", stage: 5, message: "Stage 5/12: Probabilistic Root Cause Ranking" });
    const stage5 = await runStage(5,
      `You are Apphia. ${profileSuffix}`,
      `Case: "${caseItem.title}"\nSignals: ${ctx.signals.join(", ")}\nUDO traversal: ${JSON.stringify(ctx.udoGraph).slice(0, 500)}\nKB Evidence: ${ctx.kbEvidence.map(k => `${k.title} (${k.confidence.toFixed(0)}%)`).join(", ")}

Stage 5 — Probabilistic Root Cause Ranking:
1. Apply Bayesian reasoning weighted by KB evidence confidence scores
2. Output ONLY valid JSON array: [{"cause": "description", "confidence": 0-100, "reasoning": "evidence-backed explanation", "kbSupported": true/false}, ...]
3. Consider compound failures and multi-cause scenarios
4. Factor in signal correlation strength, UDO path distances, and KB match confidence
5. Include at least 3 candidates ranked by confidence
6. If top candidate confidence >= 90%, include flag: HIGH_CONFIDENCE_RESOLVED`
    );
    ctx.tierOutputs.push(stage5);
    try {
      const rcMatch = stage5.match(/\[[\s\S]*?\]/);
      if (rcMatch) ctx.rootCauses = JSON.parse(rcMatch[0]);
    } catch {
      ctx.rootCauses = [{ cause: "See analysis output", confidence: 70, reasoning: "Probabilistic ranking in diagnostic output", kbSupported: false }];
    }

    const topConfidence = ctx.rootCauses[0]?.confidence || 0;
    sendEvent({ type: "root_causes", data: { candidates: ctx.rootCauses.length, topConfidence, rootCauses: ctx.rootCauses.slice(0, 3) } });

    if (topConfidence >= 90 || stage5.includes("HIGH_CONFIDENCE_RESOLVED")) {
      sendEvent({ type: "confidence_gate", passed: true, confidence: topConfidence, message: `Confidence gate passed at ${topConfidence}%. Routing to synthesis.` });
      const earlyFinal = await runStage(12,
        `You are Apphia. ${profileSuffix} High-confidence root cause identified. Provide complete resolution.`,
        buildFinalPrompt(caseItem, ctx), false
      );
      await finalizePipeline(id, caseItem, ctx, earlyFinal, attempt.id, pipelineStart, authReq.user.id, sendEvent);
      return;
    }

    sendEvent({ type: "confidence_gate", passed: false, confidence: topConfidence, message: "Confidence insufficient. Continuing deep analysis." });

    // ─── STAGE 6: Hypothesis Validation & Evidence Scoring ────────────────────
    sendEvent({ type: "progress", stage: 6, message: "Stage 6/12: Hypothesis Validation & Evidence Scoring" });
    const stage6 = await runStage(6,
      `You are Apphia. ${profileSuffix}`,
      `Case: "${caseItem.title}"\nTop root causes: ${JSON.stringify(ctx.rootCauses.slice(0, 3))}\nAll signals: ${ctx.signals.join(", ")}\nKB Evidence: ${ctx.kbEvidence.map(k => `${k.title}: ${(k.symptoms || []).slice(0, 2).join(", ")}`).join(" | ")}

Stage 6 — Hypothesis Validation & Evidence Scoring:
1. Validate each top root cause hypothesis against observed signals
2. Assign evidence strength scores (0-100) per hypothesis
3. Check for contradicting evidence that invalidates any candidate
4. Cross-reference with KB resolution patterns to assess feasibility
5. Identify which KB resolution steps apply to each validated hypothesis
6. Output: evidence_scores: [{"cause": string, "evidenceScore": number, "validated": boolean, "contradictions": string[]}]`
    );
    ctx.tierOutputs.push(stage6);

    // ─── STAGE 7: Guardrails Check ────────────────────────────────────────────
    sendEvent({ type: "progress", stage: 7, message: "Stage 7/12: Guardrails & Safety Validation" });
    const stage7 = await runStage(7,
      `You are Apphia. ${profileSuffix} You are the guardrails validation engine. Ensure no destructive or unsafe recommendations pass through.`,
      `Case: "${caseItem.title}"\nValidated root causes: ${JSON.stringify(ctx.rootCauses.slice(0, 2))}\nAll signals: ${ctx.signals.join(", ")}

Stage 7 — Guardrails & Safety Validation:
1. Check each proposed remediation step for: data loss risk, service disruption risk, security implications
2. Validate that recommendations are reversible or have documented rollback paths
3. Flag any steps that require elevated permissions or maintenance windows
4. Verify no cascading risk of worsening the incident
5. Output: guardrails_status: PASS|FAIL, risk_level: low|medium|high|critical, flagged_steps: [...], approved_steps: [...]`,
      false
    );
    ctx.tierOutputs.push(stage7);
    ctx.guardrailsPassed = !stage7.toLowerCase().includes("guardrails_status: fail");
    sendEvent({ type: "guardrails", data: { passed: ctx.guardrailsPassed, riskLevel: ctx.guardrailsPassed ? "acceptable" : "elevated" } });

    // ─── STAGE 8: Cost Estimation & Approval Gate ─────────────────────────────
    sendEvent({ type: "progress", stage: 8, message: "Stage 8/12: Cost Estimation & Approval Gate" });
    const stage8 = await runStage(8,
      `You are Apphia. ${profileSuffix}`,
      `Case: "${caseItem.title}"\nRoot causes: ${JSON.stringify(ctx.rootCauses.slice(0, 2))}\nGuardrails passed: ${ctx.guardrailsPassed}\nKB estimated time: ${ctx.kbEvidence[0] ? "See KB" : "Unknown"}

Stage 8 — Cost Estimation & Approval Gate:
1. Estimate remediation complexity: low|medium|high|critical
2. Estimate engineer-hours required
3. Estimate risk of downtime and its duration
4. Assess whether automated resolution is viable or human approval is required
5. Output: cost_estimate: low|medium|high|critical, hours_estimate: number, human_approval_required: true|false, automation_viable: true|false`,
      false
    );
    ctx.tierOutputs.push(stage8);
    const costMatch = stage8.match(/cost_estimate:\s*(low|medium|high|critical)/i);
    ctx.costEstimate = costMatch ? costMatch[1] : "medium";
    sendEvent({ type: "cost_gate", data: { costEstimate: ctx.costEstimate, automationViable: !stage8.toLowerCase().includes("human_approval_required: true") } });

    // ─── STAGE 9: Autonomous Action Planning ──────────────────────────────────
    sendEvent({ type: "progress", stage: 9, message: "Stage 9/12: Autonomous Action Planning" });
    const stage9 = await runStage(9,
      `You are Apphia. ${profileSuffix}`,
      `Case: "${caseItem.title}"\nRoot causes: ${JSON.stringify(ctx.rootCauses.slice(0, 2))}\nCost estimate: ${ctx.costEstimate}\nGuardrails: ${ctx.guardrailsPassed ? "PASSED" : "FAILED"}\nKB resolution patterns: ${ctx.kbEvidence.slice(0, 2).map(k => (k.resolutionSteps || []).slice(0, 3).join("; ")).join(" | ")}

Stage 9 — Autonomous Action Planning:
1. Select the optimal resolution playbook or build a custom action plan
2. Sequence remediation steps with clear dependencies and ordering
3. Identify which steps can be automated vs. which require human action
4. Define success criteria and verification checkpoints for each step
5. Include rollback trigger conditions for each risky step
6. Output structured action plan: [{step: number, action: string, automated: boolean, verificationStep: string, rollbackCondition: string}]`
    );
    ctx.tierOutputs.push(stage9);
    sendEvent({ type: "action_plan", data: { stepsPlanned: (stage9.match(/"step":/g) || []).length } });

    // ─── STAGE 10: Resolution Synthesis ───────────────────────────────────────
    sendEvent({ type: "progress", stage: 10, message: "Stage 10/12: Resolution Synthesis" });
    const stage10 = await runStage(10,
      `You are Apphia. ${profileSuffix}`,
      `Case: "${caseItem.title}"\nDescription: ${caseItem.description || ""}\nConfirmed root causes: ${JSON.stringify(ctx.rootCauses.slice(0, 2))}\nKB evidence: ${ctx.kbEvidence.map(k => k.title).join(", ")}\nAction plan stage: completed\nCost estimate: ${ctx.costEstimate}

Stage 10 — Resolution Synthesis:
1. Synthesize a comprehensive resolution plan integrating all pipeline findings
2. Provide exact step-by-step remediation with commands where applicable
3. Include verification steps to confirm resolution at each phase
4. Cross-reference KB-proven resolution patterns
5. Address the root cause definitively, not just symptoms
6. Include expected timeline and resource requirements`
    );
    ctx.tierOutputs.push(stage10);

    // ─── STAGE 11: Self-Assessment & Failure Prediction ───────────────────────
    sendEvent({ type: "progress", stage: 11, message: "Stage 11/12: Self-Assessment & Failure Prediction" });
    const stage11 = await runStage(11,
      `You are Apphia. ${profileSuffix}`,
      `Pipeline completed analysis for: "${caseItem.title}"\nSignals found: ${ctx.signals.length}\nKB matches: ${ctx.kbEvidence.length}\nRoot causes ranked: ${ctx.rootCauses.length}\nCost estimate: ${ctx.costEstimate}

Stage 11 — Self-Assessment & Failure Prediction:
1. Self-assessment: rate analysis quality 1-10 (thoroughness, confidence, evidence strength)
2. Identify gaps in the analysis or areas of uncertainty
3. Failure prediction: probability of recurrence in 30/90/365 days
4. Recommend monitoring and alerting configuration
5. Suggest preventive measures and architectural improvements
6. Output format includes self_score (1-10), recurrence_risk (low/medium/high), monitoring_recommendations`,
      false
    );
    ctx.tierOutputs.push(stage11);

    // ─── STAGE 12: Dual-Output Translation ────────────────────────────────────
    sendEvent({ type: "progress", stage: 12, message: "Stage 12/12: Dual-Output Translation" });
    const stage12 = await runStage(12,
      `You are Apphia. ${profileSuffix} Provide final structured output with both executive and engineering translations.`,
      buildFinalPrompt(caseItem, ctx), false
    );
    ctx.tierOutputs.push(stage12);

    await finalizePipeline(id, caseItem, ctx, stage12, attempt.id, pipelineStart, authReq.user.id, sendEvent);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Diagnostic pipeline error";
    await db.update(casesTable).set({ status: "open" }).where(eq(casesTable.id, id));
    await trackEvent({ userId: authReq.user.id, eventType: "pipeline_error", entityId: String(id), metadata: { error: message } });
    sendEvent({ type: "system_error", message, isSystemError: true, userMessage: "A platform error occurred. The case has been reset and can be re-submitted at no cost." });
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

function buildFinalPrompt(caseItem: Case, ctx: PipelineContext): string {
  return `Case: "${caseItem.title}"
Description: ${caseItem.description || ""}
Signals: ${ctx.signals.join(", ")}
Root causes: ${JSON.stringify(ctx.rootCauses.slice(0, 3))}
KB evidence: ${ctx.kbEvidence.map(k => k.title).join(", ")}
Cost estimate: ${ctx.costEstimate}
Guardrails: ${ctx.guardrailsPassed ? "PASSED" : "FAILED"}
Total pipeline stages completed before this: ${ctx.tierOutputs.length}

Provide JSON with this exact structure:
{
  "rootCause": "primary root cause in one sentence",
  "confidenceScore": 0-100,
  "resolution": "complete resolution steps",
  "executiveSummary": "non-technical 2-3 sentence summary for executives",
  "engineeringDetail": "precise technical detail for engineers with commands and configs",
  "signals": ["array", "of", "key", "signals"],
  "failurePrediction": "likelihood and conditions for recurrence",
  "selfAssessment": "Apphia's self-rating of analysis quality (1-10) with reasoning",
  "preventiveMeasures": ["list", "of", "preventive", "actions"],
  "monitoringRecommendations": ["alert", "conditions", "to", "configure"]
}`;
}

async function finalizePipeline(
  id: number, caseItem: Case, ctx: PipelineContext, finalOutput: string,
  attemptId: number, pipelineStart: number, userId: string,
  sendEvent: (data: Record<string, unknown>) => void
) {
  let summary: {
    rootCause?: string; confidenceScore?: number; resolution?: string;
    executiveSummary?: string; engineeringDetail?: string; signals?: string[];
    failurePrediction?: string; selfAssessment?: string;
    preventiveMeasures?: string[]; monitoringRecommendations?: string[];
  } = {};
  try {
    const jsonMatch = finalOutput.match(/\{[\s\S]*\}/);
    summary = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch {
    summary = { rootCause: "Analysis complete", confidenceScore: 75, resolution: "Review diagnostic output", selfAssessment: "Standard analysis completed" };
  }

  const totalDurationMs = Date.now() - pipelineStart;

  await db.update(casesTable).set({
    status: "resolved",
    rootCause: summary.rootCause || "Analysis complete",
    resolution: summary.resolution || "Review output",
    confidenceScore: summary.confidenceScore || 75,
    signals: summary.signals || ctx.signals,
    resolvedAt: new Date(),
  }).where(eq(casesTable.id, id));

  await db.update(diagnosticAttemptsTable).set({
    status: "completed",
    completedAt: new Date(),
    signals: ctx.signals,
    rootCauses: ctx.rootCauses,
    confidenceScore: summary.confidenceScore || 75,
    costTokens: ctx.totalTokens,
    udoGraph: { ...ctx.udoGraph, citedKbNodeIds: ctx.kbEvidence.map(k => k.id) },
  }).where(eq(diagnosticAttemptsTable.id, attemptId));

  await trackEvent({
    userId, eventType: "pipeline_complete", entityType: "case", entityId: String(id),
    confidenceScore: summary.confidenceScore, durationMs: totalDurationMs,
    tokenCount: ctx.totalTokens,
    metadata: { stagesCompleted: ctx.tierOutputs.length, kbMatchCount: ctx.kbEvidence.length, costEstimate: ctx.costEstimate },
  });

  if (ctx.kbEvidence[0]) {
    await updateErrorPattern(ctx.kbEvidence[0].domain, id, ctx.kbEvidence[0].externalId, summary.confidenceScore);
  }

  if (ctx.kbEvidence.length > 0) {
    const citedIds = ctx.kbEvidence.map(k => k.id);
    try {
      await pool.query(
        `UPDATE knowledge_nodes SET confidence_score = LEAST(1.0, confidence_score + 0.01) WHERE id = ANY($1::int[])`,
        [citedIds]
      );
    } catch { /* non-critical */ }
  }

  sendEvent({
    type: "complete",
    summary: {
      ...summary,
      executiveSummary: summary.executiveSummary,
      engineeringDetail: summary.engineeringDetail,
      kbMatches: ctx.kbEvidence.length,
      stagesCompleted: ctx.tierOutputs.length,
      totalDurationMs,
      preventiveMeasures: summary.preventiveMeasures,
      monitoringRecommendations: summary.monitoringRecommendations,
    },
  });
}

router.post("/cases/batch", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const parsed = RunBatchDiagnosticsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const { caseIds } = parsed.data;
  const sendEvent = (data: Record<string, unknown>) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  sendEvent({ type: "batch_start", total: caseIds.length });

  await Promise.allSettled(caseIds.map(async (caseId: number, index: number) => {
    const [c] = await db.select().from(casesTable)
      .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, authReq.user.id)));
    if (!c) { sendEvent({ type: "case_error", caseId, error: "Not found" }); return; }

    sendEvent({ type: "case_start", caseId, index });

    const kbResults = await kbSemanticSearch(`${c.title} ${c.description || ""}`, undefined, 3);
    const kbContext = kbResults.length > 0
      ? `KB evidence: ${kbResults.map(k => k.title).join(", ")}`
      : "No KB match found";

    const response = await openai.chat.completions.create({
      model: "gpt-4o", max_completion_tokens: 2048,
      messages: [
        { role: "system", content: `You are Apphia. Provide a rapid diagnostic summary. ${kbContext}. Respond as JSON: {rootCause: string, confidenceScore: number, resolution: string, signals: string[]}` },
        { role: "user", content: `Diagnose: ${c.title} - ${c.description || "No details"}` },
      ],
    });

    let result: { rootCause?: string; confidenceScore?: number; resolution?: string; signals?: string[] } = {};
    try {
      const text = response.choices[0]?.message?.content || "{}";
      const match = text.match(/\{[\s\S]*\}/);
      result = match ? JSON.parse(match[0]) : {};
    } catch {
      result = { rootCause: "Quick analysis complete", confidenceScore: 70, resolution: "Manual review recommended" };
    }

    await db.update(casesTable).set({
      status: "resolved", rootCause: result.rootCause, resolution: result.resolution,
      confidenceScore: result.confidenceScore, resolvedAt: new Date(),
    }).where(eq(casesTable.id, caseId));

    await trackEvent({ userId: authReq.user.id, eventType: "batch_case_resolved", entityId: String(caseId), confidenceScore: result.confidenceScore });
    sendEvent({ type: "case_complete", caseId, index, result });
  }));

  sendEvent({ type: "batch_complete", total: caseIds.length });
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

interface PipelineContext {
  signals: string[];
  udoGraph: Record<string, unknown>;
  rootCauses: Array<{ cause: string; confidence: number; reasoning: string; kbSupported?: boolean }>;
  tierOutputs: string[];
  kbEvidence: Array<{ id: number; externalId: string; title: string; domain: string; subdomain: string | null; resolutionSteps: string[] | null; symptoms: string[] | null; selfHealable: string | null; confidence: number; method: string }>;
  environmentContext: string | null;
  quickFixCandidate: { confidence: number; fromStage: number } | null;
  playbookId: string | null;
  costEstimate: string;
  guardrailsPassed: boolean;
  totalTokens: number;
}

function getStageName(stage: number): string {
  const names: Record<number, string> = {
    1: "Classification & Typed Signal Extraction",
    2: "Quick-Fix Confidence Gate",
    3: "KB Semantic Retrieval & Evidence Correlation",
    4: "UDO Graph Traversal & Environment Modeling",
    5: "Probabilistic Root Cause Ranking",
    6: "Hypothesis Validation & Evidence Scoring",
    7: "Guardrails & Safety Validation",
    8: "Cost Estimation & Approval Gate",
    9: "Autonomous Action Planning",
    10: "Resolution Synthesis",
    11: "Self-Assessment & Failure Prediction",
    12: "Dual-Output Translation",
  };
  return names[stage] || `Stage ${stage}`;
}

export default router;
