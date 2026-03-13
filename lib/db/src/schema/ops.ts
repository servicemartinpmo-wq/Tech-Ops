import { pgTable, text, serial, timestamp, integer, jsonb, real, boolean, doublePrecision, index } from "drizzle-orm/pg-core";

export const environmentSnapshotsTable = pgTable("environment_snapshots", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  caseId: integer("case_id"),
  label: text("label").notNull(),
  environment: text("environment").notNull().default("production"),
  region: text("region"),
  cloudProvider: text("cloud_provider"),
  topology: jsonb("topology").$type<Record<string, unknown>>(),
  services: jsonb("services").$type<Array<{ name: string; status: string; version?: string; health?: string }>>(),
  connectorStatuses: jsonb("connector_statuses").$type<Record<string, string>>(),
  metrics: jsonb("metrics").$type<Record<string, number>>(),
  flags: jsonb("flags").$type<string[]>(),
  rawContext: text("raw_context"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("env_snapshots_user_idx").on(table.userId),
  index("env_snapshots_case_idx").on(table.caseId),
]);

export type EnvironmentSnapshot = typeof environmentSnapshotsTable.$inferSelect;
export type InsertEnvironmentSnapshot = typeof environmentSnapshotsTable.$inferInsert;

export const analyticsEventsTable = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  eventType: text("event_type").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  domain: text("domain"),
  severity: text("severity"),
  stage: integer("stage"),
  confidenceScore: doublePrecision("confidence_score"),
  durationMs: integer("duration_ms"),
  tokenCount: integer("token_count"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("analytics_events_user_idx").on(table.userId),
  index("analytics_events_type_idx").on(table.eventType),
  index("analytics_events_created_idx").on(table.createdAt),
]);

export type AnalyticsEvent = typeof analyticsEventsTable.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEventsTable.$inferInsert;

export const errorPatternsTable = pgTable("error_patterns", {
  id: serial("id").primaryKey(),
  patternKey: text("pattern_key").notNull().unique(),
  domain: text("domain").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  occurrenceCount: integer("occurrence_count").notNull().default(1),
  lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
  avgResolutionMs: integer("avg_resolution_ms"),
  avgConfidence: doublePrecision("avg_confidence"),
  relatedCaseIds: jsonb("related_case_ids").$type<number[]>(),
  relatedKbIds: jsonb("related_kb_ids").$type<string[]>(),
  tags: jsonb("tags").$type<string[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("error_patterns_domain_idx").on(table.domain),
  index("error_patterns_count_idx").on(table.occurrenceCount),
]);

export type ErrorPattern = typeof errorPatternsTable.$inferSelect;
export type InsertErrorPattern = typeof errorPatternsTable.$inferInsert;

export const playbooksTable = pgTable("playbooks", {
  id: serial("id").primaryKey(),
  externalId: text("external_id").notNull().unique(),
  domain: text("domain").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  trigger: text("trigger").notNull(),
  steps: jsonb("steps").$type<Array<{ order: number; action: string; params?: Record<string, unknown>; approval_required?: boolean; rollback?: string }>>(),
  permissions: jsonb("permissions").$type<string[]>(),
  tier: text("tier"),
  estimatedDurationMs: integer("estimated_duration_ms"),
  riskLevel: text("risk_level").notNull().default("low"),
  successCount: integer("success_count").notNull().default(0),
  failureCount: integer("failure_count").notNull().default(0),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("playbooks_domain_idx").on(table.domain),
]);

export type Playbook = typeof playbooksTable.$inferSelect;
export type InsertPlaybook = typeof playbooksTable.$inferInsert;

export const escalationHistoryTable = pgTable("escalation_history", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull(),
  userId: text("user_id").notNull(),
  fromTier: text("from_tier"),
  toTier: text("to_tier").notNull(),
  reason: text("reason").notNull(),
  triggeredBy: text("triggered_by").notNull().default("system"),
  confidenceAtEscalation: doublePrecision("confidence_at_escalation"),
  pipelineStageAtEscalation: integer("pipeline_stage_at_escalation"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("escalation_history_case_idx").on(table.caseId),
  index("escalation_history_user_idx").on(table.userId),
]);

export type EscalationHistory = typeof escalationHistoryTable.$inferSelect;
export type InsertEscalationHistory = typeof escalationHistoryTable.$inferInsert;

export const remoteSessionsTable = pgTable("remote_sessions", {
  id: serial("id").primaryKey(),
  sessionToken: text("session_token").notNull().unique(),
  userId: text("user_id").notNull(),
  caseId: integer("case_id"),
  scope: text("scope").notNull().default("read"),
  targetSystem: text("target_system"),
  permissions: jsonb("permissions").$type<string[]>(),
  status: text("status").notNull().default("active"),
  commandLog: jsonb("command_log").$type<Array<{ ts: string; command: string; output: string; approved: boolean; exitCode: number }>>(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  approvedBy: text("approved_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
}, (table) => [
  index("remote_sessions_user_idx").on(table.userId),
  index("remote_sessions_token_idx").on(table.sessionToken),
]);

export type RemoteSession = typeof remoteSessionsTable.$inferSelect;
export type InsertRemoteSession = typeof remoteSessionsTable.$inferInsert;
