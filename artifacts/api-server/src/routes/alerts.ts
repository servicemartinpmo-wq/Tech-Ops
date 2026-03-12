import { Router, type IRouter, type Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, systemAlertsTable } from "@workspace/db";
import type { AuthenticatedRequest } from "../types";

const router: IRouter = Router();

router.get("/alerts", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const limit = parseInt(req.query.limit as string) || 50;

  const alerts = await db
    .select()
    .from(systemAlertsTable)
    .where(eq(systemAlertsTable.userId, authReq.user.id))
    .orderBy(desc(systemAlertsTable.createdAt))
    .limit(limit);

  res.json(alerts);
});

router.post("/alerts/:id/acknowledge", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [updated] = await db
    .update(systemAlertsTable)
    .set({ acknowledged: "true" })
    .where(and(eq(systemAlertsTable.id, id), eq(systemAlertsTable.userId, authReq.user.id)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }

  res.json(updated);
});

export default router;
