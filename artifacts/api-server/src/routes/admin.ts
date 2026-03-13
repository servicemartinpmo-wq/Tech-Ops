import { Router, type IRouter, type Response } from "express";
import { eq, desc, sql, gte, count } from "drizzle-orm";
import {
  db, pool, usersTable, casesTable, knowledgeNodesTable,
  knowledgeEdgesTable, batchesTable, auditLogTable,
  connectorHealthHistoryTable, systemAlertsTable,
} from "@workspace/db";
import type { AuthenticatedRequest } from "../types";
import { requireRole } from "../middleware/tierGating";

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

// ── Users ─────────────────────────────────────────────────────────────────────

router.get("/admin/users", requireRole("admin"), handle(async (_req, res) => {
  const users = await db.select({
    id: usersTable.id,
    email: usersTable.email,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
    role: usersTable.role,
    subscriptionTier: usersTable.subscriptionTier,
    createdAt: usersTable.createdAt,
  }).from(usersTable).orderBy(desc(usersTable.createdAt));

  const caseCounts = await db.select({
    userId: casesTable.userId,
    count: sql<number>`count(*)`,
  }).from(casesTable).groupBy(casesTable.userId);

  const ccMap = Object.fromEntries(caseCounts.map(r => [r.userId, Number(r.count)]));

  res.json({
    data: users.map(u => ({ ...u, caseCount: ccMap[u.id] || 0 })),
    total: users.length,
  });
}));

router.patch("/admin/users/:id/role", requireRole("admin"), handle(async (req, res) => {
  const { role } = req.body as { role: string };
  const validRoles = ["viewer", "user", "admin"];
  if (!validRoles.includes(role)) {
    res.status(400).json({ error: "Invalid role", validRoles });
    return;
  }
  await db.update(usersTable).set({ role }).where(eq(usersTable.id, String(req.params.id)));
  res.json({ success: true, role });
}));

router.patch("/admin/users/:id/tier", requireRole("admin"), handle(async (req, res) => {
  const { tier } = req.body as { tier: string };
  const validTiers = ["free", "starter", "professional", "business", "enterprise"];
  if (!validTiers.includes(tier)) {
    res.status(400).json({ error: "Invalid tier", validTiers });
    return;
  }
  await db.update(usersTable).set({ subscriptionTier: tier }).where(eq(usersTable.id, String(req.params.id)));
  res.json({ success: true, tier });
}));

// ── Platform Stats ─────────────────────────────────────────────────────────────

router.get("/admin/stats", requireRole("admin"), handle(async (_req, res) => {
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    userStats, caseStats, kbStats, batchStats,
    alertStats, connStats, auditStats,
  ] = await Promise.all([
    db.select({
      total: sql<number>`count(*)`,
      activeThisMonth: sql<number>`count(*) FILTER (WHERE created_at >= ${since30})`,
    }).from(usersTable),

    db.select({
      total: sql<number>`count(*)`,
      thisMonth: sql<number>`count(*) FILTER (WHERE created_at >= ${since30})`,
      resolved: sql<number>`count(*) FILTER (WHERE status = 'resolved')`,
      avgConf: sql<number>`round(avg(confidence_score)::numeric, 1)`,
    }).from(casesTable),

    db.select({
      nodes: sql<number>`count(*)`,
    }).from(knowledgeNodesTable),

    db.select({
      total: sql<number>`count(*)`,
      thisMonth: sql<number>`count(*) FILTER (WHERE created_at >= ${since30})`,
    }).from(batchesTable),

    db.select({
      total: sql<number>`count(*)`,
      unacknowledged: sql<number>`count(*) FILTER (WHERE acknowledged_at IS NULL)`,
    }).from(systemAlertsTable),

    db.select({
      total: sql<number>`count(*)`,
    }).from(connectorHealthHistoryTable),

    db.select({
      total: sql<number>`count(*)`,
      thisMonth: sql<number>`count(*) FILTER (WHERE created_at >= ${since30})`,
    }).from(auditLogTable),
  ]);

  const edges = await db.select({ count: sql<number>`count(*)` }).from(knowledgeEdgesTable);

  res.json({
    users: {
      total: Number(userStats[0]?.total || 0),
      activeThisMonth: Number(userStats[0]?.activeThisMonth || 0),
    },
    cases: {
      total: Number(caseStats[0]?.total || 0),
      thisMonth: Number(caseStats[0]?.thisMonth || 0),
      resolved: Number(caseStats[0]?.resolved || 0),
      avgConfidence: Number(caseStats[0]?.avgConf || 0),
    },
    knowledgeBase: {
      nodes: Number(kbStats[0]?.nodes || 0),
      edges: Number(edges[0]?.count || 0),
    },
    batches: {
      total: Number(batchStats[0]?.total || 0),
      thisMonth: Number(batchStats[0]?.thisMonth || 0),
    },
    alerts: {
      total: Number(alertStats[0]?.total || 0),
      unacknowledged: Number(alertStats[0]?.unacknowledged || 0),
    },
    connectorHealthChecks: Number(connStats[0]?.total || 0),
    auditEvents: {
      total: Number(auditStats[0]?.total || 0),
      thisMonth: Number(auditStats[0]?.thisMonth || 0),
    },
  });
}));

// ── Knowledge Base Admin ───────────────────────────────────────────────────────

router.get("/admin/kb", requireRole("admin"), handle(async (req, res) => {
  const limit  = Math.min(parseInt(String(req.query.limit || "50"), 10) || 50, 200);
  const offset = parseInt(String(req.query.offset || "0"), 10) || 0;
  const nodes  = await db.select().from(knowledgeNodesTable)
    .orderBy(desc(knowledgeNodesTable.updatedAt))
    .limit(limit).offset(offset);
  res.json(nodes);
}));

router.post("/admin/kb", requireRole("admin"), handle(async (req, res) => {
  const { title, content, domain, tags, nodeType } = req.body as {
    title?: string; content?: string; domain?: string;
    tags?: string[]; nodeType?: string;
  };
  if (!title?.trim() || !content?.trim() || !domain?.trim()) {
    res.status(400).json({ error: "title, content, and domain are required" }); return;
  }
  const [node] = await db.insert(knowledgeNodesTable).values({
    externalId: `admin-${Date.now()}`,
    title: title.trim(),
    description: content.trim(),
    domain: domain.trim(),
    tags: tags || [],
    type: nodeType || "article",
  }).returning();
  res.status(201).json(node);
}));

router.delete("/admin/kb/:id", requireRole("admin"), handle(async (req, res) => {
  await db.delete(knowledgeNodesTable).where(eq(knowledgeNodesTable.id, parseInt(String(req.params.id), 10)));
  res.json({ success: true });
}));

// ── Audit Log ─────────────────────────────────────────────────────────────────

router.get("/admin/audit-log", requireRole("admin"), handle(async (req, res) => {
  const limit  = Math.min(parseInt(String(req.query.limit || "100"), 10) || 100, 500);
  const offset = parseInt(String(req.query.offset || "0"), 10) || 0;
  const rows   = await db.select().from(auditLogTable)
    .orderBy(desc(auditLogTable.createdAt))
    .limit(limit).offset(offset);
  res.json({ data: rows, limit, offset });
}));

export default router;
