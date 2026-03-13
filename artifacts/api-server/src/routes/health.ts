import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool, db, knowledgeNodesTable, casesTable, usersTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/status", async (_req, res) => {
  const start = Date.now();
  const checks: Record<string, { status: string; latencyMs?: number; detail?: string }> = {};

  try {
    const dbStart = Date.now();
    await pool.query("SELECT 1");
    checks.database = { status: "operational", latencyMs: Date.now() - dbStart };
  } catch {
    checks.database = { status: "degraded", detail: "Connection failed" };
  }

  try {
    const [kbResult] = await db.select({ count: sql<number>`count(*)` }).from(knowledgeNodesTable);
    checks.knowledgeBase = { status: "operational", detail: `${kbResult?.count ?? 0} nodes` };
  } catch {
    checks.knowledgeBase = { status: "degraded" };
  }

  try {
    const [caseResult] = await db.select({ count: sql<number>`count(*)` }).from(casesTable);
    checks.caseEngine = { status: "operational", detail: `${caseResult?.count ?? 0} cases processed` };
  } catch {
    checks.caseEngine = { status: "degraded" };
  }

  try {
    const [userResult] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
    checks.auth = { status: "operational", detail: `${userResult?.count ?? 0} users registered` };
  } catch {
    checks.auth = { status: "degraded" };
  }

  checks.apphiaEngine = {
    status: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ? "operational" : "unconfigured",
    detail: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ? "Connected" : "API key not set",
  };

  const allOk = Object.values(checks).every(c => c.status === "operational");
  const anyDegraded = Object.values(checks).some(c => c.status === "degraded");

  res.json({
    status: allOk ? "operational" : anyDegraded ? "degraded" : "partial",
    version: "1.0.0",
    uptimeSeconds: Math.floor(process.uptime()),
    responseTimeMs: Date.now() - start,
    checks,
    timestamp: new Date().toISOString(),
  });
});

export default router;
