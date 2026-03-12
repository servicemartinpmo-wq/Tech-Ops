import { Router, type IRouter, type Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, connectorHealthTable } from "@workspace/db";
import type { AuthenticatedRequest } from "../types";

const router: IRouter = Router();

const DEFAULT_CONNECTORS = [
  { name: "email", label: "Email Service" },
  { name: "cloud", label: "Cloud Infrastructure" },
  { name: "database", label: "Database Systems" },
  { name: "network", label: "Network Services" },
  { name: "security", label: "Security Gateway" },
  { name: "monitoring", label: "Monitoring Stack" },
];

router.get("/connectors/health", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const existing = await db
    .select()
    .from(connectorHealthTable)
    .where(eq(connectorHealthTable.userId, authReq.user.id))
    .orderBy(desc(connectorHealthTable.lastChecked));

  const existingNames = new Set(existing.map(e => e.connectorName));
  const results = [...existing];

  for (const connector of DEFAULT_CONNECTORS) {
    if (!existingNames.has(connector.name)) {
      results.push({
        id: 0,
        userId: authReq.user.id,
        connectorName: connector.name,
        status: "unknown",
        lastChecked: new Date(),
        responseTime: null,
        errorMessage: null,
        metadata: null,
      });
    }
  }

  res.json(results);
});

router.post("/connectors/health/:name/poll", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const raw = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
  const connectorName = raw;

  const responseTime = Math.floor(Math.random() * 200) + 50;
  const statuses = ["healthy", "healthy", "healthy", "healthy", "degraded"] as const;
  const status = statuses[Math.floor(Math.random() * statuses.length)];

  const [existing] = await db
    .select()
    .from(connectorHealthTable)
    .where(
      and(
        eq(connectorHealthTable.userId, authReq.user.id),
        eq(connectorHealthTable.connectorName, connectorName)
      )
    );

  let result;
  if (existing) {
    [result] = await db
      .update(connectorHealthTable)
      .set({
        status,
        lastChecked: new Date(),
        responseTime,
        errorMessage: status === "degraded" ? "Elevated latency detected" : null,
      })
      .where(eq(connectorHealthTable.id, existing.id))
      .returning();
  } else {
    [result] = await db
      .insert(connectorHealthTable)
      .values({
        userId: authReq.user.id,
        connectorName,
        status,
        lastChecked: new Date(),
        responseTime,
      })
      .returning();
  }

  res.json(result);
});

export default router;
