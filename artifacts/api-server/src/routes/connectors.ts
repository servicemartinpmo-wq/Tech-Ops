import { Router, type IRouter, type Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, connectorHealthTable } from "@workspace/db";
import type { AuthenticatedRequest } from "../types";
import https from "https";
import http from "http";
import dns from "dns/promises";

const router: IRouter = Router();

const DEFAULT_CONNECTORS = [
  { name: "email", label: "Email Service" },
  { name: "cloud", label: "Cloud Infrastructure" },
  { name: "database", label: "Database Systems" },
  { name: "network", label: "Network Services" },
  { name: "security", label: "Security Gateway" },
  { name: "monitoring", label: "Monitoring Stack" },
];

type HealthStatus = "healthy" | "degraded" | "down";
type HealthResult = { status: HealthStatus; responseTime: number; message?: string };

function httpCheck(url: string, timeoutMs = 6000): Promise<HealthResult> {
  return new Promise((resolve) => {
    const start = Date.now();
    let resolved = false;
    const done = (r: HealthResult) => { if (!resolved) { resolved = true; resolve(r); } };

    const timer = setTimeout(() => {
      req.destroy();
      done({ status: "down", responseTime: timeoutMs, message: "Request timed out" });
    }, timeoutMs);

    const parsed = new URL(url);
    const lib = parsed.protocol === "https:" ? https : http;

    const req = lib.get(url, { timeout: timeoutMs }, (res) => {
      clearTimeout(timer);
      const elapsed = Date.now() - start;
      res.resume();
      const code = res.statusCode || 0;
      if (code >= 500) {
        done({ status: "down", responseTime: elapsed, message: `HTTP ${code}` });
      } else if (elapsed > 2500 || (code >= 400 && code !== 404)) {
        done({ status: "degraded", responseTime: elapsed, message: `Elevated latency or error: HTTP ${code}` });
      } else {
        done({ status: "healthy", responseTime: elapsed });
      }
    });

    req.on("timeout", () => {
      clearTimeout(timer);
      req.destroy();
      done({ status: "down", responseTime: timeoutMs, message: "Socket timed out" });
    });

    req.on("error", (err) => {
      clearTimeout(timer);
      const elapsed = Date.now() - start;
      done({ status: "down", responseTime: elapsed, message: err.message });
    });
  });
}

async function dnsCheck(hostname: string, recordType: "A" | "MX" = "A"): Promise<HealthResult> {
  const start = Date.now();
  try {
    if (recordType === "MX") {
      await dns.resolveMx(hostname);
    } else {
      await dns.resolve(hostname, "A");
    }
    const elapsed = Date.now() - start;
    return { status: elapsed > 1500 ? "degraded" : "healthy", responseTime: elapsed };
  } catch (err: unknown) {
    return { status: "down", responseTime: Date.now() - start, message: (err as Error).message };
  }
}

async function dbCheck(): Promise<HealthResult> {
  const start = Date.now();
  try {
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`SELECT 1`);
    const elapsed = Date.now() - start;
    return { status: elapsed > 1000 ? "degraded" : "healthy", responseTime: elapsed };
  } catch (err: unknown) {
    return { status: "down", responseTime: Date.now() - start, message: (err as Error).message };
  }
}

const CONNECTOR_CHECKS: Record<string, () => Promise<HealthResult>> = {
  email: () => dnsCheck("gmail.com", "MX"),
  cloud: () => httpCheck("https://status.aws.amazon.com/data.json"),
  database: () => dbCheck(),
  network: () => dnsCheck("one.one.one.one", "A"),
  security: () => httpCheck("https://www.cloudflare.com/cdn-cgi/trace"),
  monitoring: () => httpCheck("https://api.statuspage.io/v1/pages"),
};

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

  const checkFn = CONNECTOR_CHECKS[connectorName] || (() => httpCheck("https://cloudflare.com"));
  const healthResult = await checkFn();

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
        status: healthResult.status,
        lastChecked: new Date(),
        responseTime: healthResult.responseTime,
        errorMessage: healthResult.message || null,
      })
      .where(eq(connectorHealthTable.id, existing.id))
      .returning();
  } else {
    [result] = await db
      .insert(connectorHealthTable)
      .values({
        userId: authReq.user.id,
        connectorName,
        status: healthResult.status,
        lastChecked: new Date(),
        responseTime: healthResult.responseTime,
        errorMessage: healthResult.message || null,
      })
      .returning();
  }

  res.json(result);
});

export default router;
