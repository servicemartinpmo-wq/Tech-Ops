import { Router, type IRouter, type Response } from "express";
import { eq, desc, and, sql, gte } from "drizzle-orm";
import {
  db, pool, casesTable, analyticsEventsTable, errorPatternsTable,
  diagnosticAttemptsTable, escalationHistoryTable, connectorHealthHistoryTable,
  knowledgeNodesTable,
} from "@workspace/db";
import type { AuthenticatedRequest } from "../types";
import { requireFeature } from "../middleware/tierGating";

const router: IRouter = Router();

const ANALYTICS = "analytics";

function parseDays(daysStr?: string): { days: number; since: Date } {
  const days = Math.min(Math.max(parseInt(daysStr || "30", 10) || 30, 1), 365);
  return { days, since: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
}

router.get("/analytics/case-volume", requireFeature(ANALYTICS), async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { days, since } = parseDays(req.query.days as string);

  const result = await pool.query(
    `SELECT
      DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')::date as day,
      count(*) as total,
      count(*) FILTER (WHERE priority = 'critical') as critical,
      count(*) FILTER (WHERE priority = 'high') as high,
      count(*) FILTER (WHERE priority = 'medium') as medium,
      count(*) FILTER (WHERE priority = 'low') as low
    FROM cases
    WHERE user_id = $1 AND created_at >= $2
    GROUP BY day ORDER BY day ASC`,
    [authReq.user.id, since.toISOString()]
  );

  res.json({ period: { days, since: since.toISOString() }, data: result.rows });
});

router.get("/analytics/resolution-times", requireFeature(ANALYTICS), async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { days, since } = parseDays(req.query.days as string);

  const result = await pool.query(
    `SELECT
      priority,
      round(avg(extract(epoch from (resolved_at - created_at)) / 3600)::numeric, 1) as avg_hours,
      round(min(extract(epoch from (resolved_at - created_at)) / 3600)::numeric, 1) as min_hours,
      round(max(extract(epoch from (resolved_at - created_at)) / 3600)::numeric, 1) as max_hours,
      count(*) as count
    FROM cases
    WHERE user_id = $1 AND status = 'resolved' AND resolved_at IS NOT NULL AND created_at >= $2
    GROUP BY priority ORDER BY
      CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END`,
    [authReq.user.id, since.toISOString()]
  );

  res.json({ period: { days, since: since.toISOString() }, data: result.rows });
});

router.get("/analytics/sla-compliance", requireFeature(ANALYTICS), async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { days, since } = parseDays(req.query.days as string);

  const result = await pool.query(
    `SELECT
      count(*) as total,
      count(*) FILTER (WHERE sla_status = 'on_track' OR (status = 'resolved' AND resolved_at <= sla_deadline)) as compliant,
      count(*) FILTER (WHERE sla_status = 'breached' OR (status = 'resolved' AND resolved_at > sla_deadline)) as breached,
      count(*) FILTER (WHERE status = 'resolved') as resolved,
      count(*) FILTER (WHERE status = 'open') as open_cases,
      count(*) FILTER (WHERE status = 'in_progress') as in_progress
    FROM cases
    WHERE user_id = $1 AND created_at >= $2`,
    [authReq.user.id, since.toISOString()]
  );

  const row = result.rows[0] || { total: 0, compliant: 0, breached: 0, resolved: 0, open_cases: 0, in_progress: 0 };
  const total = Number(row.total);
  const compliant = Number(row.compliant);
  const complianceRate = total > 0 ? Math.round((compliant / total) * 100) : 100;

  res.json({
    period: { days, since: since.toISOString() },
    total, compliant, breached: Number(row.breached), resolved: Number(row.resolved),
    openCases: Number(row.open_cases), inProgress: Number(row.in_progress), complianceRate,
  });
});

router.get("/analytics/connector-health", requireFeature(ANALYTICS), async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { days, since } = parseDays(req.query.days as string);
  const rawLimit = parseInt((req.query.limit as string) || "50", 10);
  const limitPerConnector = Math.min(isNaN(rawLimit) ? 50 : rawLimit, 200);

  const result = await pool.query(
    `SELECT connector_name, status, latency_ms, checked_at
    FROM (
      SELECT connector_name, status, latency_ms, checked_at,
        ROW_NUMBER() OVER (PARTITION BY connector_name ORDER BY checked_at DESC) as rn
      FROM connector_health_history
      WHERE user_id = $1 AND checked_at >= $2
    ) ranked
    WHERE rn <= $3
    ORDER BY connector_name ASC, checked_at ASC`,
    [authReq.user.id, since.toISOString(), limitPerConnector]
  );

  const grouped: Record<string, Array<{ status: string; latencyMs: number | null; checkedAt: string }>> = {};
  for (const row of result.rows as Array<Record<string, unknown>>) {
    const name = String(row.connector_name);
    if (!grouped[name]) grouped[name] = [];
    grouped[name].push({
      status: String(row.status),
      latencyMs: row.latency_ms != null ? Number(row.latency_ms) : null,
      checkedAt: String(row.checked_at),
    });
  }

  res.json({ period: { days, since: since.toISOString() }, limitPerConnector, connectors: grouped });
});

router.get("/analytics/case-metrics", requireFeature(ANALYTICS), async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { days, since } = parseDays(req.query.days as string);

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

  const byDay = await pool.query(
    `SELECT
      DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')::date as day,
      count(*) as total,
      count(*) FILTER (WHERE status = 'resolved') as resolved,
      count(*) FILTER (WHERE priority = 'critical') as critical
    FROM cases
    WHERE user_id = $1 AND created_at >= $2
    GROUP BY day ORDER BY day ASC`,
    [authReq.user.id, since.toISOString()]
  );

  const avgConfidence = await db.select({
    avg: sql<number>`round(avg(confidence_score)::numeric, 1)`,
    max: sql<number>`max(confidence_score)`,
    min: sql<number>`min(confidence_score)`,
  }).from(casesTable).where(and(
    eq(casesTable.userId, authReq.user.id),
    gte(casesTable.createdAt, since)
  ));

  const avgResolutionTime = await pool.query(
    `SELECT
      round(avg(extract(epoch from (resolved_at - created_at)) / 60)::numeric, 1) as avg_minutes,
      count(*) as resolved_count
    FROM cases
    WHERE user_id = $1 AND status = 'resolved' AND resolved_at IS NOT NULL AND created_at >= $2`,
    [authReq.user.id, since.toISOString()]
  );

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

router.get("/analytics/error-trends", requireFeature(ANALYTICS), async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { days, since } = parseDays(req.query.days as string);
  const { limit: limitStr } = req.query as { limit?: string };
  const limit = Math.min(parseInt(limitStr || "20", 10) || 20, 100);

  const patterns = await db.select().from(errorPatternsTable)
    .where(gte(errorPatternsTable.createdAt, since))
    .orderBy(desc(errorPatternsTable.occurrenceCount))
    .limit(limit);

  const trendByDomain = await db.select({
    domain: errorPatternsTable.domain,
    totalOccurrences: sql<number>`sum(occurrence_count)`,
    patternCount: sql<number>`count(*)`,
    avgConfidence: sql<number>`round(avg(avg_confidence)::numeric, 2)`,
  }).from(errorPatternsTable)
    .where(gte(errorPatternsTable.createdAt, since))
    .groupBy(errorPatternsTable.domain).orderBy(desc(sql`sum(occurrence_count)`));

  const recentEscalations = await db.select({
    toTier: escalationHistoryTable.toTier,
    count: sql<number>`count(*)`,
  }).from(escalationHistoryTable)
    .where(gte(escalationHistoryTable.createdAt, since))
    .groupBy(escalationHistoryTable.toTier);

  res.json({
    period: { days, since: since.toISOString() },
    topPatterns: patterns,
    domainTrends: trendByDomain,
    escalationBreakdown: Object.fromEntries(recentEscalations.map(r => [r.toTier, Number(r.count)])),
    totalPatterns: patterns.length,
  });
});

router.get("/analytics/error-categories", requireFeature(ANALYTICS), async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { days, since } = parseDays(req.query.days as string);

  // Keyword synonyms for well-known KB domains (used to broaden case-title matching)
  const DOMAIN_SYNONYMS: Record<string, string[]> = {
    connectivity:  ["network", "connect", "timeout", "dns", "socket", "ping", "firewall", "vpn", "proxy", "port"],
    auth:          ["login", "auth", "password", "token", "session", "permission", "401", "403", "access denied", "credential"],
    performance:   ["slow", "latency", "memory", "cpu", "high load", "bottleneck", "response time", "leak", "throughput"],
    database:      ["database", "postgres", "mysql", "sql", "query", "deadlock", "migration", "db error", "connection pool"],
    deployment:    ["deploy", "container", "docker", "kubernetes", "pod", "crash", "restart", "build", "pipeline", "ci/cd"],
    api:           ["api", "endpoint", "rest", "webhook", "integration", "payload", "response", "request", "http"],
    storage:       ["disk", "storage", "file", "bucket", "upload", "s3", "volume", "space", "quota"],
    security:      ["security", "vulnerability", "breach", "exploit", "malware", "attack", "ssl", "certificate", "tls"],
    configuration: ["config", "environment", "env var", "setting", "misconfigured", "yaml", "json", "toml"],
  };

  // Pull canonical domains from the knowledge base
  const kbDomainsRaw = await db
    .selectDistinct({ domain: knowledgeNodesTable.domain })
    .from(knowledgeNodesTable)
    .orderBy(knowledgeNodesTable.domain);

  // Build classification list: KB domains first, fall back to DOMAIN_SYNONYMS keys for any missing
  const seenDomains = new Set<string>();
  const classifiers: Array<{ domain: string; label: string; keywords: string[] }> = [];
  for (const { domain } of kbDomainsRaw) {
    if (!domain || seenDomains.has(domain)) continue;
    seenDomains.add(domain);
    const synonyms = DOMAIN_SYNONYMS[domain.toLowerCase()] ?? [];
    classifiers.push({
      domain,
      label: domain.charAt(0).toUpperCase() + domain.slice(1).replace(/_/g, " "),
      keywords: [domain.toLowerCase(), ...synonyms],
    });
  }
  // Supplement with any synonym-only domains not already represented by KB
  for (const [dom, syns] of Object.entries(DOMAIN_SYNONYMS)) {
    if (!seenDomains.has(dom)) {
      classifiers.push({
        domain: dom,
        label: dom.charAt(0).toUpperCase() + dom.slice(1).replace(/_/g, " "),
        keywords: [dom, ...syns],
      });
    }
  }

  // Fetch case titles/descriptions in the period for this user
  const cases = await pool.query(
    `SELECT title, description FROM cases WHERE user_id = $1 AND created_at >= $2`,
    [authReq.user.id, since.toISOString()]
  );

  const domainCounts: Record<string, number> = {};
  for (const clf of classifiers) { domainCounts[clf.domain] = 0; }
  let unmatched = 0;

  for (const row of cases.rows as Array<{ title: string; description?: string }>) {
    const text = `${row.title || ""} ${row.description || ""}`.toLowerCase();
    let matched = false;
    for (const clf of classifiers) {
      if (clf.keywords.some(kw => text.includes(kw))) {
        domainCounts[clf.domain]++;
        matched = true;
        break;
      }
    }
    if (!matched) unmatched++;
  }

  const total = cases.rows.length;
  const categories = classifiers
    .map(clf => ({
      domain:     clf.domain,
      label:      clf.label,
      count:      domainCounts[clf.domain] || 0,
      percentage: total > 0 ? Math.round(((domainCounts[clf.domain] || 0) / total) * 100) : 0,
    }))
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  if (unmatched > 0) {
    categories.push({ domain: "other", label: "Other", count: unmatched, percentage: total > 0 ? Math.round((unmatched / total) * 100) : 0 });
  }

  res.json({ period: { days, since: since.toISOString() }, totalCases: total, kbDomainCount: kbDomainsRaw.length, categories });
});

router.get("/analytics/pipeline-performance", requireFeature(ANALYTICS), async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { days, since } = parseDays(req.query.days as string);

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

router.get("/analytics/kpi", requireFeature(ANALYTICS), async (req, res: Response): Promise<void> => {
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
