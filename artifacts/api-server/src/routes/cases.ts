import { Router, type IRouter, type Response } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, casesTable, diagnosticAttemptsTable } from "@workspace/db";
import { CreateCaseBody, UpdateCaseBody, RunBatchDiagnosticsBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import type { AuthenticatedRequest } from "../types";
import type { Case } from "@workspace/db";
import { getTierLimits } from "../middleware/tierGating";

const router: IRouter = Router();

router.get("/cases", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const statusFilter = req.query.status as string | undefined;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;

  const conditions = eq(casesTable.userId, authReq.user.id);

  const query = db
    .select()
    .from(casesTable)
    .where(statusFilter ? and(conditions, eq(casesTable.status, statusFilter)) : conditions)
    .orderBy(desc(casesTable.createdAt))
    .limit(limit)
    .offset(offset);

  const cases = await query;
  res.json(cases);
});

router.post("/cases", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const parsed = CreateCaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [newCase] = await db
    .insert(casesTable)
    .values({
      userId: authReq.user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority || "medium",
    })
    .returning();

  res.status(201).json(newCase);
});

router.get("/cases/:id", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [caseItem] = await db
    .select()
    .from(casesTable)
    .where(and(eq(casesTable.id, id), eq(casesTable.userId, authReq.user.id)));

  if (!caseItem) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

  res.json(caseItem);
});

router.patch("/cases/:id", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const parsed = UpdateCaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Partial<Case> = { ...parsed.data };
  if (parsed.data.status === "resolved") {
    updateData.resolvedAt = new Date();
  }

  const [updated] = await db
    .update(casesTable)
    .set(updateData)
    .where(and(eq(casesTable.id, id), eq(casesTable.userId, authReq.user.id)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

  res.json(updated);
});

router.post("/cases/:id/diagnose", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [caseItem] = await db
    .select()
    .from(casesTable)
    .where(and(eq(casesTable.id, id), eq(casesTable.userId, authReq.user.id)));

  if (!caseItem) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  await db
    .update(casesTable)
    .set({ status: "in_progress" })
    .where(eq(casesTable.id, id));

  const sendEvent = (data: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const pipelineContext: {
      signals: string[];
      udoGraph: Record<string, unknown>;
      rootCauses: Array<{ cause: string; confidence: number; reasoning: string }>;
      tierOutputs: string[];
    } = { signals: [], udoGraph: {}, rootCauses: [], tierOutputs: [] };

    sendEvent({ type: "progress", message: "Stage 1/7: Classification & Signal Extraction" });

    for (let tier = 1; tier <= 5; tier++) {
      const stageName = getStageLabel(tier);
      sendEvent({ type: "tier_start", tier, message: `${stageName}` });

      const [attempt] = await db.insert(diagnosticAttemptsTable).values({
        caseId: id,
        userId: authReq.user.id,
        tier,
        status: "running",
      }).returning();

      const tierPrompt = getTierPrompt(tier, caseItem, pipelineContext);

      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        max_completion_tokens: 8192,
        messages: [
          {
            role: "system",
            content: `You are Apphia, the diagnostic knowledge engine for Tech-Ops by Martin PMO. You are executing ${stageName} of the staged diagnostic pipeline. Be thorough, precise, and structured. Never refer to yourself as "AI" or "assistant". You are "the Apphia Engine" or "Apphia".`,
          },
          { role: "user", content: tierPrompt },
        ],
        stream: true,
      });

      let tierResponse = "";
      let tokenCount = 0;
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          tierResponse += content;
          tokenCount += content.length;
          sendEvent({ type: "diagnostic_content", tier, content });
        }
      }

      pipelineContext.tierOutputs.push(tierResponse);

      if (tier === 1) {
        const signalMatch = tierResponse.match(/signals?:?\s*\[(.*?)\]/is);
        if (signalMatch) {
          pipelineContext.signals = signalMatch[1].split(",").map(s => s.trim().replace(/"/g, ""));
        }
        sendEvent({ type: "signal", data: { extractedSignals: pipelineContext.signals.length, signals: pipelineContext.signals.slice(0, 5) } });
      }

      if (tier === 2) {
        pipelineContext.udoGraph = { traversalComplete: true, nodesAnalyzed: tierResponse.split("\n").length, tier2Summary: tierResponse.slice(0, 300) };
        sendEvent({ type: "udo_path", data: pipelineContext.udoGraph });
      }

      if (tier === 3) {
        try {
          const rcMatch = tierResponse.match(/\[[\s\S]*?\]/);
          if (rcMatch) {
            pipelineContext.rootCauses = JSON.parse(rcMatch[0]);
          }
        } catch {
          pipelineContext.rootCauses = [{ cause: "See analysis", confidence: 70, reasoning: "Probabilistic ranking in output" }];
        }
        sendEvent({ type: "progress", message: `Probabilistic ranking complete. ${pipelineContext.rootCauses.length} candidate root causes identified.` });

        const topConfidence = pipelineContext.rootCauses[0]?.confidence || 0;
        if (topConfidence >= 90) {
          sendEvent({ type: "progress", message: `High-confidence gate passed (${topConfidence}%). Skipping deeper tiers.` });
          await db.update(diagnosticAttemptsTable).set({ status: "completed", confidenceScore: topConfidence, completedAt: new Date(), signals: pipelineContext.signals, rootCauses: pipelineContext.rootCauses, costTokens: tokenCount }).where(eq(diagnosticAttemptsTable.id, attempt.id));
          break;
        }
      }

      if (tier === 4) {
        sendEvent({ type: "progress", message: "Stage 6/7: Guardrails validation & cost assessment" });
      }

      await db.update(diagnosticAttemptsTable).set({
        status: "completed",
        completedAt: new Date(),
        signals: tier === 1 ? pipelineContext.signals : undefined,
        udoGraph: tier === 2 ? pipelineContext.udoGraph : undefined,
        rootCauses: tier === 3 ? pipelineContext.rootCauses : undefined,
        confidenceScore: tier === 3 ? (pipelineContext.rootCauses[0]?.confidence || 70) : undefined,
        costTokens: tokenCount,
      }).where(eq(diagnosticAttemptsTable.id, attempt.id));

      sendEvent({ type: "tier_complete", tier, summary: tierResponse.slice(0, 200) });
    }

    sendEvent({ type: "progress", message: "Stage 7/7: Resolution synthesis & human-readable translation" });

    const finalStream = await openai.chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 8192,
      messages: [
        {
          role: "system",
          content: "You are Apphia. Synthesize all pipeline findings into a final diagnostic report. Provide JSON: {rootCause: string, confidenceScore: number, resolution: string, signals: string[], failurePrediction: string, selfAssessment: string}. The selfAssessment should rate Apphia's own analysis quality. failurePrediction should estimate risk of recurrence.",
        },
        {
          role: "user",
          content: `Case: ${caseItem.title}\nDescription: ${caseItem.description || "No description"}\nExtracted signals: ${pipelineContext.signals.join(", ")}\nRoot cause candidates: ${JSON.stringify(pipelineContext.rootCauses)}\n\nSynthesize final report with self-assessment and failure prediction.`,
        },
      ],
      stream: false,
    });

    let summary: { rootCause?: string; confidenceScore?: number; resolution?: string; signals?: string[]; failurePrediction?: string; selfAssessment?: string } = {};
    try {
      const responseText = finalStream.choices[0]?.message?.content || "{}";
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      summary = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      summary = { rootCause: "Analysis complete", confidenceScore: 75, resolution: "Review diagnostic output", signals: pipelineContext.signals, selfAssessment: "Standard analysis completed", failurePrediction: "Monitor recommended" };
    }

    await db
      .update(casesTable)
      .set({
        status: "resolved",
        rootCause: summary.rootCause || "Analysis complete",
        resolution: summary.resolution || "Review output",
        confidenceScore: summary.confidenceScore || 75,
        signals: summary.signals || pipelineContext.signals,
        resolvedAt: new Date(),
      })
      .where(eq(casesTable.id, id));

    sendEvent({ type: "complete", summary });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Diagnostic pipeline error";
    sendEvent({ type: "error", message });
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

router.post("/cases/batch", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const parsed = RunBatchDiagnosticsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const { caseIds } = parsed.data;

  const sendEvent = (data: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent({ type: "batch_start", total: caseIds.length });

  await Promise.allSettled(
    caseIds.map(async (caseId: number, index: number) => {
      const [c] = await db
        .select()
        .from(casesTable)
        .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, authReq.user.id)));

      if (!c) {
        sendEvent({ type: "case_error", caseId, error: "Not found" });
        return;
      }

      sendEvent({ type: "case_start", caseId, index });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        max_completion_tokens: 8192,
        messages: [
          { role: "system", content: "You are Apphia. Provide a quick diagnostic summary with rootCause, confidenceScore (0-100), and resolution. Respond as JSON." },
          { role: "user", content: `Diagnose: ${c.title} - ${c.description || "No details"}` },
        ],
      });

      let result: { rootCause?: string; confidenceScore?: number; resolution?: string } = {};
      try {
        const text = response.choices[0]?.message?.content || "{}";
        const match = text.match(/\{[\s\S]*\}/);
        result = match ? JSON.parse(match[0]) : {};
      } catch {
        result = { rootCause: "Quick analysis complete", confidenceScore: 70, resolution: "Manual review recommended" };
      }

      await db.update(casesTable).set({
        status: "resolved",
        rootCause: result.rootCause,
        resolution: result.resolution,
        confidenceScore: result.confidenceScore,
        resolvedAt: new Date(),
      }).where(eq(casesTable.id, caseId));

      sendEvent({ type: "case_complete", caseId, index, result });
    })
  );

  sendEvent({ type: "batch_complete", total: caseIds.length });
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

function getStageLabel(tier: number): string {
  switch (tier) {
    case 1: return "Stage 1/7: Classification & Typed Signal Extraction";
    case 2: return "Stage 2/7: UDO Graph Traversal & Environment Modeling";
    case 3: return "Stage 3/7: Probabilistic Root Cause Ranking";
    case 4: return "Stage 4/7: Deep Analysis with Guardrails & Cost Gate";
    case 5: return "Stage 5/7: Resolution Synthesis & Self-Assessment";
    default: return `Stage ${tier}: Analysis`;
  }
}

interface PipelineContext {
  signals: string[];
  udoGraph: Record<string, unknown>;
  rootCauses: Array<{ cause: string; confidence: number; reasoning: string }>;
  tierOutputs: string[];
}

function getTierPrompt(tier: number, caseItem: Case, context: PipelineContext): string {
  const base = `Case: "${caseItem.title}"\nDescription: ${caseItem.description || "No description provided"}\n\n`;

  switch (tier) {
    case 1:
      return base + `Tier 1 - Classification & Typed Signal Extraction:
1. Classify this issue into categories: infrastructure, database, network, application, security, performance, configuration.
2. Extract ALL observable signals as a typed array. Format signals as: signals: ["signal1", "signal2", ...]
3. Categorize each signal: (performance|connectivity|security|configuration|resource|data_integrity)
4. Identify the environment context (production/staging/dev, cloud provider, region if mentioned).
5. Flag any quick-fix candidates with confidence > 85% for the KB quick-fix gate.`;

    case 2:
      return base + `Tier 2 - UDO (Unified Diagnostic Object) Graph Traversal:
Previous signals extracted: ${context.signals.join(", ") || "None yet"}

1. Build the UDO dependency graph: map all affected components and their relationships.
2. Trace signal propagation paths from origin to observable symptoms.
3. Model the environment topology from the description and signals.
4. Identify upstream causes and downstream impacts for each component.
5. Map cross-component dependencies and failure cascade paths.
6. Output the traversal as a structured component tree with impact annotations.`;

    case 3:
      return base + `Tier 3 - Probabilistic Root Cause Ranking:
Extracted signals: ${context.signals.join(", ") || "From analysis"}
UDO traversal complete: ${context.udoGraph.traversalComplete ? "Yes" : "In progress"}

1. Apply Bayesian reasoning to rank root cause candidates.
2. Output as JSON array: [{cause: "description", confidence: 0-100, reasoning: "explanation"}, ...]
3. Consider compound failures and multi-cause scenarios.
4. Factor in signal correlation strength and UDO path distances.
5. Include at least 3 candidates, ranked by confidence.
6. Flag if top candidate confidence >= 90% (triggers confidence gate for early resolution).`;

    case 4:
      return base + `Tier 4 - Deep Analysis, Guardrails & Cost Gate:
Top root causes: ${JSON.stringify(context.rootCauses.slice(0, 3))}
All signals: ${context.signals.join(", ")}

1. Perform deep validation of top 3 root cause candidates.
2. Check for compound failures, cascading effects, and hidden dependencies.
3. Apply guardrails: verify no destructive recommendations, validate remediation safety.
4. Cost assessment: estimate remediation complexity (low/medium/high/critical).
5. Validate each hypothesis against the signal evidence.
6. Provide evidence-based confirmation or rejection for each candidate.`;

    case 5:
      return base + `Tier 5 - Resolution Synthesis, Self-Assessment & Failure Prediction:
Confirmed root causes: ${JSON.stringify(context.rootCauses.slice(0, 3))}
Pipeline signals: ${context.signals.join(", ")}

1. Synthesize a comprehensive resolution plan with step-by-step remediation.
2. Self-assessment: rate the analysis quality (thoroughness, confidence, evidence strength) on a 1-10 scale.
3. Failure prediction: estimate probability of recurrence and recommend monitoring.
4. Provide human-readable translation variants: executive summary (non-technical) and engineering detail.
5. Include preventive measures and long-term architectural recommendations.`;

    default:
      return base + "Provide a general diagnostic analysis.";
  }
}

export default router;
