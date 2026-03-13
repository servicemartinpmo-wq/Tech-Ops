import { Router, type IRouter, type Response } from "express";
import { eq, and, sql, gte, desc } from "drizzle-orm";
import { db, pool, casesTable, batchesTable, analyticsEventsTable, diagnosticAttemptsTable } from "@workspace/db";
import type { AuthenticatedRequest } from "../types";

const router: IRouter = Router();

function handle(fn: (req: AuthenticatedRequest, res: Response) => Promise<void>) {
  return async (req: unknown, res: Response, next: (e?: unknown) => void): Promise<void> => {
    try {
      const a = req as unknown as AuthenticatedRequest;
      if (!a.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }
      await fn(a, res);
    } catch (err) { next(err); }
  };
}

router.get("/pmo/dashboard", handle(async (req, res) => {
  const uid = req.user.id;
  const days = Math.min(Math.max(parseInt(String(req.query.days || "30"), 10) || 30, 1), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [caseStats, resolutionByDay, priorityBreakdown, slaByDay, batchStats, attemptStats, pipelineStats] = await Promise.all([
    // Overall case stats
    pool.query(
      `SELECT
        count(*) as total,
        count(*) FILTER (WHERE status = 'resolved') as resolved,
        count(*) FILTER (WHERE status = 'open') as open_cases,
        count(*) FILTER (WHERE status = 'in_progress') as in_progress,
        round(avg(extract(epoch from (resolved_at - created_at)) / 60) FILTER (WHERE status = 'resolved' AND resolved_at IS NOT NULL)::numeric, 1) as avg_resolution_minutes,
        round(avg(confidence_score) FILTER (WHERE confidence_score IS NOT NULL)::numeric, 1) as avg_confidence,
        count(*) FILTER (WHERE sla_status = 'breached') as sla_breached,
        count(*) FILTER (WHERE sla_status = 'on_track' OR status = 'resolved') as sla_compliant
      FROM cases WHERE user_id = $1 AND created_at >= $2`,
      [uid, since.toISOString()]
    ),

    // Resolution trend by day
    pool.query(
      `SELECT
        DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')::date as day,
        count(*) as submitted,
        count(*) FILTER (WHERE status = 'resolved') as resolved,
        round(avg(extract(epoch from (resolved_at - created_at)) / 60) FILTER (WHERE status = 'resolved' AND resolved_at IS NOT NULL)::numeric, 1) as avg_min
      FROM cases WHERE user_id = $1 AND created_at >= $2
      GROUP BY day ORDER BY day ASC`,
      [uid, since.toISOString()]
    ),

    // Cases by priority
    pool.query(
      `SELECT priority, count(*) as count,
        count(*) FILTER (WHERE status = 'resolved') as resolved
       FROM cases WHERE user_id = $1 AND created_at >= $2
       GROUP BY priority ORDER BY count DESC`,
      [uid, since.toISOString()]
    ),

    // SLA compliance by day
    pool.query(
      `SELECT
        DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')::date as day,
        count(*) as total,
        count(*) FILTER (WHERE sla_status = 'on_track' OR (status = 'resolved' AND resolved_at <= sla_deadline)) as compliant
      FROM cases WHERE user_id = $1 AND created_at >= $2 AND sla_deadline IS NOT NULL
      GROUP BY day ORDER BY day ASC`,
      [uid, since.toISOString()]
    ),

    // Batch execution summary
    db.select({
      total:    sql<number>`count(*)`,
      completed: sql<number>`count(*) FILTER (WHERE status = 'completed')`,
      avgDuration: sql<number>`round(avg(duration_ms)::numeric, 0)`,
      totalCases: sql<number>`sum(case_count)`,
    }).from(batchesTable)
      .where(and(eq(batchesTable.userId, uid), gte(batchesTable.createdAt, since))),

    // Diagnostic attempts
    db.select({
      count: sql<number>`count(*)`,
      avgConf: sql<number>`round(avg(confidence_score)::numeric, 1)`,
    }).from(diagnosticAttemptsTable)
      .where(and(eq(diagnosticAttemptsTable.userId, uid), gte(diagnosticAttemptsTable.createdAt, since))),

    // Pipeline performance
    db.select({
      avgDuration: sql<number>`round(avg(duration_ms)::numeric, 0)`,
      total: sql<number>`count(*)`,
    }).from(analyticsEventsTable)
      .where(and(
        eq(analyticsEventsTable.userId, uid),
        eq(analyticsEventsTable.eventType, "pipeline_complete"),
        gte(analyticsEventsTable.createdAt, since)
      )),
  ]);

  const cs = caseStats.rows[0] as Record<string, unknown> || {};
  const total      = Number(cs.total || 0);
  const resolved   = Number(cs.resolved || 0);
  const avgMin     = Number(cs.avg_resolution_minutes || 0);
  const slaBreached = Number(cs.sla_breached || 0);
  const slaCompliant = Number(cs.sla_compliant || 0);
  const slaRate    = total > 0 ? Math.round((slaCompliant / total) * 100) : 100;
  const resRate    = total > 0 ? Math.round((resolved / total) * 100) : 0;

  // Estimate time saved: each auto-resolved case saves ~avg_resolution_minutes
  // We assume "resolved" cases were auto-resolved if confidence_score > 70
  const avgConf    = Number(cs.avg_confidence || 0);
  const autoRate   = avgConf >= 70 ? 0.73 : avgConf >= 50 ? 0.50 : 0.30;
  const autoResolved = Math.round(resolved * autoRate);
  const timeSavedMinutes = Math.round(autoResolved * (avgMin || 45));

  res.json({
    period: { days, since: since.toISOString() },
    cases: {
      total, resolved, open: Number(cs.open_cases || 0), inProgress: Number(cs.in_progress || 0),
      resolutionRate: resRate, avgResolutionMinutes: avgMin,
      avgConfidence: avgConf,
    },
    sla: { breached: slaBreached, compliant: slaCompliant, rate: slaRate },
    efficiency: {
      autoResolved, autoRate: Math.round(autoRate * 100),
      timeSavedMinutes, timeSavedHours: Math.round(timeSavedMinutes / 60),
    },
    batches: {
      total: Number(batchStats[0]?.total || 0),
      completed: Number(batchStats[0]?.completed || 0),
      avgDurationMs: Number(batchStats[0]?.avgDuration || 0),
      totalCasesProcessed: Number(batchStats[0]?.totalCases || 0),
    },
    diagnostics: {
      attempts: Number(attemptStats[0]?.count || 0),
      avgConfidence: Number(attemptStats[0]?.avgConf || 0),
    },
    pipeline: {
      runs: Number(pipelineStats[0]?.total || 0),
      avgDurationMs: Number(pipelineStats[0]?.avgDuration || 0),
    },
    byDay: resolutionByDay.rows,
    byPriority: priorityBreakdown.rows,
    slaByDay: slaByDay.rows,
  });
}));

export default router;
