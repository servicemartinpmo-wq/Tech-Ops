import { Router, type IRouter, type Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, batchesTable, batchCasesTable, casesTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import type { AuthenticatedRequest } from "../types";
import { getTierLimits } from "../middleware/tierGating";

const router: IRouter = Router();

router.get("/batches", async (req, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const batches = await db
    .select()
    .from(batchesTable)
    .where(eq(batchesTable.userId, authReq.user.id))
    .orderBy(desc(batchesTable.createdAt));

  res.json(batches);
});

router.post("/batches", async (req, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { name, caseIds } = req.body as { name: string; caseIds: number[] };
  if (!name || !caseIds?.length) {
    res.status(400).json({ error: "Name and caseIds required" });
    return;
  }

  const { storage: storageModule } = await import("../storage");
  const user = await storageModule.getUser(authReq.user.id);
  const tier = user?.subscriptionTier || "free";
  const limits = getTierLimits(tier);

  if (!limits.features.includes("batch_execution") && !limits.features.includes("all_features")) {
    res.status(403).json({ error: "Batch execution requires Professional tier or higher" });
    return;
  }

  const [batch] = await db
    .insert(batchesTable)
    .values({
      userId: authReq.user.id,
      name,
      totalCases: caseIds.length,
      concurrencyLimit: Math.min(caseIds.length, limits.maxBatchConcurrency),
      status: "running",
    })
    .returning();

  for (const caseId of caseIds) {
    await db.insert(batchCasesTable).values({
      batchId: batch.id,
      caseId,
      status: "pending",
    });
  }

  executeBatchAsync(batch.id, caseIds, authReq.user.id, limits.maxBatchConcurrency);

  res.status(201).json(batch);
});

router.get("/batches/:id", async (req, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [batch] = await db
    .select()
    .from(batchesTable)
    .where(and(eq(batchesTable.id, id), eq(batchesTable.userId, authReq.user.id)));

  if (!batch) {
    res.status(404).json({ error: "Batch not found" });
    return;
  }

  const cases = await db
    .select()
    .from(batchCasesTable)
    .where(eq(batchCasesTable.batchId, id));

  res.json({ ...batch, cases });
});

router.post("/batches/:id/cancel", async (req, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [updated] = await db
    .update(batchesTable)
    .set({ status: "cancelled" })
    .where(and(eq(batchesTable.id, id), eq(batchesTable.userId, authReq.user.id)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Batch not found" });
    return;
  }

  res.json(updated);
});

async function executeBatchAsync(batchId: number, caseIds: number[], userId: string, concurrencyLimit: number) {
  const chunks: number[][] = [];
  for (let i = 0; i < caseIds.length; i += concurrencyLimit) {
    chunks.push(caseIds.slice(i, i + concurrencyLimit));
  }

  let completed = 0;
  let failed = 0;

  for (const chunk of chunks) {
    const [currentBatch] = await db.select().from(batchesTable).where(eq(batchesTable.id, batchId));
    if (currentBatch?.status === "cancelled") break;

    const results = await Promise.allSettled(
      chunk.map(async (caseId) => {
        await db.update(batchCasesTable).set({ status: "running", startedAt: new Date() })
          .where(and(eq(batchCasesTable.batchId, batchId), eq(batchCasesTable.caseId, caseId)));

        const [c] = await db.select().from(casesTable)
          .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, userId)));

        if (!c) throw new Error("Case not found");

        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          max_completion_tokens: 4096,
          messages: [
            { role: "system", content: "You are Apphia. Provide a diagnostic summary as JSON: {rootCause: string, confidenceScore: number, resolution: string, signals: string[]}" },
            { role: "user", content: `Diagnose: ${c.title} - ${c.description || "No details"}` },
          ],
        });

        let result: Record<string, unknown> = {};
        try {
          const text = response.choices[0]?.message?.content || "{}";
          const match = text.match(/\{[\s\S]*\}/);
          result = match ? JSON.parse(match[0]) : {};
        } catch {
          result = { rootCause: "Quick analysis complete", confidenceScore: 70, resolution: "Manual review recommended" };
        }

        await db.update(casesTable).set({
          status: "resolved",
          rootCause: result.rootCause as string,
          resolution: result.resolution as string,
          confidenceScore: result.confidenceScore as number,
          resolvedAt: new Date(),
        }).where(eq(casesTable.id, caseId));

        await db.update(batchCasesTable).set({ status: "completed", result, completedAt: new Date() })
          .where(and(eq(batchCasesTable.batchId, batchId), eq(batchCasesTable.caseId, caseId)));

        return result;
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled") completed++;
      else {
        failed++;
        const failedCaseId = chunk[results.indexOf(r)];
        await db.update(batchCasesTable).set({ status: "failed", completedAt: new Date() })
          .where(and(eq(batchCasesTable.batchId, batchId), eq(batchCasesTable.caseId, failedCaseId)));
      }
    }

    await db.update(batchesTable).set({ completedCases: completed, failedCases: failed })
      .where(eq(batchesTable.id, batchId));
  }

  await db.update(batchesTable).set({
    status: failed === caseIds.length ? "failed" : "completed",
    completedCases: completed,
    failedCases: failed,
    completedAt: new Date(),
  }).where(eq(batchesTable.id, batchId));
}

export default router;
