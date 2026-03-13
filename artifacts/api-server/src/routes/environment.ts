import { Router, type IRouter, type Response } from "express";
import { eq, desc, and, sql } from "drizzle-orm";
import { db, environmentSnapshotsTable, connectorHealthTable, casesTable } from "@workspace/db";
import type { AuthenticatedRequest } from "../types";

const router: IRouter = Router();

router.post("/environment/snapshot", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { label, caseId, environment, region, cloudProvider, topology, services, metrics, flags, rawContext, osInfo, techStack, activeServices, recentErrors } = req.body;
  if (!label) { res.status(400).json({ error: "label is required" }); return; }

  const connectors = await db.select().from(connectorHealthTable)
    .where(eq(connectorHealthTable.userId, authReq.user.id))
    .orderBy(desc(connectorHealthTable.lastChecked));

  const connectorStatuses: Record<string, string> = {};
  for (const c of connectors) connectorStatuses[c.connectorName] = c.status;

  const [snapshot] = await db.insert(environmentSnapshotsTable).values({
    userId: authReq.user.id,
    caseId: caseId ? parseInt(caseId, 10) : null,
    label,
    environment: environment || "production",
    region: region || null,
    cloudProvider: cloudProvider || null,
    osInfo: osInfo || null,
    techStack: Array.isArray(techStack) ? techStack : null,
    activeServices: Array.isArray(activeServices) ? activeServices : null,
    recentErrors: Array.isArray(recentErrors) ? recentErrors : null,
    topology: topology || null,
    services: services || null,
    connectorStatuses,
    metrics: metrics || null,
    flags: flags || null,
    rawContext: rawContext || null,
  }).returning();

  res.status(201).json(snapshot);
});

router.get("/environment/snapshots", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { caseId, limit: limitStr } = req.query as { caseId?: string; limit?: string };
  const limit = Math.min(parseInt(limitStr || "20", 10) || 20, 100);

  let query = db.select().from(environmentSnapshotsTable)
    .where(eq(environmentSnapshotsTable.userId, authReq.user.id))
    .$dynamic();

  if (caseId) {
    query = query.where(and(
      eq(environmentSnapshotsTable.userId, authReq.user.id),
      eq(environmentSnapshotsTable.caseId, parseInt(caseId, 10))
    ));
  }

  const snapshots = await query.orderBy(desc(environmentSnapshotsTable.createdAt)).limit(limit);
  res.json({ snapshots, total: snapshots.length });
});

router.get("/environment/snapshots/:id", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const id = parseInt(req.params.id, 10);
  const [snapshot] = await db.select().from(environmentSnapshotsTable)
    .where(and(eq(environmentSnapshotsTable.id, id), eq(environmentSnapshotsTable.userId, authReq.user.id)));

  if (!snapshot) { res.status(404).json({ error: "Snapshot not found" }); return; }
  res.json(snapshot);
});

router.get("/environment/topology", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const connectors = await db.select().from(connectorHealthTable)
    .where(eq(connectorHealthTable.userId, authReq.user.id))
    .orderBy(desc(connectorHealthTable.lastChecked))
    .limit(50);

  const caseStats = await db.select({
    status: casesTable.status,
    count: sql<number>`count(*)`,
  }).from(casesTable).where(eq(casesTable.userId, authReq.user.id)).groupBy(casesTable.status);

  const latestSnapshot = await db.select().from(environmentSnapshotsTable)
    .where(eq(environmentSnapshotsTable.userId, authReq.user.id))
    .orderBy(desc(environmentSnapshotsTable.createdAt)).limit(1);

  const nodes = connectors.map(c => ({
    id: c.connectorName,
    label: c.connectorName,
    type: "connector",
    status: c.status,
    responseTime: c.responseTime,
    lastChecked: c.lastChecked,
    metadata: c.metadata,
  }));

  const caseStatusMap: Record<string, number> = {};
  for (const row of caseStats) caseStatusMap[row.status] = Number(row.count);

  const topology = {
    nodes,
    edges: connectors.map((c, i) => i > 0 ? { from: connectors[i - 1].connectorName, to: c.connectorName, type: "dependency" } : null).filter(Boolean),
    connectorCount: connectors.length,
    healthyCount: connectors.filter(c => c.status === "healthy").length,
    degradedCount: connectors.filter(c => c.status === "degraded").length,
    unhealthyCount: connectors.filter(c => c.status === "unhealthy" || c.status === "down").length,
    caseStats: caseStatusMap,
    lastSnapshot: latestSnapshot[0] || null,
  };

  res.json(topology);
});

router.delete("/environment/snapshots/:id", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const id = parseInt(req.params.id, 10);
  const [deleted] = await db.delete(environmentSnapshotsTable)
    .where(and(eq(environmentSnapshotsTable.id, id), eq(environmentSnapshotsTable.userId, authReq.user.id)))
    .returning({ id: environmentSnapshotsTable.id });

  if (!deleted) { res.status(404).json({ error: "Snapshot not found" }); return; }
  res.json({ success: true, id: deleted.id });
});

export default router;
