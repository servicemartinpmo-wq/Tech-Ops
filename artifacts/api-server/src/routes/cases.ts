import { Router, type IRouter } from "express";
import { eq, desc, and, sql, count } from "drizzle-orm";
import { db, casesTable } from "@workspace/db";
import { CreateCaseBody, UpdateCaseBody, RunBatchDiagnosticsBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

router.get("/cases", async (req: any, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const statusFilter = req.query.status as string | undefined;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;

  let conditions = eq(casesTable.userId, req.user.id);

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

router.post("/cases", async (req: any, res): Promise<void> => {
  if (!req.isAuthenticated()) {
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
      userId: req.user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority || "medium",
    })
    .returning();

  res.status(201).json(newCase);
});

router.get("/cases/:id", async (req: any, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [caseItem] = await db
    .select()
    .from(casesTable)
    .where(and(eq(casesTable.id, id), eq(casesTable.userId, req.user.id)));

  if (!caseItem) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

  res.json(caseItem);
});

router.patch("/cases/:id", async (req: any, res): Promise<void> => {
  if (!req.isAuthenticated()) {
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

  const updateData: any = { ...parsed.data };
  if (parsed.data.status === "resolved") {
    updateData.resolvedAt = new Date();
  }

  const [updated] = await db
    .update(casesTable)
    .set(updateData)
    .where(and(eq(casesTable.id, id), eq(casesTable.userId, req.user.id)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

  res.json(updated);
});

router.post("/cases/:id/diagnose", async (req: any, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [caseItem] = await db
    .select()
    .from(casesTable)
    .where(and(eq(casesTable.id, id), eq(casesTable.userId, req.user.id)));

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

  const sendEvent = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    for (let tier = 1; tier <= 5; tier++) {
      sendEvent({ type: "tier_start", tier, message: `Starting Tier ${tier} analysis...` });

      const tierPrompt = getTierPrompt(tier, caseItem);

      const stream = await openai.chat.completions.create({
        model: "gpt-5.2",
        max_completion_tokens: 8192,
        messages: [
          {
            role: "system",
            content: `You are Apphia, the diagnostic knowledge engine for Tech-Ops by Martin PMO. You perform technology operations diagnostics. You are currently running Tier ${tier} of the diagnostic pipeline. Be thorough, professional, and specific. Never refer to yourself as "AI" or "assistant".`,
          },
          { role: "user", content: tierPrompt },
        ],
        stream: true,
      });

      let tierResponse = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          tierResponse += content;
          sendEvent({ type: "diagnostic_content", tier, content });
        }
      }

      sendEvent({ type: "tier_complete", tier, summary: tierResponse.slice(0, 200) });

      if (tier >= 3 && tierResponse.toLowerCase().includes("root cause identified")) {
        break;
      }
    }

    const finalStream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        {
          role: "system",
          content: "You are Apphia. Provide a final diagnostic summary with root cause, confidence score (0-100), and recommended resolution. Format as JSON: {rootCause: string, confidenceScore: number, resolution: string, signals: string[]}",
        },
        {
          role: "user",
          content: `Case: ${caseItem.title}\nDescription: ${caseItem.description || "No description"}\nProvide final diagnostic summary.`,
        },
      ],
      stream: false,
    });

    let summary: any = {};
    try {
      const responseText = finalStream.choices[0]?.message?.content || "{}";
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      summary = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      summary = { rootCause: "Analysis complete", confidenceScore: 75, resolution: "Review diagnostic output", signals: [] };
    }

    await db
      .update(casesTable)
      .set({
        status: "resolved",
        rootCause: summary.rootCause || "Analysis complete",
        resolution: summary.resolution || "Review output",
        confidenceScore: summary.confidenceScore || 75,
        signals: summary.signals || [],
        resolvedAt: new Date(),
      })
      .where(eq(casesTable.id, id));

    sendEvent({ type: "complete", summary });
  } catch (error: any) {
    sendEvent({ type: "error", message: error.message });
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

router.post("/cases/batch", async (req: any, res): Promise<void> => {
  if (!req.isAuthenticated()) {
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

  const sendEvent = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent({ type: "batch_start", total: caseIds.length });

  const results = await Promise.allSettled(
    caseIds.map(async (caseId: number, index: number) => {
      const [c] = await db
        .select()
        .from(casesTable)
        .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, req.user.id)));

      if (!c) {
        sendEvent({ type: "case_error", caseId, error: "Not found" });
        return;
      }

      sendEvent({ type: "case_start", caseId, index });

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        max_completion_tokens: 8192,
        messages: [
          { role: "system", content: "You are Apphia. Provide a quick diagnostic summary with rootCause, confidenceScore (0-100), and resolution. Respond as JSON." },
          { role: "user", content: `Diagnose: ${c.title} - ${c.description || "No details"}` },
        ],
      });

      let result: any = {};
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

function getTierPrompt(tier: number, caseItem: any): string {
  const base = `Case: "${caseItem.title}"\nDescription: ${caseItem.description || "No description provided"}\n\n`;

  switch (tier) {
    case 1:
      return base + "Tier 1 - Surface Signal Extraction: Identify all observable symptoms, error messages, and surface-level indicators. List each signal with its category (performance, connectivity, security, configuration, resource).";
    case 2:
      return base + "Tier 2 - UDO Traversal (Unified Diagnostic Object): Map the dependency tree of affected components. Identify upstream and downstream impacts. Trace signal propagation paths.";
    case 3:
      return base + "Tier 3 - Probabilistic Root Cause Ranking: Based on extracted signals and UDO traversal, rank the top 5 most likely root causes with confidence percentages. Explain the reasoning for each ranking.";
    case 4:
      return base + "Tier 4 - Deep System Analysis: Perform detailed analysis of the top root cause candidates. Check for compound failures, cascading effects, and hidden dependencies. Validate or invalidate each hypothesis.";
    case 5:
      return base + "Tier 5 - Resolution Synthesis: Synthesize all findings into a comprehensive resolution plan. Provide step-by-step remediation, preventive measures, and monitoring recommendations.";
    default:
      return base + "Provide a general diagnostic analysis.";
  }
}

export default router;
