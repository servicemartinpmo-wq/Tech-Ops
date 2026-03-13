import {
  pgTable, text, serial, timestamp, integer, jsonb, boolean, index,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const hostedProjectsTable = pgTable("hosted_projects", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("draft"),
  description: text("description"),
  framework: text("framework"),
  buildCommand: text("build_command"),
  startCommand: text("start_command"),
  outputDir: text("output_dir"),
  envVars: jsonb("env_vars").$type<Record<string, string>>().default({}),
  customDomain: text("custom_domain"),
  previewUrl: text("preview_url"),
  deployedAt: timestamp("deployed_at", { withTimezone: true }),
  buildLog: text("build_log"),
  settings: jsonb("settings").$type<Record<string, unknown>>().default({}),
  tags: jsonb("tags").$type<string[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("hosted_projects_user_idx").on(table.userId),
  index("hosted_projects_slug_idx").on(table.slug),
  index("hosted_projects_type_idx").on(table.type),
]);

export type HostedProject = typeof hostedProjectsTable.$inferSelect;
export type InsertHostedProject = typeof hostedProjectsTable.$inferInsert;

export const hostedDomainsTable = pgTable("hosted_domains", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  projectId: integer("project_id"),
  domain: text("domain").notNull(),
  subdomain: text("subdomain"),
  status: text("status").notNull().default("pending"),
  verificationToken: text("verification_token"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  sslStatus: text("ssl_status").notNull().default("pending"),
  sslIssuedAt: timestamp("ssl_issued_at", { withTimezone: true }),
  sslExpiresAt: timestamp("ssl_expires_at", { withTimezone: true }),
  dnsRecords: jsonb("dns_records").$type<Array<{
    type: string; name: string; value: string; ttl: number;
  }>>().default([]),
  autoRenewSsl: boolean("auto_renew_ssl").notNull().default(true),
  registrar: text("registrar"),
  nameservers: jsonb("nameservers").$type<string[]>().default([]),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("hosted_domains_user_idx").on(table.userId),
  index("hosted_domains_domain_idx").on(table.domain),
  index("hosted_domains_project_idx").on(table.projectId),
]);

export type HostedDomain = typeof hostedDomainsTable.$inferSelect;
export type InsertHostedDomain = typeof hostedDomainsTable.$inferInsert;

export const screenshareSessionsTable = pgTable("screenshare_sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  sessionToken: text("session_token").notNull(),
  label: text("label"),
  targetUrl: text("target_url"),
  status: text("status").notNull().default("active"),
  encryptionKeyHash: text("encryption_key_hash").notNull(),
  actionLog: jsonb("action_log").$type<Array<{
    ts: string;
    actionType: string;
    encryptedPayload: string;
    iv: string;
    authTag: string;
    approved: boolean;
    result?: string;
  }>>().default([]),
  allowedActionTypes: jsonb("allowed_action_types")
    .$type<string[]>()
    .default(["navigate", "click", "type", "login", "fill_form", "screenshot_request"]),
  maxActions: integer("max_actions").notNull().default(100),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("screenshare_sessions_user_idx").on(table.userId),
  index("screenshare_sessions_token_idx").on(table.sessionToken),
]);

export type ScreenshareSession = typeof screenshareSessionsTable.$inferSelect;
export type InsertScreenshareSession = typeof screenshareSessionsTable.$inferInsert;

export const companyVaultDocumentsTable = pgTable("company_vault_documents", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  fileType: text("file_type"),
  fileSizeBytes: integer("file_size_bytes"),
  encryptedContent: text("encrypted_content").notNull(),
  iv: text("iv").notNull(),
  salt: text("salt").notNull(),
  authTag: text("auth_tag").notNull(),
  tags: jsonb("tags").$type<string[]>().default([]),
  isConfidential: boolean("is_confidential").notNull().default(true),
  sharedWith: jsonb("shared_with").$type<string[]>().default([]),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
  accessCount: integer("access_count").notNull().default(0),
  version: integer("version").notNull().default(1),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("company_vault_user_idx").on(table.userId),
  index("company_vault_category_idx").on(table.category),
]);

export type CompanyVaultDocument = typeof companyVaultDocumentsTable.$inferSelect;
export type InsertCompanyVaultDocument = typeof companyVaultDocumentsTable.$inferInsert;

export const VAULT_CATEGORIES = [
  "legal", "financial", "hr", "credentials", "policy", "contracts",
  "compliance", "technical", "general",
] as const;
export type VaultCategory = typeof VAULT_CATEGORIES[number];

export const HOSTED_PROJECT_TYPES = ["app", "web", "api", "static"] as const;
export type HostedProjectType = typeof HOSTED_PROJECT_TYPES[number];

export const insertHostedProjectSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "slug must be lowercase letters, numbers, hyphens only"),
  type: z.enum(HOSTED_PROJECT_TYPES),
  description: z.string().optional(),
  framework: z.string().optional(),
  buildCommand: z.string().optional(),
  startCommand: z.string().optional(),
  outputDir: z.string().optional(),
  envVars: z.record(z.string(), z.string()).optional().default({}),
  tags: z.array(z.string()).optional().default([]),
  settings: z.record(z.string(), z.unknown()).optional().default({}),
});

export const insertHostedDomainSchema = z.object({
  domain: z.string().min(4).regex(
    /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
    "Invalid domain format"
  ),
  subdomain: z.string().optional(),
  projectId: z.number().int().positive().optional(),
  registrar: z.string().optional(),
  autoRenewSsl: z.boolean().optional().default(true),
});
