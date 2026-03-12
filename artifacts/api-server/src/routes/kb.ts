import { Router, type IRouter, type Response } from "express";
import { db, casesTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { lookupKB, searchKB, classifySeverity, classifyIntent, KB } from "../kb/knowledge-base";
import { buildDecisionTree } from "../kb/decision-engine";
import { getMonitorStats, subscribeToMonitorEvents } from "../kb/proactive-monitor";
import type { AuthenticatedRequest } from "../types";

const router: IRouter = Router();

router.get("/kb/entries", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { domain, search } = req.query as { domain?: string; search?: string };

  let entries = KB;
  if (domain) entries = entries.filter(e => e.domain.toLowerCase() === domain.toLowerCase());
  if (search) {
    const results = searchKB(search);
    const ids = new Set(results.map(r => r.entry.id));
    entries = entries.filter(e => ids.has(e.id));
  }

  const domains = [...new Set(KB.map(e => e.domain))];
  res.json({ entries, domains, total: entries.length });
});

router.get("/kb/entries/:id", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const entry = KB.find(e => e.id === req.params.id);
  if (!entry) { res.status(404).json({ error: "KB entry not found" }); return; }
  res.json(entry);
});

router.post("/kb/lookup", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { query, domain } = req.body;
  if (!query) { res.status(400).json({ error: "query is required" }); return; }

  const udi = lookupKB(query, domain);
  const severity = classifySeverity(query);
  const intent = classifyIntent(query);

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

  const udi = lookupKB(caseItem.title + " " + (caseItem.description || ""));
  const tree = buildDecisionTree(udi, caseItem.title);
  res.json({ udi, tree });
});

router.post("/kb/feedback", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { kbId, caseId, helpful, notes } = req.body;
  if (!kbId) { res.status(400).json({ error: "kbId is required" }); return; }

  const entry = KB.find(e => e.id === kbId);
  if (!entry) { res.status(404).json({ error: "KB entry not found" }); return; }

  if (helpful === true) {
    entry.historicalSuccess = Math.min(1.0, entry.historicalSuccess + 0.02);
  } else if (helpful === false) {
    entry.historicalSuccess = Math.max(0.0, entry.historicalSuccess - 0.05);
  }

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
    updatedSuccessRate: Math.round(entry.historicalSuccess * 100),
    message: helpful ? "Thank you — this entry's success rate has been improved." : "Noted — this article's weight has been reduced. Apphia will learn from this.",
  });
});

router.get("/kb/stats", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const monitorStats = await getMonitorStats();

  const domainBreakdown = KB.reduce((acc, entry) => {
    acc[entry.domain] = (acc[entry.domain] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const avgSuccessRate = KB.reduce((sum, e) => sum + e.historicalSuccess, 0) / KB.length;

  const userCases = await db.select({ count: sql<number>`count(*)` }).from(casesTable)
    .where(eq(casesTable.userId, authReq.user.id));

  const resolvedCases = await db.select({ count: sql<number>`count(*)` }).from(casesTable)
    .where(and(eq(casesTable.userId, authReq.user.id), eq(casesTable.status, "resolved")));

  res.json({
    totalKBEntries: KB.length,
    domains: Object.keys(domainBreakdown).length,
    domainBreakdown,
    avgSuccessRate: Math.round(avgSuccessRate * 100),
    selfHealableCount: KB.filter(e => e.selfHealable).length,
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
