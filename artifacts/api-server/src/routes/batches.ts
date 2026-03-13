import { Router, type IRouter, type Response } from "express";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { db, batchesTable, batchCasesTable, casesTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import type { AuthenticatedRequest } from "../types";
import { getTierLimits } from "../middleware/tierGating";

const router: IRouter = Router();

class Semaphore {
  private queue: (() => void)[] = [];
  private active = 0;
  constructor(private max: number) {}
  async acquire(): Promise<void> {
    if (this.active < this.max) {
      this.active++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(() => { this.active++; resolve(); });
    });
  }
  release(): void {
    this.active--;
    const next = this.queue.shift();
    if (next) next();
  }
  getActive(): number { return this.active; }
}

const userSemaphores = new Map<string, Semaphore>();
const globalSemaphore = new Semaphore(20);

function getUserSemaphore(userId: string, limit: number): Semaphore {
  let sem = userSemaphores.get(userId);
  if (!sem) {
    sem = new Semaphore(limit);
    userSemaphores.set(userId, sem);
  }
  return sem;
}

const OPENAI_TIMEOUT_MS = 120000;
const RETRY_DELAY_MS = 2000;

function isTransientError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("429") || msg.includes("rate limit")) return true;
    if (msg.includes("timeout") || msg.includes("timed out")) return true;
    if (msg.includes("econnreset") || msg.includes("econnrefused")) return true;
    if (msg.includes("500") || msg.includes("502") || msg.includes("503") || msg.includes("504")) return true;
    if (msg.includes("network") || msg.includes("fetch failed")) return true;
  }
  return false;
}

function isSystemError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("case not found")) return false;
  }
  return true;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("OpenAI request timed out")), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

async function countUserCasesForQuota(userId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(casesTable)
    .where(
      and(
        eq(casesTable.userId, userId),
        inArray(casesTable.status, ["resolved", "in_progress"])
      )
    );
  return Number(result[0]?.count || 0);
}

router.get("/batches", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
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
  const authReq = req as unknown as AuthenticatedRequest;
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

  const ownedCases = await db
    .select({ id: casesTable.id })
    .from(casesTable)
    .where(
      and(
        eq(casesTable.userId, authReq.user.id),
        inArray(casesTable.id, caseIds)
      )
    );
  const ownedIds = new Set(ownedCases.map((c) => c.id));
  const invalidIds = caseIds.filter((id) => !ownedIds.has(id));
  if (invalidIds.length > 0) {
    res.status(403).json({
      error: "Invalid case IDs",
      message: `The following case IDs do not belong to you or do not exist: ${invalidIds.join(", ")}`,
    });
    return;
  }

  const quotaCount = await countUserCasesForQuota(authReq.user.id);
  const alreadyCounted = await db
    .select({ count: sql<number>`count(*)` })
    .from(casesTable)
    .where(
      and(
        eq(casesTable.userId, authReq.user.id),
        inArray(casesTable.id, caseIds),
        inArray(casesTable.status, ["resolved", "in_progress"])
      )
    );
  const newCasesCount = caseIds.length - Number(alreadyCounted[0]?.count || 0);
  if (quotaCount + newCasesCount > limits.maxCases) {
    res.status(403).json({
      error: "Case quota exceeded",
      message: `This batch would bring your total to ${quotaCount + newCasesCount} cases. Your tier allows ${limits.maxCases}. Only resolved and in-progress cases count toward your quota.`,
      currentCount: quotaCount,
      limit: limits.maxCases,
    });
    return;
  }

  const runningBatchCases = await db
    .select({ count: sql<number>`count(*)` })
    .from(batchCasesTable)
    .innerJoin(batchesTable, eq(batchCasesTable.batchId, batchesTable.id))
    .where(
      and(
        eq(batchesTable.userId, authReq.user.id),
        eq(batchesTable.status, "running"),
        inArray(batchCasesTable.status, ["pending", "running"])
      )
    );

  const inFlightCount = Number(runningBatchCases[0]?.count || 0);
  if (inFlightCount >= limits.maxBatchConcurrency) {
    res.status(429).json({
      error: "Concurrency limit reached",
      message: `You have ${inFlightCount} cases in flight. Your tier allows ${limits.maxBatchConcurrency} concurrent cases. Wait for current cases to complete before submitting a new batch.`,
      inFlightCount,
      limit: limits.maxBatchConcurrency,
    });
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
  const authReq = req as unknown as AuthenticatedRequest;
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

router.get("/batches/:id/progress", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
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

  const completedCases = cases.filter((c) => c.status === "completed").length;
  const failedCases = cases.filter((c) => c.status === "failed").length;
  const systemErrorCases = cases.filter((c) => c.status === "system_error").length;

  const progress = {
    batchId: batch.id,
    status: batch.status,
    totalCases: batch.totalCases,
    completedCases,
    failedCases,
    systemErrorCases,
    cases: cases.map((c) => ({
      caseId: c.caseId,
      status: c.status,
      errorType: c.errorType,
      errorMessage: c.errorMessage,
      startedAt: c.startedAt,
      completedAt: c.completedAt,
    })),
  };

  res.json(progress);
});

router.post("/batches/:id/cancel", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [updated] = await db
    .update(batchesTable)
    .set({ status: "cancelled", completedAt: new Date() })
    .where(and(eq(batchesTable.id, id), eq(batchesTable.userId, authReq.user.id)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Batch not found" });
    return;
  }

  await db.update(batchCasesTable)
    .set({ status: "cancelled", completedAt: new Date() })
    .where(
      and(
        eq(batchCasesTable.batchId, id),
        eq(batchCasesTable.status, "pending")
      )
    );

  res.json(updated);
});

router.post("/batches/:id/cases/:caseId/pause", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const batchId = parseInt(req.params.id, 10);
  const caseId = parseInt(req.params.caseId, 10);

  const [batch] = await db.select().from(batchesTable)
    .where(and(eq(batchesTable.id, batchId), eq(batchesTable.userId, authReq.user.id)));
  if (!batch) { res.status(404).json({ error: "Batch not found" }); return; }

  const [updated] = await db.update(batchCasesTable)
    .set({ status: "paused" })
    .where(and(
      eq(batchCasesTable.batchId, batchId),
      eq(batchCasesTable.caseId, caseId),
      eq(batchCasesTable.status, "pending")
    ))
    .returning();

  if (!updated) { res.status(404).json({ error: "Case not found or not pausable" }); return; }
  res.json({ success: true, batchCase: updated });
});

router.post("/batches/:id/cases/:caseId/cancel", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const batchId = parseInt(req.params.id, 10);
  const caseId = parseInt(req.params.caseId, 10);

  const [batch] = await db.select().from(batchesTable)
    .where(and(eq(batchesTable.id, batchId), eq(batchesTable.userId, authReq.user.id)));
  if (!batch) { res.status(404).json({ error: "Batch not found" }); return; }

  const [updated] = await db.update(batchCasesTable)
    .set({ status: "cancelled", completedAt: new Date() })
    .where(and(
      eq(batchCasesTable.batchId, batchId),
      eq(batchCasesTable.caseId, caseId),
      inArray(batchCasesTable.status, ["pending", "paused"])
    ))
    .returning();

  if (!updated) { res.status(404).json({ error: "Case not found or not cancellable" }); return; }
  res.json({ success: true, batchCase: updated });
});

router.post("/batches/:id/cases/:caseId/retry", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const batchId = parseInt(req.params.id, 10);
  const caseId = parseInt(req.params.caseId, 10);

  const [batch] = await db.select().from(batchesTable)
    .where(and(eq(batchesTable.id, batchId), eq(batchesTable.userId, authReq.user.id)));
  if (!batch) { res.status(404).json({ error: "Batch not found" }); return; }

  const [updated] = await db.update(batchCasesTable)
    .set({ status: "pending", errorType: null, errorMessage: null, startedAt: null, completedAt: null })
    .where(and(
      eq(batchCasesTable.batchId, batchId),
      eq(batchCasesTable.caseId, caseId),
      inArray(batchCasesTable.status, ["failed", "system_error", "cancelled", "paused"])
    ))
    .returning();

  if (!updated) { res.status(404).json({ error: "Case not found or not retriable" }); return; }

  if (batch.status === "completed" || batch.status === "cancelled") {
    await db.update(batchesTable)
      .set({ status: "running", completedAt: null })
      .where(eq(batchesTable.id, batchId));
  }

  res.json({ success: true, batchCase: updated });
});

async function runCaseDiagnostic(
  caseId: number,
  batchId: number,
  userId: string
): Promise<Record<string, unknown>> {
  await db.update(batchCasesTable).set({ status: "running", startedAt: new Date() })
    .where(and(eq(batchCasesTable.batchId, batchId), eq(batchCasesTable.caseId, caseId)));

  const [c] = await db.select().from(casesTable)
    .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, userId)));

  if (!c) throw new Error("Case not found");

  await db.update(casesTable).set({ status: "in_progress" }).where(eq(casesTable.id, caseId));

  const response = await withTimeout(
    openai.chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 4096,
      messages: [
        { role: "system", content: "You are Apphia. Provide a diagnostic summary as JSON: {rootCause: string, confidenceScore: number, resolution: string, signals: string[]}" },
        { role: "user", content: `Diagnose: ${c.title} - ${c.description || "No details"}` },
      ],
    }),
    OPENAI_TIMEOUT_MS
  );

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
}

async function markCaseFailed(
  caseId: number,
  batchId: number,
  userId: string,
  previousStatus: string,
  error: unknown,
  errorType: "system_error" | "failed"
): Promise<void> {
  if (errorType === "system_error") {
    await db.update(casesTable).set({ status: previousStatus })
      .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, userId)));
  }

  const errMsg = error instanceof Error ? error.message : "Unknown error";
  await db.update(batchCasesTable).set({
    status: errorType,
    errorType,
    errorMessage: errMsg,
    completedAt: new Date(),
  }).where(and(eq(batchCasesTable.batchId, batchId), eq(batchCasesTable.caseId, caseId)));
}

async function executeBatchAsync(batchId: number, caseIds: number[], userId: string, concurrencyLimit: number) {
  const userSem = getUserSemaphore(userId, concurrencyLimit);

  let completed = 0;
  let failed = 0;
  let systemErrors = 0;

  type CaseResult =
    | { status: "completed"; result: Record<string, unknown> }
    | { status: "failed" }
    | { status: "system_error" }
    | { status: "skipped" };

  const caseStatuses = new Map<number, string>();
  for (const caseId of caseIds) {
    const [c] = await db.select().from(casesTable)
      .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, userId)));
    caseStatuses.set(caseId, c?.status || "open");
  }

  const results = await Promise.allSettled(
    caseIds.map(async (caseId): Promise<CaseResult> => {
      const [currentBatch] = await db.select().from(batchesTable).where(eq(batchesTable.id, batchId));
      if (currentBatch?.status === "cancelled") return { status: "skipped" };

      const previousStatus = caseStatuses.get(caseId) || "open";

      await userSem.acquire();
      try {
        await globalSemaphore.acquire();
        try {
          const [latestBatch] = await db.select().from(batchesTable).where(eq(batchesTable.id, batchId));
          if (latestBatch?.status === "cancelled") return { status: "skipped" };

          try {
            const result = await runCaseDiagnostic(caseId, batchId, userId);
            return { status: "completed", result };
          } catch (firstError) {
            if (isTransientError(firstError)) {
              await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
              try {
                const result = await runCaseDiagnostic(caseId, batchId, userId);
                return { status: "completed", result };
              } catch (retryError) {
                const retryErrType = isSystemError(retryError) ? "system_error" as const : "failed" as const;
                await markCaseFailed(caseId, batchId, userId, previousStatus, retryError, retryErrType);
                return { status: retryErrType };
              }
            }

            if (isSystemError(firstError)) {
              await markCaseFailed(caseId, batchId, userId, previousStatus, firstError, "system_error");
              return { status: "system_error" };
            }

            await markCaseFailed(caseId, batchId, userId, previousStatus, firstError, "failed");
            return { status: "failed" };
          }
        } finally {
          globalSemaphore.release();
        }
      } finally {
        userSem.release();
      }
    })
  );

  for (const r of results) {
    if (r.status === "fulfilled") {
      if (r.value.status === "completed") completed++;
      else if (r.value.status === "failed") failed++;
      else if (r.value.status === "system_error") systemErrors++;
    } else if (r.status === "rejected") {
      failed++;
    }
  }

  const [currentBatch] = await db.select().from(batchesTable).where(eq(batchesTable.id, batchId));
  if (currentBatch?.status === "cancelled") return;

  let finalStatus = "completed";
  if (completed === 0 && (failed + systemErrors) > 0) finalStatus = "failed";

  const crossCasePatterns = await detectCrossCasePatterns(batchId, userId);

  await db.update(batchesTable).set({
    status: finalStatus,
    completedCases: completed,
    failedCases: failed,
    systemErrorCases: systemErrors,
    completedAt: new Date(),
    crossCasePatterns,
  }).where(and(eq(batchesTable.id, batchId), eq(batchesTable.status, "running")));
}

async function detectCrossCasePatterns(batchId: number, userId: string): Promise<Record<string, unknown>> {
  const completedCases = await db
    .select({
      id: casesTable.id,
      priority: casesTable.priority,
      status: casesTable.status,
      rootCause: casesTable.rootCause,
      resolution: casesTable.resolution,
    })
    .from(casesTable)
    .innerJoin(batchCasesTable, eq(batchCasesTable.caseId, casesTable.id))
    .where(
      and(
        eq(batchCasesTable.batchId, batchId),
        eq(batchCasesTable.status, "completed")
      )
    );

  if (completedCases.length === 0) return {};

  const priorityCounts = new Map<string, number>();
  const rootCauseKeywords = new Map<string, number>();

  for (const c of completedCases) {
    if (c.priority) priorityCounts.set(c.priority, (priorityCounts.get(c.priority) || 0) + 1);
    if (c.rootCause) {
      const words = c.rootCause.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
      for (const word of words) {
        rootCauseKeywords.set(word, (rootCauseKeywords.get(word) || 0) + 1);
      }
    }
  }

  const priorityBreakdown = [...priorityCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([priority, count]) => ({ priority, count, pct: Math.round((count / completedCases.length) * 100) }));

  const repeatedKeywords = [...rootCauseKeywords.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word, count]) => ({ keyword: word, count }));

  const dominantPriority = priorityBreakdown[0]?.priority;

  return {
    summary: `Analyzed ${completedCases.length} completed cases`,
    priorityBreakdown,
    dominantPriority,
    repeatedRootCauseKeywords: repeatedKeywords,
    commonPattern: repeatedKeywords.length > 0
      ? `Recurring theme: "${repeatedKeywords[0].keyword}" appears in ${repeatedKeywords[0].count} case root causes`
      : "No dominant cross-case pattern detected",
    detectedAt: new Date().toISOString(),
  };
}

router.post("/batches/:id/cases", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const batchId = parseInt(req.params.id, 10);
  const { caseIds } = req.body as { caseIds: number[] };
  if (!caseIds?.length) { res.status(400).json({ error: "caseIds required" }); return; }

  const [batch] = await db.select().from(batchesTable)
    .where(and(eq(batchesTable.id, batchId), eq(batchesTable.userId, authReq.user.id)));
  if (!batch) { res.status(404).json({ error: "Batch not found" }); return; }
  if (batch.status === "cancelled" || batch.status === "completed") {
    res.status(409).json({ error: `Cannot add cases to a ${batch.status} batch` }); return;
  }

  const ownedCases = await db.select({ id: casesTable.id }).from(casesTable)
    .where(and(eq(casesTable.userId, authReq.user.id), inArray(casesTable.id, caseIds)));
  const ownedIds = new Set(ownedCases.map((c) => c.id));
  const invalidIds = caseIds.filter((id) => !ownedIds.has(id));
  if (invalidIds.length > 0) {
    res.status(403).json({ error: "Invalid case IDs", invalidIds }); return;
  }

  const existingCases = await db.select({ caseId: batchCasesTable.caseId }).from(batchCasesTable)
    .where(and(eq(batchCasesTable.batchId, batchId), inArray(batchCasesTable.caseId, caseIds)));
  const existingIds = new Set(existingCases.map((c) => c.caseId));
  const newCaseIds = caseIds.filter((id) => !existingIds.has(id));

  if (newCaseIds.length === 0) {
    res.status(409).json({ error: "All specified cases are already in this batch" }); return;
  }

  for (const caseId of newCaseIds) {
    await db.insert(batchCasesTable).values({ batchId, caseId, status: "pending" });
  }

  await db.update(batchesTable)
    .set({ totalCases: batch.totalCases + newCaseIds.length })
    .where(eq(batchesTable.id, batchId));

  const { storage: storageModule } = await import("../storage");
  const user = await storageModule.getUser(authReq.user.id);
  const limits = getTierLimits(user?.subscriptionTier || "free");

  executeBatchAsync(batchId, newCaseIds, authReq.user.id, limits.maxBatchConcurrency);

  res.status(201).json({ added: newCaseIds.length, caseIds: newCaseIds });
});

export default router;
