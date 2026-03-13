import { Router, type IRouter, type Response } from "express";
import { eq, desc, sql, gte, count } from "drizzle-orm";
import {
  db, pool, usersTable, casesTable, knowledgeNodesTable,
  knowledgeEdgesTable, batchesTable, auditLogTable,
  connectorHealthHistoryTable, systemAlertsTable,
} from "@workspace/db";
import type { AuthenticatedRequest } from "../types";
import { requireRole } from "../middleware/tierGating";
import bcryptjs from "bcryptjs";
import { openai } from "@workspace/integrations-openai-ai-server";

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

// ── Create User ───────────────────────────────────────────────────────────────

router.post("/admin/users", requireRole("admin"), handle(async (req, res) => {
  const { email, firstName, lastName, password, role, tier } = req.body as {
    email?: string; firstName?: string; lastName?: string;
    password?: string; role?: string; tier?: string;
  };
  if (!email?.trim()) { res.status(400).json({ error: "email is required" }); return; }
  const existing = await db.select({ id: usersTable.id }).from(usersTable)
    .where(eq(usersTable.email, email.trim().toLowerCase())).limit(1);
  if (existing.length > 0) { res.status(409).json({ error: "Email already in use" }); return; }
  const passwordHash = password ? await bcryptjs.hash(password, 12) : null;
  const validRoles = ["viewer", "user", "admin", "owner"];
  const validTiers = ["free", "starter", "professional", "business", "enterprise"];
  const [user] = await db.insert(usersTable).values({
    email: email.trim().toLowerCase(),
    firstName: firstName?.trim() || null,
    lastName: lastName?.trim() || null,
    passwordHash: passwordHash || undefined,
    authProvider: "email",
    role: validRoles.includes(role || "") ? role! : "user",
    subscriptionTier: validTiers.includes(tier || "") ? tier! : "free",
  }).returning();
  res.status(201).json({ success: true, user });
}));

// ── Edit User Profile ──────────────────────────────────────────────────────────

router.patch("/admin/users/:id", requireRole("admin"), handle(async (req, res) => {
  const { firstName, lastName, email } = req.body as {
    firstName?: string; lastName?: string; email?: string;
  };
  const updates: Record<string, string> = {};
  if (firstName !== undefined) updates.firstName = firstName.trim();
  if (lastName  !== undefined) updates.lastName  = lastName.trim();
  if (email     !== undefined) updates.email     = email.trim().toLowerCase();
  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "No fields to update" }); return; }
  await db.update(usersTable).set(updates).where(eq(usersTable.id, String(req.params.id)));
  res.json({ success: true });
}));

// ── Delete User ───────────────────────────────────────────────────────────────

router.delete("/admin/users/:id", requireRole("admin"), handle(async (req, res) => {
  const targetId = String(req.params.id);
  const callerId = (req.user as { id: string }).id;
  if (targetId === callerId) { res.status(400).json({ error: "Cannot delete your own account" }); return; }
  await db.delete(usersTable).where(eq(usersTable.id, targetId));
  res.json({ success: true });
}));

// ── AI Assist (Creator) ────────────────────────────────────────────────────────

router.post("/admin/ai-assist", requireRole("admin"), handle(async (req, res) => {
  const { issue, context, userId } = req.body as {
    issue?: string; context?: string; userId?: string;
  };
  if (!issue?.trim()) { res.status(400).json({ error: "issue description is required" }); return; }

  let userContext = "";
  if (userId) {
    const [u] = await db.select({
      email: usersTable.email, firstName: usersTable.firstName, lastName: usersTable.lastName,
      subscriptionTier: usersTable.subscriptionTier,
    }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (u) {
      userContext = `\n\nAffected user: ${[u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || userId} (tier: ${u.subscriptionTier || "free"})`;
    }
  }

  const systemPrompt = `You are Apphia in Creator Mode — a direct technical assistant for the platform operator (Martin PMO). You have full access to help diagnose and fix any issue in the Tech-Ops platform, user accounts, or infrastructure. You respond with structured JSON only.

When given an issue description, respond with VALID JSON in this exact shape:
{
  "summary": "1-2 sentence plain-English summary of what is likely happening",
  "steps": ["Specific action step 1", "Specific action step 2", "..."],
  "codeSnippet": "optional relevant code, SQL, bash command, or config — null if not applicable",
  "language": "bash | sql | typescript | json | plaintext — or null if no code",
  "confidence": "high | medium | low"
}

Be direct, precise, and technical. This is for the platform creator, not an end user.`;

  const userMessage = `Issue: ${issue.trim()}${userContext}${context ? `\n\nExtra context: ${context.trim()}` : ""}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userMessage },
    ],
    response_format: { type: "json_object" },
    max_tokens: 800,
    temperature: 0.3,
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  try {
    const parsed = JSON.parse(raw);
    res.json({ success: true, result: parsed });
  } catch {
    res.json({ success: true, result: { summary: raw, steps: [], codeSnippet: null, language: null, confidence: "low" } });
  }
}));

// ── Case Intelligence ─────────────────────────────────────────────────────────

router.get("/admin/case-intelligence", requireRole("admin"), handle(async (req, res) => {
  const limit  = Math.min(parseInt(String(req.query.limit || "100"), 10) || 100, 500);
  const offset = parseInt(String(req.query.offset || "0"), 10) || 0;

  const cases = await db.select({
    id: casesTable.id,
    title: casesTable.title,
    description: casesTable.description,
    status: casesTable.status,
    priority: casesTable.priority,
    diagnosticTier: casesTable.diagnosticTier,
    rootCause: casesTable.rootCause,
    resolution: casesTable.resolution,
    confidenceScore: casesTable.confidenceScore,
    signals: casesTable.signals,
    userId: casesTable.userId,
    createdAt: casesTable.createdAt,
    resolvedAt: casesTable.resolvedAt,
    escalated: casesTable.escalated,
    slaStatus: casesTable.slaStatus,
  }).from(casesTable)
    .orderBy(desc(casesTable.createdAt))
    .limit(limit).offset(offset);

  const total = await db.select({ count: sql<number>`count(*)` }).from(casesTable);

  res.json({ data: cases, total: Number(total[0]?.count || 0), limit, offset });
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
