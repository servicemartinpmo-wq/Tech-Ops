import { pgTable, text, serial, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const casesTable = pgTable("cases", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("open"),
  priority: text("priority").default("medium"),
  diagnosticTier: integer("diagnostic_tier").default(1),
  rootCause: text("root_cause"),
  resolution: text("resolution"),
  signals: jsonb("signals"),
  udoPath: jsonb("udo_path"),
  confidenceScore: integer("confidence_score"),
  attachments: jsonb("attachments"),
  slaDeadline: timestamp("sla_deadline", { withTimezone: true }),
  slaStatus: text("sla_status").default("on_track"),
  escalated: boolean("escalated").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const insertCaseSchema = createInsertSchema(casesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type Case = typeof casesTable.$inferSelect;

export const connectorHealthTable = pgTable("connector_health", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  connectorName: text("connector_name").notNull(),
  status: text("status").notNull().default("unknown"),
  lastChecked: timestamp("last_checked", { withTimezone: true }).notNull().defaultNow(),
  responseTime: integer("response_time"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
});

export const insertConnectorHealthSchema = createInsertSchema(connectorHealthTable).omit({ id: true });
export type InsertConnectorHealth = z.infer<typeof insertConnectorHealthSchema>;
export type ConnectorHealth = typeof connectorHealthTable.$inferSelect;

export const automationRulesTable = pgTable("automation_rules", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  trigger: text("trigger").notNull(),
  action: text("action").notNull(),
  enabled: text("enabled").notNull().default("true"),
  permissions: jsonb("permissions"),
  executionCount: integer("execution_count").default(0),
  lastExecuted: timestamp("last_executed", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAutomationRuleSchema = createInsertSchema(automationRulesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAutomationRule = z.infer<typeof insertAutomationRuleSchema>;
export type AutomationRule = typeof automationRulesTable.$inferSelect;

export const preferencesQuizTable = pgTable("preferences_quiz", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  answers: jsonb("answers").notNull(),
  profile: jsonb("profile"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPreferencesQuizSchema = createInsertSchema(preferencesQuizTable).omit({ id: true, createdAt: true });
export type InsertPreferencesQuiz = z.infer<typeof insertPreferencesQuizSchema>;
export type PreferencesQuiz = typeof preferencesQuizTable.$inferSelect;
