import { db, automationRulesTable, casesTable, connectorHealthTable } from "@workspace/db";
import { eq, and, lt, gt, sql as sqlt } from "drizzle-orm";

const ALERT_ICON: Record<string, string> = {
  connector_degraded: "⚠️",
  new_case_critical: "🚨",
  case_unresolved_24h: "⏰",
};

async function createSystemAlert(userId: string, title: string, message: string, severity: string) {
  try {
    await db.execute(
      sqlt`INSERT INTO system_alerts (user_id, title, message, severity, is_read, created_at) 
           VALUES (${userId}, ${title}, ${message}, ${severity}, false, NOW())`
    );
  } catch {
    console.log(`[AutomationEngine] Alert (no system_alerts table yet): ${title}`);
  }
}

async function escalateCase(caseId: number) {
  try {
    await db
      .update(casesTable)
      .set({ slaStatus: "breached" })
      .where(eq(casesTable.id, caseId));
  } catch (err) {
    console.error("[AutomationEngine] Failed to escalate case:", err);
  }
}

async function evaluateRule(rule: typeof automationRulesTable.$inferSelect) {
  const trigger = rule.trigger;
  const action = rule.action;
  let triggered = false;
  let triggerDetails = "";

  try {
    if (trigger === "connector_degraded") {
      const degraded = await db
        .select()
        .from(connectorHealthTable)
        .where(and(eq(connectorHealthTable.userId, rule.userId), eq(connectorHealthTable.status, "degraded")));
      if (degraded.length > 0) {
        triggered = true;
        triggerDetails = `Degraded connectors: ${degraded.map(c => c.connectorName).join(", ")}`;
      }
    } else if (trigger === "new_case_critical") {
      const recentWindow = new Date(Date.now() - 5 * 60 * 1000);
      const critical = await db
        .select()
        .from(casesTable)
        .where(
          and(
            eq(casesTable.userId, rule.userId),
            eq(casesTable.priority, "critical"),
            gt(casesTable.createdAt, recentWindow)
          )
        );
      if (critical.length > 0) {
        triggered = true;
        triggerDetails = `Critical case: ${critical[0].title}`;
      }
    } else if (trigger === "case_unresolved_24h") {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const stale = await db
        .select()
        .from(casesTable)
        .where(
          and(
            eq(casesTable.userId, rule.userId),
            eq(casesTable.status, "open"),
            lt(casesTable.createdAt, cutoff)
          )
        );
      if (stale.length > 0) {
        triggered = true;
        triggerDetails = `${stale.length} case(s) unresolved for 24+ hours`;
        if (action === "escalate_case") {
          for (const c of stale) {
            await escalateCase(c.id);
          }
        }
      }
    }

    if (triggered) {
      const icon = ALERT_ICON[trigger] || "📋";

      if (action === "create_alert" || action === "escalate_case") {
        await createSystemAlert(
          rule.userId,
          `${icon} Automation: ${rule.name}`,
          `Rule triggered — ${triggerDetails}`,
          trigger === "new_case_critical" ? "critical" : "warning"
        );
      }

      await db
        .update(automationRulesTable)
        .set({
          executionCount: sqlt`${automationRulesTable.executionCount} + 1`,
          lastExecuted: new Date(),
        })
        .where(eq(automationRulesTable.id, rule.id));

      console.log(`[AutomationEngine] Rule "${rule.name}" fired — ${triggerDetails}`);
    }
  } catch (err) {
    console.error(`[AutomationEngine] Error evaluating rule "${rule.name}":`, err);
  }
}

export async function runAutomationCycle() {
  try {
    const rules = await db
      .select()
      .from(automationRulesTable)
      .where(eq(automationRulesTable.enabled, "true"));

    for (const rule of rules) {
      await evaluateRule(rule);
    }
  } catch (err) {
    console.error("[AutomationEngine] Cycle error:", err);
  }
}

export function startAutomationEngine(intervalMs = 5 * 60 * 1000) {
  console.log(`[AutomationEngine] Starting — evaluating rules every ${intervalMs / 1000}s`);
  setInterval(runAutomationCycle, intervalMs);
  runAutomationCycle();
}
