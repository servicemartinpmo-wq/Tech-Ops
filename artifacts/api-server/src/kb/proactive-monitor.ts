import { db, connectorHealthTable, casesTable } from "@workspace/db";
import { eq, and, lt, sql } from "drizzle-orm";
import { lookupKB, buildDecisionTree } from "./knowledge-base";
import { buildDecisionTree as buildTree } from "./decision-engine";

export interface MonitorEvent {
  type: "connector_down" | "connector_degraded" | "case_auto_created" | "self_heal_triggered";
  connectorName: string;
  userId: string;
  message: string;
  caseId?: number;
  timestamp: string;
}

const listeners = new Map<string, Set<(event: MonitorEvent) => void>>();
const connectorDownCounts = new Map<string, number>();
const AUTO_CREATE_THRESHOLD = 2;

export function subscribeToMonitorEvents(userId: string, callback: (event: MonitorEvent) => void): () => void {
  if (!listeners.has(userId)) listeners.set(userId, new Set());
  listeners.get(userId)!.add(callback);
  return () => {
    listeners.get(userId)?.delete(callback);
    if (listeners.get(userId)?.size === 0) listeners.delete(userId);
  };
}

function emitEvent(event: MonitorEvent) {
  const userListeners = listeners.get(event.userId);
  if (userListeners) {
    for (const fn of userListeners) {
      try { fn(event); } catch {}
    }
  }
}

export async function runMonitorCycle() {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const staleConnectors = await db
      .select()
      .from(connectorHealthTable)
      .where(lt(connectorHealthTable.lastChecked, fiveMinutesAgo));

    for (const conn of staleConnectors) {
      const key = `${conn.userId}:${conn.connectorName}`;

      if (conn.status === "down" || conn.status === "unknown") {
        const count = (connectorDownCounts.get(key) || 0) + 1;
        connectorDownCounts.set(key, count);

        emitEvent({
          type: "connector_down",
          connectorName: conn.connectorName,
          userId: conn.userId,
          message: `${conn.connectorName} has been unreachable for ${count * 5} minutes`,
          timestamp: new Date().toISOString(),
        });

        if (count === AUTO_CREATE_THRESHOLD) {
          try {
            const udi = lookupKB(`${conn.connectorName} connector down unreachable`, conn.connectorName);
            const [newCase] = await db.insert(casesTable).values({
              userId: conn.userId,
              title: `[AUTO] ${conn.connectorName} connector unreachable`,
              description: `Automatically created by Apphia proactive monitor. ${conn.connectorName} has been down for ${count * 5} minutes. ${conn.errorMessage ? `Last error: ${conn.errorMessage}` : ""}\n\nUDI: ${udi.udiId} | Confidence: ${udi.confidenceScore}% | KB Match: ${udi.kbId || "none"}`,
              priority: count >= 4 ? "high" : "medium",
              status: "open",
            }).returning();

            emitEvent({
              type: "case_auto_created",
              connectorName: conn.connectorName,
              userId: conn.userId,
              caseId: newCase.id,
              message: `Case #${newCase.id} auto-created for ${conn.connectorName} outage`,
              timestamp: new Date().toISOString(),
            });
          } catch {}
        }
      } else if (conn.status === "degraded") {
        emitEvent({
          type: "connector_degraded",
          connectorName: conn.connectorName,
          userId: conn.userId,
          message: `${conn.connectorName} is degraded — response time: ${conn.responseTime}ms`,
          timestamp: new Date().toISOString(),
        });
      } else {
        connectorDownCounts.delete(key);
      }
    }

    const healthyConnectors = await db
      .select()
      .from(connectorHealthTable)
      .where(eq(connectorHealthTable.status, "healthy"));

    for (const conn of healthyConnectors) {
      const key = `${conn.userId}:${conn.connectorName}`;
      if (connectorDownCounts.has(key)) {
        connectorDownCounts.delete(key);
      }
    }
  } catch {}
}

export function startProactiveMonitor(intervalMs = 5 * 60 * 1000): NodeJS.Timeout {
  console.log(`[Apphia Monitor] Starting proactive monitor cycle every ${intervalMs / 60000} minutes`);
  const timer = setInterval(runMonitorCycle, intervalMs);
  setTimeout(runMonitorCycle, 30000);
  return timer;
}

export async function getMonitorStats(): Promise<{
  activeDownConnectors: number;
  autoCreatedCasesCount: number;
  monitoredConnectors: number;
}> {
  try {
    const allConnectors = await db.select({ count: sql<number>`count(*)` }).from(connectorHealthTable);
    const downConnectors = await db.select({ count: sql<number>`count(*)` }).from(connectorHealthTable).where(eq(connectorHealthTable.status, "down"));
    const autoCases = await db.select({ count: sql<number>`count(*)` }).from(casesTable).where(
      sql`title LIKE '[AUTO]%'`
    );

    return {
      activeDownConnectors: Number(downConnectors[0]?.count || 0),
      autoCreatedCasesCount: Number(autoCases[0]?.count || 0),
      monitoredConnectors: Number(allConnectors[0]?.count || 0),
    };
  } catch {
    return { activeDownConnectors: 0, autoCreatedCasesCount: 0, monitoredConnectors: 0 };
  }
}
