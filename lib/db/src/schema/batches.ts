import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const batchesTable = pgTable("batches", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("pending"),
  totalCases: integer("total_cases").notNull().default(0),
  completedCases: integer("completed_cases").notNull().default(0),
  failedCases: integer("failed_cases").notNull().default(0),
  concurrencyLimit: integer("concurrency_limit").notNull().default(1),
  crossCasePatterns: jsonb("cross_case_patterns"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertBatchSchema = createInsertSchema(batchesTable).omit({ id: true, createdAt: true });
export type InsertBatch = z.infer<typeof insertBatchSchema>;
export type Batch = typeof batchesTable.$inferSelect;

export const batchCasesTable = pgTable("batch_cases", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull(),
  caseId: integer("case_id").notNull(),
  status: text("status").notNull().default("pending"),
  result: jsonb("result"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertBatchCaseSchema = createInsertSchema(batchCasesTable).omit({ id: true });
export type InsertBatchCase = z.infer<typeof insertBatchCaseSchema>;
export type BatchCase = typeof batchCasesTable.$inferSelect;

export const diagnosticAttemptsTable = pgTable("diagnostic_attempts", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull(),
  userId: text("user_id").notNull(),
  tier: integer("tier").notNull(),
  status: text("status").notNull().default("running"),
  signals: jsonb("signals"),
  udoGraph: jsonb("udo_graph"),
  rootCauses: jsonb("root_causes"),
  confidenceScore: integer("confidence_score"),
  costTokens: integer("cost_tokens"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertDiagnosticAttemptSchema = createInsertSchema(diagnosticAttemptsTable).omit({ id: true, createdAt: true });
export type DiagnosticAttempt = typeof diagnosticAttemptsTable.$inferSelect;

export const systemAlertsTable = pgTable("system_alerts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  severity: text("severity").notNull().default("info"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  source: text("source"),
  acknowledged: text("acknowledged").notNull().default("false"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSystemAlertSchema = createInsertSchema(systemAlertsTable).omit({ id: true, createdAt: true });
export type SystemAlert = typeof systemAlertsTable.$inferSelect;

export const auditLogTable = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogTable).omit({ id: true, createdAt: true });
export type AuditLog = typeof auditLogTable.$inferSelect;
