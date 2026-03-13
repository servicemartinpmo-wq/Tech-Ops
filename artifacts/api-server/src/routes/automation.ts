import { Router, type IRouter, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { db, automationRulesTable } from "@workspace/db";
import { CreateAutomationRuleBody, UpdateAutomationRuleBody } from "@workspace/api-zod";
import type { AuthenticatedRequest } from "../types";
import { requireRole } from "../middleware/tierGating";

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

router.post("/automation/rules", requireRole("owner", "admin"), async (req, res: Response): Promise<void> => {
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

router.patch("/automation/rules/:id", requireRole("owner", "admin"), async (req, res: Response): Promise<void> => {
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

router.delete("/automation/rules/:id", requireRole("owner", "admin"), async (req, res: Response): Promise<void> => {
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

router.post("/automation/translate", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  const p = prompt.toLowerCase();

  let trigger = "alert_high_cpu";
  let action = "restart_service";

  if (p.includes("cpu") || p.includes("processor")) trigger = "alert_high_cpu";
  else if (p.includes("memory") || p.includes("ram")) trigger = "alert_memory_leak";
  else if (p.includes("connector") || p.includes("offline") || p.includes("down")) trigger = "connector_down";
  else if (p.includes("case") || p.includes("critical") || p.includes("ticket")) trigger = "case_created";
  else if (p.includes("disk") || p.includes("storage")) trigger = "disk_space_low";
  else if (p.includes("slow") || p.includes("response") || p.includes("latency")) trigger = "response_time_spike";

  if (p.includes("restart") || p.includes("reboot")) action = "restart_service";
  else if (p.includes("scale") || p.includes("capacity")) action = "scale_up";
  else if (p.includes("page") || p.includes("notify") || p.includes("alert") || p.includes("engineer") || p.includes("oncall")) action = "notify_oncall";
  else if (p.includes("diagnos") || p.includes("apphia") || p.includes("investigat")) action = "run_diagnostic";
  else if (p.includes("log") || p.includes("collect") || p.includes("archive")) action = "collect_logs";
  else if (p.includes("failover") || p.includes("redirect") || p.includes("backup")) action = "failover";

  const name = prompt.length > 60 ? prompt.slice(0, 57).trim() + "..." : prompt.trim();
  res.json({ name, trigger, action });
});

export default router;
