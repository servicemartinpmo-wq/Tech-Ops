import { Router, type IRouter, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { db, automationRulesTable } from "@workspace/db";
import { CreateAutomationRuleBody, UpdateAutomationRuleBody } from "@workspace/api-zod";
import type { AuthenticatedRequest } from "../types";

const router: IRouter = Router();

router.get("/automation/rules", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const rules = await db
    .select()
    .from(automationRulesTable)
    .where(eq(automationRulesTable.userId, authReq.user.id));

  res.json(rules);
});

router.post("/automation/rules", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const parsed = CreateAutomationRuleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [rule] = await db
    .insert(automationRulesTable)
    .values({
      userId: authReq.user.id,
      name: parsed.data.name,
      description: parsed.data.description,
      trigger: parsed.data.trigger,
      action: parsed.data.action,
      permissions: parsed.data.permissions,
    })
    .returning();

  res.status(201).json(rule);
});

router.patch("/automation/rules/:id", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const parsed = UpdateAutomationRuleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(automationRulesTable)
    .set(parsed.data)
    .where(and(eq(automationRulesTable.id, id), eq(automationRulesTable.userId, authReq.user.id)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Rule not found" });
    return;
  }

  res.json(updated);
});

router.delete("/automation/rules/:id", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [deleted] = await db
    .delete(automationRulesTable)
    .where(and(eq(automationRulesTable.id, id), eq(automationRulesTable.userId, authReq.user.id)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Rule not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
