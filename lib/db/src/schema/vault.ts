import { pgTable, text, serial, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const secureVaultTable = pgTable("secure_vault", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  encryptedContent: text("encrypted_content").notNull(),
  iv: text("iv").notNull(),
  salt: text("salt").notNull(),
  accessToken: text("access_token").notNull(),
  passwordProtected: boolean("password_protected").notNull().default(true),
  accessCount: integer("access_count").notNull().default(0),
  maxAccess: integer("max_access"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSecureVaultSchema = createInsertSchema(secureVaultTable).omit({ id: true, createdAt: true, accessCount: true });
export type InsertSecureVault = z.infer<typeof insertSecureVaultSchema>;
export type SecureVault = typeof secureVaultTable.$inferSelect;
