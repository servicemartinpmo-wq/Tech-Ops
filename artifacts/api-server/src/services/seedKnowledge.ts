import { db, knowledgeNodesTable, knowledgeEdgesTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { buildSearchText } from "./embeddings";
import { KB } from "../kb/knowledge-base";

const DOMAIN_RELATIONSHIPS: Record<string, string[]> = {
  "Networking": ["Security", "Cloud", "DevOps"],
  "Security": ["Networking", "Application"],
  "Database": ["Application", "Cloud"],
  "Cloud": ["DevOps", "Networking", "Database"],
  "DevOps": ["Cloud", "Application"],
  "Application": ["Database", "DevOps", "Security"],
  "OS": ["Application", "Networking"],
};

export async function seedKnowledgeBase(): Promise<{ nodesCreated: number; edgesCreated: number }> {
  const existing = await db.select({ count: sql<number>`count(*)` }).from(knowledgeNodesTable);
  if (Number(existing[0].count) > 0) {
    console.log(`Knowledge base already has ${existing[0].count} nodes — skipping seed.`);
    return { nodesCreated: 0, edgesCreated: 0 };
  }

  console.log(`Seeding ${KB.length} knowledge nodes...`);

  const insertedNodes: Array<{ id: number; externalId: string; domain: string }> = [];

  for (const entry of KB) {
    const searchText = buildSearchText({
      domain: entry.domain,
      subdomain: entry.subdomain,
      title: entry.issueType,
      symptoms: entry.symptoms,
      resolutionSteps: entry.resolutionSteps,
      tags: entry.tags,
    });

    const [node] = await db.insert(knowledgeNodesTable).values({
      externalId: entry.id,
      domain: entry.domain,
      subdomain: entry.subdomain,
      title: `${entry.domain} — ${entry.subdomain}: ${entry.issueType}`,
      type: "troubleshooting",
      description: `Issue: ${entry.symptoms.slice(0, 3).join(", ")}`,
      source: "seed",
      symptoms: entry.symptoms,
      resolutionSteps: entry.resolutionSteps,
      tags: entry.tags,
      tier: entry.tier,
      selfHealable: entry.selfHealable ? "true" : "false",
      escalationConditions: entry.escalationConditions || [],
      estimatedTime: entry.estimatedTime,
      searchText,
      confidenceScore: entry.historicalSuccess,
      historicalSuccess: entry.historicalSuccess,
    }).returning({ id: knowledgeNodesTable.id, externalId: knowledgeNodesTable.externalId, domain: knowledgeNodesTable.domain });

    insertedNodes.push(node);
  }

  console.log("Creating knowledge edges...");
  let edgesCreated = 0;

  for (const nodeA of insertedNodes) {
    const relatedDomains = DOMAIN_RELATIONSHIPS[nodeA.domain] || [];
    for (const nodeB of insertedNodes) {
      if (nodeA.id >= nodeB.id) continue;
      if (relatedDomains.includes(nodeB.domain)) {
        await db.insert(knowledgeEdgesTable).values({
          nodeA: nodeA.id,
          nodeB: nodeB.id,
          relationshipType: "domain_related",
          weight: 0.5,
        });
        edgesCreated++;
      }
    }
  }

  console.log(`Seed complete: ${insertedNodes.length} nodes, ${edgesCreated} edges.`);
  return { nodesCreated: insertedNodes.length, edgesCreated };
}
