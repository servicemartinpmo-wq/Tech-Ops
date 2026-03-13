import { db, connectorHealthTable, casesTable } from "@workspace/db";
import { eq, and, lt, ne, sql as sqlt } from "drizzle-orm";

async function createSystemAlert(userId: string, title: string, message: string, severity: string) {
  try {
    await db.execute(
      sqlt`INSERT INTO system_alerts (user_id, title, message, severity, is_read, created_at) 
           VALUES (${userId}, ${title}, ${message}, ${severity}, false, NOW())`
    );
    console.log(`[AlertMonitor] Alert created for user ${userId}: ${title}`);
  } catch {
    console.log(`[AlertMonitor] Alert (table not ready): ${title}`);
  }
}

async function alertAlreadyExists(userId: string, title: string): Promise<boolean> {
  try {
    const result = await db.execute(
      sqlt`SELECT id FROM system_alerts WHERE user_id = ${userId} AND title = ${title} 
           AND created_at > NOW() - INTERVAL '1 hour' LIMIT 1`
    ) as unknown as { rows: unknown[] };
    return Array.isArray(result?.rows) ? result.rows.length > 0 : false;
  } catch {
    return false;
  }
}

async function checkConnectorHealth() {
  try {
    const unhealthy = await db
      .select({ userId: connectorHealthTable.userId, name: connectorHealthTable.connectorName, status: connectorHealthTable.status })
      .from(connectorHealthTable)
      .where(ne(connectorHealthTable.status, "healthy"));

    for (const c of unhealthy) {
      const title = `⚠️ Connector Degraded: ${c.name}`;
      const exists = await alertAlreadyExists(c.userId, title);
      if (!exists) {
        await createSystemAlert(
          c.userId,
          title,
          `The ${c.name} connector is reporting status: ${c.status}. Automated monitoring detected the degradation — review connector settings and re-run a health check.`,
          "warning"
        );
      }
    }
  } catch (err) {
    console.error("[AlertMonitor] Connector health check failed:", err);
  }
}

async function checkSLABreaches() {
  try {
    const SLA_WARNING_HOURS = 20;
    const SLA_BREACH_HOURS = 24;

    const warningCutoff = new Date(Date.now() - SLA_WARNING_HOURS * 60 * 60 * 1000);
    const breachCutoff = new Date(Date.now() - SLA_BREACH_HOURS * 60 * 60 * 1000);

    const staleCases = await db
      .select({ id: casesTable.id, userId: casesTable.userId, title: casesTable.title, createdAt: casesTable.createdAt, priority: casesTable.priority })
      .from(casesTable)
      .where(and(eq(casesTable.status, "open"), lt(casesTable.createdAt, warningCutoff)));

    for (const c of staleCases) {
      const isBreached = c.createdAt < breachCutoff;
      const alertTitle = isBreached
        ? `🚨 SLA Breached: "${c.title}"`
        : `⏰ SLA Approaching: "${c.title}"`;
      const severity = isBreached ? "critical" : "warning";

      const exists = await alertAlreadyExists(c.userId, alertTitle);
      if (!exists) {
        const hoursOpen = Math.floor((Date.now() - c.createdAt.getTime()) / (1000 * 60 * 60));
        await createSystemAlert(
          c.userId,
          alertTitle,
          isBreached
            ? `Case open for ${hoursOpen}h — SLA target of 24h has been breached. Priority: ${c.priority}. Immediate attention required.`
            : `Case open for ${hoursOpen}h — approaching the 24h SLA target. Priority: ${c.priority}. Please review and update.`,
          severity
        );
      }
    }
  } catch (err) {
    console.error("[AlertMonitor] SLA check failed:", err);
  }
}

async function checkCriticalCasesWithoutDiagnosis() {
  try {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const undiagnosed = await db
      .select({ id: casesTable.id, userId: casesTable.userId, title: casesTable.title })
      .from(casesTable)
      .where(
        and(
          eq(casesTable.priority, "critical"),
          eq(casesTable.status, "open"),
          lt(casesTable.createdAt, cutoff)
        )
      );

    for (const c of undiagnosed) {
      const alertTitle = `🚨 Critical Case Undiagnosed: "${c.title}"`;
      const exists = await alertAlreadyExists(c.userId, alertTitle);
      if (!exists) {
        await createSystemAlert(
          c.userId,
          alertTitle,
          `Critical priority case has been open for 2+ hours without a completed diagnosis. Run Apphia diagnostics immediately.`,
          "critical"
        );
      }
    }
  } catch (err) {
    console.error("[AlertMonitor] Critical case check failed:", err);
  }
}

export async function runAlertMonitorCycle() {
  await checkConnectorHealth();
  await checkSLABreaches();
  await checkCriticalCasesWithoutDiagnosis();
}

export function startAlertMonitor(intervalMs = 10 * 60 * 1000) {
  console.log(`[AlertMonitor] Starting — running checks every ${intervalMs / 1000}s`);
  setInterval(() => void runAlertMonitorCycle(), intervalMs);
  void runAlertMonitorCycle();
}
