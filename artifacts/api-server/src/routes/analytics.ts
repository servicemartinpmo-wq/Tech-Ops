import { Router, type IRouter, type Response } from "express";
import { eq, desc, and, sql, gte, lte } from "drizzle-orm";
import { db, casesTable, analyticsEventsTable, errorPatternsTable, diagnosticAttemptsTable, escalationHistoryTable } from "@workspace/db";
import type { AuthenticatedRequest } from "../types";

const router: IRouter = Router();

router.get("/analytics/case-metrics", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { days: daysStr } = req.query as { days?: string };
  const days = parseInt(daysStr || "30", 10) || 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const byStatus = await db.select({
    status: casesTable.status,
    count: sql<number>`count(*)`,
  }).from(casesTable).where(and(
    eq(casesTable.userId, authReq.user.id),
    gte(casesTable.createdAt, since)
  )).groupBy(casesTable.status);

  const byPriority = await db.select({
    priority: casesTable.priority,
    count: sql<number>`count(*)`,
  }).from(casesTable).where(and(
    eq(casesTable.userId, authReq.user.id),
    gte(casesTable.createdAt, since)
  )).groupBy(casesTable.priority);

  const byDay = await db.execute(sql.raw(`
    SELECT
      DATE_TRUNC('day', created_at AT TIME ZONE 'UTC') as day,
      count(*) as total,
      count(*) FILTER (WHERE status = 'resolved') as resolved,
      count(*) FILTER (WHERE priority = 'critical') as critical
    FROM cases
    WHERE user_id = '${authReq.user.id}'
    AND created_at >= '${since.toISOString()}'
    GROUP BY day
    ORDER BY day ASC
  `));

  const avgConfidence = await db.select({
    avg: sql<number>`round(avg(confidence_score)::numeric, 1)`,
    max: sql<number>`max(confidence_score)`,
    min: sql<number>`min(confidence_score)`,
  }).from(casesTable).where(and(
    eq(casesTable.userId, authReq.user.id),
    gte(casesTable.createdAt, since)
  ));

  const avgResolutionTime = await db.execute(sql.raw(`
    SELECT
      round(avg(extract(epoch from (resolved_at - created_at)) / 60)::numeric, 1) as avg_minutes,
      count(*) as resolved_count
    FROM cases
    WHERE user_id = '${authReq.user.id}'
    AND status = 'resolved'
    AND resolved_at IS NOT NULL
    AND created_at >= '${since.toISOString()}'
  `));

  const slaBreaches = await db.select({
    count: sql<number>`count(*)`,
  }).from(casesTable).where(and(
    eq(casesTable.userId, authReq.user.id),
    eq(casesTable.slaStatus, "breached"),
    gte(casesTable.createdAt, since)
  ));

  res.json({
    period: { days, since: since.toISOString() },
    byStatus: Object.fromEntries(byStatus.map(r => [r.status, Number(r.count)])),
    byPriority: Object.fromEntries(byPriority.map(r => [r.priority || "unset", Number(r.count)])),
    byDay: byDay.rows,
    confidence: {
      avg: Number(avgConfidence[0]?.avg || 0),
      max: Number(avgConfidence[0]?.max || 0),
      min: Number(avgConfidence[0]?.min || 0),
    },
    resolution: {
      avgMinutes: Number((avgResolutionTime.rows[0] as Record<string, unknown>)?.avg_minutes || 0),
      resolvedCount: Number((avgResolutionTime.rows[0] as Record<string, unknown>)?.resolved_count || 0),
    },
    slaBreaches: Number(slaBreaches[0]?.count || 0),
  });
});

router.get("/analytics/error-trends", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { limit: limitStr } = req.query as { limit?: string };
  const limit = Math.min(parseInt(limitStr || "20", 10) || 20, 100);

  const patterns = await db.select().from(errorPatternsTable)
    .orderBy(desc(errorPatternsTable.occurrenceCount))
    .limit(limit);

  const trendByDomain = await db.select({
    domain: errorPatternsTable.domain,
    totalOccurrences: sql<number>`sum(occurrence_count)`,
    patternCount: sql<number>`count(*)`,
    avgConfidence: sql<number>`round(avg(avg_confidence)::numeric, 2)`,
  }).from(errorPatternsTable).groupBy(errorPatternsTable.domain).orderBy(desc(sql`sum(occurrence_count)`));

  const recentEscalations = await db.select({
    toTier: escalationHistoryTable.toTier,
    count: sql<number>`count(*)`,
  }).from(escalationHistoryTable)
    .where(gte(escalationHistoryTable.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)))
    .groupBy(escalationHistoryTable.toTier);

  res.json({
    topPatterns: patterns,
    domainTrends: trendByDomain,
    escalationBreakdown: Object.fromEntries(recentEscalations.map(r => [r.toTier, Number(r.count)])),
    totalPatterns: patterns.length,
  });
});

router.get("/analytics/pipeline-performance", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { days: daysStr } = req.query as { days?: string };
  const days = parseInt(daysStr || "30", 10) || 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const stageStats = await db.select({
    stage: analyticsEventsTable.stage,
    avgDurationMs: sql<number>`round(avg(duration_ms)::numeric, 0)`,
    avgTokens: sql<number>`round(avg(token_count)::numeric, 0)`,
    count: sql<number>`count(*)`,
  }).from(analyticsEventsTable).where(and(
    eq(analyticsEventsTable.userId, authReq.user.id),
    eq(analyticsEventsTable.eventType, "pipeline_stage"),
    gte(analyticsEventsTable.createdAt, since)
  )).groupBy(analyticsEventsTable.stage).orderBy(analyticsEventsTable.stage);

  const pipelineStats = await db.select({
    avgDurationMs: sql<number>`round(avg(duration_ms)::numeric, 0)`,
    avgConfidence: sql<number>`round(avg(confidence_score)::numeric, 1)`,
    totalRuns: sql<number>`count(*)`,
    avgTokens: sql<number>`round(avg(token_count)::numeric, 0)`,
  }).from(analyticsEventsTable).where(and(
    eq(analyticsEventsTable.userId, authReq.user.id),
    eq(analyticsEventsTable.eventType, "pipeline_complete"),
    gte(analyticsEventsTable.createdAt, since)
  ));

  const errorRate = await db.select({
    count: sql<number>`count(*)`,
  }).from(analyticsEventsTable).where(and(
    eq(analyticsEventsTable.userId, authReq.user.id),
    eq(analyticsEventsTable.eventType, "pipeline_error"),
    gte(analyticsEventsTable.createdAt, since)
  ));

  const attemptStats = await db.select({
    avgConfidence: sql<number>`round(avg(confidence_score)::numeric, 1)`,
    count: sql<number>`count(*)`,
  }).from(diagnosticAttemptsTable)
    .where(and(
      eq(diagnosticAttemptsTable.userId, authReq.user.id),
      gte(diagnosticAttemptsTable.createdAt, since)
    ));

  res.json({
    period: { days, since: since.toISOString() },
    stageBreakdown: stageStats,
    overall: {
      avgDurationMs: Number(pipelineStats[0]?.avgDurationMs || 0),
      avgConfidenceScore: Number(pipelineStats[0]?.avgConfidence || 0),
      totalRuns: Number(pipelineStats[0]?.totalRuns || 0),
      avgTokensPerRun: Number(pipelineStats[0]?.avgTokens || 0),
      errorCount: Number(errorRate[0]?.count || 0),
      attemptCount: Number(attemptStats[0]?.count || 0),
    },
  });
});

router.get("/analytics/kpi", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [cases30, cases7, resolved30, resolved7, avgConf, slaBreaches] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(casesTable)
      .where(and(eq(casesTable.userId, authReq.user.id), gte(casesTable.createdAt, since30))),
    db.select({ count: sql<number>`count(*)` }).from(casesTable)
      .where(and(eq(casesTable.userId, authReq.user.id), gte(casesTable.createdAt, since7))),
    db.select({ count: sql<number>`count(*)` }).from(casesTable)
      .where(and(eq(casesTable.userId, authReq.user.id), eq(casesTable.status, "resolved"), gte(casesTable.createdAt, since30))),
    db.select({ count: sql<number>`count(*)` }).from(casesTable)
      .where(and(eq(casesTable.userId, authReq.user.id), eq(casesTable.status, "resolved"), gte(casesTable.createdAt, since7))),
    db.select({ avg: sql<number>`round(avg(confidence_score)::numeric, 1)` }).from(casesTable)
      .where(and(eq(casesTable.userId, authReq.user.id), eq(casesTable.status, "resolved"), gte(casesTable.createdAt, since30))),
    db.select({ count: sql<number>`count(*)` }).from(casesTable)
      .where(and(eq(casesTable.userId, authReq.user.id), eq(casesTable.slaStatus, "breached"), gte(casesTable.createdAt, since30))),
  ]);

  const total30 = Number(cases30[0]?.count || 0);
  const res30 = Number(resolved30[0]?.count || 0);
  const total7 = Number(cases7[0]?.count || 0);
  const res7 = Number(resolved7[0]?.count || 0);

  res.json({
    cases30d: total30,
    cases7d: total7,
    resolved30d: res30,
    resolved7d: res7,
    resolutionRate30d: total30 > 0 ? Math.round((res30 / total30) * 100) : 0,
    resolutionRate7d: total7 > 0 ? Math.round((res7 / total7) * 100) : 0,
    avgConfidence30d: Number(avgConf[0]?.avg || 0),
    slaBreaches30d: Number(slaBreaches[0]?.count || 0),
  });
});

export default router;
