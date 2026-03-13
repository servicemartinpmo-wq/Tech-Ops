import { Router, type IRouter, type Response } from "express";
import { db, casesTable, knowledgeNodesTable, knowledgeEdgesTable } from "@workspace/db";
import { eq, and, desc, sql, ilike, or, inArray } from "drizzle-orm";
import { classifySeverity, classifyIntent } from "../kb/knowledge-base";
import { buildDecisionTree } from "../kb/decision-engine";
import { getMonitorStats, subscribeToMonitorEvents } from "../kb/proactive-monitor";
import { buildSearchText, generateLocalEmbedding } from "../services/embeddings";
import { requireRole } from "../middleware/tierGating";
import type { AuthenticatedRequest } from "../types";

const router: IRouter = Router();

async function vectorSearch(query: string, options?: { domain?: string; limit?: number }): Promise<Array<Record<string, unknown>>> {
  const limit = options?.limit || 10;
  const queryEmbedding = generateLocalEmbedding(query);
  const embeddingStr = `[${queryEmbedding.join(",")}]`;
  const domainFilter = options?.domain
    ? `AND domain ILIKE '${options.domain.replace(/'/g, "''")}'`
    : "";

  const results = await db.execute(sql.raw(`
    SELECT
      id, external_id, domain, subdomain, title, type, description,
      symptoms, resolution_steps, tags, tier, self_healable,
      escalation_conditions, estimated_time, confidence_score,
      historical_success, search_text, created_at,
      1 - (embedding <=> '${embeddingStr}'::vector) as vector_similarity
    FROM knowledge_nodes
    WHERE embedding IS NOT NULL
    ${domainFilter}
    ORDER BY embedding <=> '${embeddingStr}'::vector
    LIMIT ${limit}
  `));

  return (results.rows || []) as Array<Record<string, unknown>>;
}

async function textSearch(query: string, options?: { domain?: string; limit?: number }): Promise<Array<Record<string, unknown>>> {
  const limit = options?.limit || 10;
  const cleanQuery = query.replace(/'/g, "''").toLowerCase();
  const domainFilter = options?.domain
    ? `AND domain ILIKE '${options.domain.replace(/'/g, "''")}'`
    : "";

  const results = await db.execute(sql.raw(`
    SELECT
      id, external_id, domain, subdomain, title, type, description,
      symptoms, resolution_steps, tags, tier, self_healable,
      escalation_conditions, estimated_time, confidence_score,
      historical_success, search_text, created_at,
      similarity(search_text, '${cleanQuery}') as trgm_similarity,
      ts_rank(to_tsvector('english', coalesce(search_text, '')), plainto_tsquery('english', '${cleanQuery}')) as fts_rank
    FROM knowledge_nodes
    WHERE (
      to_tsvector('english', coalesce(search_text, '')) @@ plainto_tsquery('english', '${cleanQuery}')
      OR similarity(search_text, '${cleanQuery}') > 0.03
    )
    ${domainFilter}
    ORDER BY (
      similarity(search_text, '${cleanQuery}') * 3.0 +
      ts_rank(to_tsvector('english', coalesce(search_text, '')), plainto_tsquery('english', '${cleanQuery}')) * 1.0 +
      confidence_score * 0.2
    ) DESC
    LIMIT ${limit}
  `));

  return (results.rows || []) as Array<Record<string, unknown>>;
}

async function searchKnowledge(query: string, options?: { domain?: string; limit?: number }) {
  const vectorResults = await vectorSearch(query, options);
  if (vectorResults.length > 0) {
    const topSim = parseFloat(String(vectorResults[0].vector_similarity || 0));
    if (topSim > 0.05) {
      return { results: vectorResults, method: "vector" as const };
    }
  }

  const textResults = await textSearch(query, options);
  if (textResults.length > 0) {
    return { results: textResults, method: "text" as const };
  }

  if (vectorResults.length > 0) {
    return { results: vectorResults, method: "vector" as const };
  }

  return { results: [], method: "none" as const };
}

function getSimilarityScore(row: Record<string, unknown>, method: string): number {
  if (method === "vector") {
    return parseFloat(String(row.vector_similarity || 0));
  }
  const trgm = parseFloat(String(row.trgm_similarity || 0));
  const fts = parseFloat(String(row.fts_rank || 0));
  return Math.min(1.0, trgm * 3.0 + fts * 0.5);
}

router.get("/kb/entries", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { domain, search, limit: limitStr } = req.query as { domain?: string; search?: string; limit?: string };
  const limit = Math.min(parseInt(limitStr || "50", 10) || 50, 200);

  if (search) {
    const { results } = await searchKnowledge(search, { domain, limit });
    const domains = [...new Set(results.map(r => String(r.domain)))];
    res.json({ entries: results, domains, total: results.length });
    return;
  }

  let query = db.select({
    id: knowledgeNodesTable.id,
    externalId: knowledgeNodesTable.externalId,
    domain: knowledgeNodesTable.domain,
    subdomain: knowledgeNodesTable.subdomain,
    title: knowledgeNodesTable.title,
    type: knowledgeNodesTable.type,
    description: knowledgeNodesTable.description,
    source: knowledgeNodesTable.source,
    symptoms: knowledgeNodesTable.symptoms,
    resolutionSteps: knowledgeNodesTable.resolutionSteps,
    tags: knowledgeNodesTable.tags,
    tier: knowledgeNodesTable.tier,
    selfHealable: knowledgeNodesTable.selfHealable,
    escalationConditions: knowledgeNodesTable.escalationConditions,
    estimatedTime: knowledgeNodesTable.estimatedTime,
    confidenceScore: knowledgeNodesTable.confidenceScore,
    historicalSuccess: knowledgeNodesTable.historicalSuccess,
    createdAt: knowledgeNodesTable.createdAt,
  }).from(knowledgeNodesTable).$dynamic();

  if (domain) {
    query = query.where(ilike(knowledgeNodesTable.domain, domain));
  }

  const entries = await query.orderBy(desc(knowledgeNodesTable.confidenceScore)).limit(limit);

  const domainRows = await db.selectDistinct({ domain: knowledgeNodesTable.domain }).from(knowledgeNodesTable);
  const domains = domainRows.map(r => r.domain);

  res.json({ entries, domains, total: entries.length });
});

router.get("/kb/entries/:id", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const idParam = req.params.id;
  const numericId = parseInt(idParam, 10);

  let entry;
  if (!isNaN(numericId)) {
    [entry] = await db.select().from(knowledgeNodesTable).where(eq(knowledgeNodesTable.id, numericId));
  }
  if (!entry) {
    [entry] = await db.select().from(knowledgeNodesTable).where(eq(knowledgeNodesTable.externalId, idParam));
  }

  if (!entry) { res.status(404).json({ error: "KB entry not found" }); return; }

  const edges = await db.select().from(knowledgeEdgesTable)
    .where(or(eq(knowledgeEdgesTable.nodeA, entry.id), eq(knowledgeEdgesTable.nodeB, entry.id)));

  const relatedIds = edges.map(e => e.nodeA === entry!.id ? e.nodeB : e.nodeA);
  let relatedNodes: Array<{ id: number; title: string; domain: string }> = [];
  if (relatedIds.length > 0) {
    relatedNodes = await db.select({
      id: knowledgeNodesTable.id,
      title: knowledgeNodesTable.title,
      domain: knowledgeNodesTable.domain,
    }).from(knowledgeNodesTable).where(inArray(knowledgeNodesTable.id, relatedIds));
  }

  res.json({ ...entry, edges, relatedNodes });
});

router.get("/kb/search", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { q, domain, limit: limitStr } = req.query as { q?: string; domain?: string; limit?: string };
  if (!q) { res.status(400).json({ error: "q query parameter is required" }); return; }

  const limit = Math.min(parseInt(limitStr || "10", 10) || 10, 50);

  const { results, method } = await searchKnowledge(q, { domain, limit });

  res.json({
    query: q,
    method,
    results: results.map((row) => ({
      ...row,
      similarity: getSimilarityScore(row, method),
    })),
    total: results.length,
  });
});

router.post("/kb/entries", requireRole("owner", "admin"), async (req, res: Response): Promise<void> => {
  const { externalId, domain, subdomain, title, type, description, symptoms, resolutionSteps, tags, tier, selfHealable, escalationConditions, estimatedTime } = req.body;

  if (!domain || !title) {
    res.status(400).json({ error: "domain and title are required" });
    return;
  }

  const searchText = buildSearchText({ domain, subdomain, title, symptoms, resolutionSteps, tags });
  const embedding = generateLocalEmbedding(searchText);

  const [node] = await db.insert(knowledgeNodesTable).values({
    externalId: externalId || `KB-${Date.now()}`,
    domain,
    subdomain: subdomain || null,
    title,
    type: type || "troubleshooting",
    description: description || null,
    source: "manual",
    symptoms: symptoms || [],
    resolutionSteps: resolutionSteps || [],
    tags: tags || [],
    tier: tier || null,
    selfHealable: selfHealable ? "true" : "false",
    escalationConditions: escalationConditions || [],
    estimatedTime: estimatedTime || null,
    searchText,
    embedding,
    confidenceScore: 0.5,
    historicalSuccess: 0.5,
  }).returning();

  res.status(201).json(node);
});

router.patch("/kb/entries/:id", requireRole("owner", "admin"), async (req, res: Response): Promise<void> => {
  const numericId = parseInt(req.params.id, 10);
  if (isNaN(numericId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [existing] = await db.select().from(knowledgeNodesTable).where(eq(knowledgeNodesTable.id, numericId));
  if (!existing) { res.status(404).json({ error: "KB entry not found" }); return; }

  const { domain, subdomain, title, type, description, symptoms, resolutionSteps, tags, tier, selfHealable, escalationConditions, estimatedTime } = req.body;

  const updates: Record<string, unknown> = {};
  if (domain !== undefined) updates.domain = domain;
  if (subdomain !== undefined) updates.subdomain = subdomain;
  if (title !== undefined) updates.title = title;
  if (type !== undefined) updates.type = type;
  if (description !== undefined) updates.description = description;
  if (symptoms !== undefined) updates.symptoms = symptoms;
  if (resolutionSteps !== undefined) updates.resolutionSteps = resolutionSteps;
  if (tags !== undefined) updates.tags = tags;
  if (tier !== undefined) updates.tier = tier;
  if (selfHealable !== undefined) updates.selfHealable = selfHealable ? "true" : "false";
  if (escalationConditions !== undefined) updates.escalationConditions = escalationConditions;
  if (estimatedTime !== undefined) updates.estimatedTime = estimatedTime;

  const needsReindex = domain !== undefined || title !== undefined || symptoms !== undefined || resolutionSteps !== undefined || tags !== undefined || subdomain !== undefined;
  if (needsReindex) {
    const searchText = buildSearchText({
      domain: (domain ?? existing.domain),
      subdomain: (subdomain ?? existing.subdomain ?? undefined),
      title: (title ?? existing.title),
      symptoms: (symptoms ?? existing.symptoms ?? []) as string[],
      resolutionSteps: (resolutionSteps ?? existing.resolutionSteps ?? []) as string[],
      tags: (tags ?? existing.tags ?? []) as string[],
    });
    updates.searchText = searchText;
    updates.embedding = generateLocalEmbedding(searchText);
  }

  const [updated] = await db.update(knowledgeNodesTable)
    .set(updates)
    .where(eq(knowledgeNodesTable.id, numericId))
    .returning();

  res.json(updated);
});

router.delete("/kb/entries/:id", requireRole("owner", "admin"), async (req, res: Response): Promise<void> => {
  const numericId = parseInt(req.params.id, 10);
  if (isNaN(numericId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [deleted] = await db.delete(knowledgeNodesTable)
    .where(eq(knowledgeNodesTable.id, numericId))
    .returning({ id: knowledgeNodesTable.id });

  if (!deleted) { res.status(404).json({ error: "KB entry not found" }); return; }
  res.json({ success: true, id: deleted.id });
});

router.post("/kb/lookup", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { query, domain } = req.body;
  if (!query) { res.status(400).json({ error: "query is required" }); return; }

  const { results, method } = await searchKnowledge(query, { domain, limit: 5 });

  const topResult = results[0];
  const similarity = topResult ? getSimilarityScore(topResult, method) : 0;
  const confidenceScore = Math.round(similarity * 100);

  const severity = classifySeverity(query);
  const intent = classifyIntent(query);

  const udi = {
    udiId: `UDI-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${Math.floor(Math.random() * 900) + 100}`,
    domain: topResult ? String(topResult.domain) : (domain || null),
    subdomain: topResult ? String(topResult.subdomain || "") : null,
    symptom: query,
    confidenceScore,
    action: confidenceScore >= 80 ? "AutoResolve" as const : confidenceScore >= 60 ? "Suggest" as const : "Escalate" as const,
    decisionReason: topResult
      ? `Confidence ${confidenceScore}% — matched KB node ${topResult.external_id} (${topResult.domain}/${topResult.subdomain}) via ${method} search`
      : "No confident KB match found. Escalating to Tier 1 review.",
    dependencies: [] as string[],
    timestamp: new Date().toISOString(),
    escalationLevel: confidenceScore >= 75 ? String(topResult?.tier || "Tier1") : "Tier1",
    feedbackImpact: 0,
    kbId: topResult ? String(topResult.external_id) : null,
    resolutionSteps: topResult ? (topResult.resolution_steps as string[]) : null,
    slaLimit: severity === "P1" ? 15 : severity === "P2" ? 30 : severity === "P3" ? 60 : 240,
    severity,
    intent,
    synonymsMatched: [] as string[],
    selfHealable: topResult ? topResult.self_healable === "true" : false,
    retrievedNodes: results.map((r) => ({
      id: r.id,
      externalId: r.external_id,
      title: r.title,
      domain: r.domain,
      similarity: getSimilarityScore(r, method),
    })),
  };

  const decisionTree = buildDecisionTree(udi, query);
  res.json({ udi, decisionTree, severity, intent });
});

router.post("/kb/decision-tree", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { caseId } = req.body;
  if (!caseId) { res.status(400).json({ error: "caseId is required" }); return; }

  const [caseItem] = await db.select().from(casesTable)
    .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, authReq.user.id)));

  if (!caseItem) { res.status(404).json({ error: "Case not found" }); return; }

  const queryText = caseItem.title + " " + (caseItem.description || "");
  const { results, method } = await searchKnowledge(queryText, { limit: 1 });

  const topResult = results[0];
  const similarity = topResult ? getSimilarityScore(topResult, method) : 0;
  const confidenceScore = Math.round(similarity * 100);

  const severity = classifySeverity(queryText);

  const udi = {
    udiId: `UDI-${Date.now()}`,
    domain: topResult ? String(topResult.domain) : null,
    subdomain: topResult ? String(topResult.subdomain || "") : null,
    symptom: queryText,
    confidenceScore,
    action: confidenceScore >= 80 ? "AutoResolve" as const : confidenceScore >= 60 ? "Suggest" as const : "Escalate" as const,
    decisionReason: topResult
      ? `Matched KB node ${topResult.external_id} with ${confidenceScore}% confidence via ${method} search`
      : "No KB match found",
    dependencies: [] as string[],
    timestamp: new Date().toISOString(),
    escalationLevel: topResult?.tier ? String(topResult.tier) : "Tier1",
    feedbackImpact: 0,
    kbId: topResult ? String(topResult.external_id) : null,
    resolutionSteps: topResult ? (topResult.resolution_steps as string[]) : null,
    slaLimit: severity === "P1" ? 15 : severity === "P2" ? 30 : severity === "P3" ? 60 : 240,
    severity,
    intent: classifyIntent(queryText),
    synonymsMatched: [] as string[],
    selfHealable: topResult ? topResult.self_healable === "true" : false,
  };

  const tree = buildDecisionTree(udi, caseItem.title);
  res.json({ udi, tree });
});

router.post("/kb/feedback", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { kbId, caseId, helpful, notes } = req.body;
  if (!kbId) { res.status(400).json({ error: "kbId is required" }); return; }

  const [entry] = await db.select().from(knowledgeNodesTable)
    .where(eq(knowledgeNodesTable.externalId, kbId));

  if (!entry) { res.status(404).json({ error: "KB entry not found" }); return; }

  const delta = helpful === true ? 0.02 : helpful === false ? -0.05 : 0;
  const newScore = Math.max(0, Math.min(1, entry.historicalSuccess + delta));

  await db.update(knowledgeNodesTable)
    .set({ historicalSuccess: newScore, confidenceScore: newScore })
    .where(eq(knowledgeNodesTable.id, entry.id));

  if (caseId && notes) {
    try {
      await db.update(casesTable)
        .set({ resolution: `KB Resolution [${kbId}]: ${notes}` })
        .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, authReq.user.id)));
    } catch {}
  }

  res.json({
    success: true,
    kbId,
    updatedSuccessRate: Math.round(newScore * 100),
    message: helpful ? "Thank you — this entry's success rate has been improved." : "Noted — this article's weight has been reduced. Apphia will learn from this.",
  });
});

router.get("/kb/stats", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const monitorStats = await getMonitorStats();

  const domainRows = await db.select({
    domain: knowledgeNodesTable.domain,
    count: sql<number>`count(*)`,
  }).from(knowledgeNodesTable).groupBy(knowledgeNodesTable.domain);

  const domainBreakdown: Record<string, number> = {};
  for (const row of domainRows) {
    domainBreakdown[row.domain] = Number(row.count);
  }

  const totalEntries = Object.values(domainBreakdown).reduce((a, b) => a + b, 0);

  const avgResult = await db.select({
    avg: sql<number>`avg(historical_success)`,
  }).from(knowledgeNodesTable);
  const avgSuccessRate = Number(avgResult[0]?.avg || 0);

  const selfHealableResult = await db.select({
    count: sql<number>`count(*)`,
  }).from(knowledgeNodesTable).where(eq(knowledgeNodesTable.selfHealable, "true"));

  const userCases = await db.select({ count: sql<number>`count(*)` }).from(casesTable)
    .where(eq(casesTable.userId, authReq.user.id));

  const resolvedCases = await db.select({ count: sql<number>`count(*)` }).from(casesTable)
    .where(and(eq(casesTable.userId, authReq.user.id), eq(casesTable.status, "resolved")));

  res.json({
    totalKBEntries: totalEntries,
    domains: Object.keys(domainBreakdown).length,
    domainBreakdown,
    avgSuccessRate: Math.round(avgSuccessRate * 100),
    selfHealableCount: Number(selfHealableResult[0]?.count || 0),
    monitorStats,
    userCaseStats: {
      total: Number(userCases[0]?.count || 0),
      resolved: Number(resolvedCases[0]?.count || 0),
    },
  });
});

router.get("/kb/monitor/events", (req, res: Response): void => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const unsubscribe = subscribeToMonitorEvents(authReq.user.id, (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  req.on("close", unsubscribe);
});

export default router;
