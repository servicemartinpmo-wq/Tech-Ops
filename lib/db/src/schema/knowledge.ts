import { pgTable, text, serial, timestamp, integer, jsonb, real, index, doublePrecision } from "drizzle-orm/pg-core";
import { customType } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const vector = customType<{ data: number[]; driverParam: string; config: { dimensions: number } }>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 1536})`;
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    if (typeof value === "string") {
      return value
        .replace(/[\[\]]/g, "")
        .split(",")
        .map(Number);
    }
    return value as unknown as number[];
  },
});

export const knowledgeNodesTable = pgTable("knowledge_nodes", {
  id: serial("id").primaryKey(),
  externalId: text("external_id").notNull().unique(),
  domain: text("domain").notNull(),
  subdomain: text("subdomain"),
  title: text("title").notNull(),
  type: text("type").notNull().default("troubleshooting"),
  description: text("description"),
  source: text("source").default("seed"),
  symptoms: jsonb("symptoms").$type<string[]>(),
  resolutionSteps: jsonb("resolution_steps").$type<string[]>(),
  tags: jsonb("tags").$type<string[]>(),
  tier: text("tier"),
  selfHealable: text("self_healable").default("false"),
  escalationConditions: jsonb("escalation_conditions").$type<string[]>(),
  estimatedTime: text("estimated_time"),
  searchText: text("search_text"),
  embedding: vector("embedding", { dimensions: 1536 }),
  confidenceScore: doublePrecision("confidence_score").notNull().default(0.5),
  historicalSuccess: doublePrecision("historical_success").notNull().default(0.5),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const knowledgeEdgesTable = pgTable("knowledge_edges", {
  id: serial("id").primaryKey(),
  nodeA: integer("node_a").notNull().references(() => knowledgeNodesTable.id, { onDelete: "cascade" }),
  nodeB: integer("node_b").notNull().references(() => knowledgeNodesTable.id, { onDelete: "cascade" }),
  relationshipType: text("relationship_type").notNull(),
  weight: doublePrecision("weight").notNull().default(1.0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type KnowledgeNode = typeof knowledgeNodesTable.$inferSelect;
export type InsertKnowledgeNode = typeof knowledgeNodesTable.$inferInsert;
export type KnowledgeEdge = typeof knowledgeEdgesTable.$inferSelect;
export type InsertKnowledgeEdge = typeof knowledgeEdgesTable.$inferInsert;
