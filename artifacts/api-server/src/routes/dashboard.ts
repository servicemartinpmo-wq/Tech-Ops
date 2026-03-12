import { Router, type IRouter } from "express";
import { eq, sql, desc, and, count } from "drizzle-orm";
import { db, casesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard/stats", async (req: any, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const userId = req.user.id;

  const [totalResult] = await db
    .select({ count: count() })
    .from(casesTable)
    .where(eq(casesTable.userId, userId));

  const [openResult] = await db
    .select({ count: count() })
    .from(casesTable)
    .where(and(eq(casesTable.userId, userId), eq(casesTable.status, "open")));

  const [resolvedResult] = await db
    .select({ count: count() })
    .from(casesTable)
    .where(and(eq(casesTable.userId, userId), eq(casesTable.status, "resolved")));

  const avgTimeResult = await db.execute(sql`
    SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) as avg_time
    FROM cases
    WHERE user_id = ${userId} AND resolved_at IS NOT NULL
  `);

  const avgTime = avgTimeResult.rows[0]?.avg_time
    ? Math.round(Number(avgTimeResult.rows[0].avg_time) / 3600)
    : null;

  const { storage: storageModule } = await import("../storage");
  const user = await storageModule.getUser(userId);

  res.json({
    totalCases: totalResult.count,
    openCases: openResult.count,
    resolvedCases: resolvedResult.count,
    avgResolutionTime: avgTime,
    connectorHealth: { healthy: 3, degraded: 0, down: 0 },
    subscriptionTier: user?.subscriptionTier || "free",
  });
});

router.get("/dashboard/activity", async (req: any, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const limit = parseInt(req.query.limit as string) || 10;

  const recentCases = await db
    .select()
    .from(casesTable)
    .where(eq(casesTable.userId, req.user.id))
    .orderBy(desc(casesTable.updatedAt))
    .limit(limit);

  const activity = recentCases.map((c, i) => ({
    id: c.id,
    type: c.status === "resolved" ? "case_resolved" as const : "case_created" as const,
    message: c.status === "resolved"
      ? `Case "${c.title}" resolved with ${c.confidenceScore || 0}% confidence`
      : `Case "${c.title}" created`,
    timestamp: c.updatedAt.toISOString(),
    caseId: c.id,
  }));

  res.json(activity);
});

export default router;
