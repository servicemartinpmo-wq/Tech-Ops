import { Router, type IRouter, type Response } from "express";
import { eq, desc, and, sql } from "drizzle-orm";
import { db, environmentSnapshotsTable, connectorHealthHistoryTable, knowledgeNodesTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import type { AuthenticatedRequest } from "../types";

const router: IRouter = Router();

function handle(fn: (req: AuthenticatedRequest, res: Response) => Promise<void>) {
  return async (req: unknown, res: Response, next: (e?: unknown) => void): Promise<void> => {
    try {
      const a = req as unknown as AuthenticatedRequest;
      if (!a.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }
      await fn(a, res);
    } catch (err) { next(err); }
  };
}

router.get("/stack/intelligence", handle(async (req, res) => {
  const uid = req.user.id;

  // Fetch latest environment snapshot
  const [latestSnapshot] = await db.select()
    .from(environmentSnapshotsTable)
    .where(eq(environmentSnapshotsTable.userId, uid))
    .orderBy(desc(environmentSnapshotsTable.createdAt))
    .limit(1);

  // Fetch connector health summary
  const connectors = await db.select({
    name: connectorHealthHistoryTable.connectorName,
    latestStatus: sql<string>`(array_agg(status ORDER BY checked_at DESC))[1]`,
    checks: sql<number>`count(*)`,
    failures: sql<number>`count(*) FILTER (WHERE status != 'healthy')`,
  }).from(connectorHealthHistoryTable)
    .where(eq(connectorHealthHistoryTable.userId, uid))
    .groupBy(connectorHealthHistoryTable.connectorName);

  // Fetch KB domains for categorization
  const kbDomains = await db.selectDistinct({ domain: knowledgeNodesTable.domain })
    .from(knowledgeNodesTable).orderBy(knowledgeNodesTable.domain);

  const snapshotData = latestSnapshot?.data as Record<string, unknown> | null;
  const hasSnapshot = !!latestSnapshot;

  // Build context for Apphia analysis
  const contextLines: string[] = [];

  if (hasSnapshot) {
    contextLines.push(`## Environment Snapshot (captured ${latestSnapshot.createdAt.toISOString()})`);
    if (snapshotData?.os) contextLines.push(`- OS: ${JSON.stringify(snapshotData.os)}`);
    if (snapshotData?.hardware) contextLines.push(`- Hardware: ${JSON.stringify(snapshotData.hardware)}`);
    if (snapshotData?.software) contextLines.push(`- Software: ${JSON.stringify(snapshotData.software)}`);
    if (snapshotData?.network) contextLines.push(`- Network: ${JSON.stringify(snapshotData.network)}`);
  } else {
    contextLines.push("## Environment: No snapshot captured yet.");
  }

  contextLines.push(`\n## Connected Systems (${connectors.length} connectors):`);
  for (const c of connectors) {
    const uptime = c.checks > 0 ? Math.round(((Number(c.checks) - Number(c.failures)) / Number(c.checks)) * 100) : 100;
    contextLines.push(`- ${c.name}: status=${c.latestStatus}, uptime=${uptime}%, checks=${c.checks}`);
  }
  contextLines.push(`\n## KB Domains: ${kbDomains.map(d => d.domain).join(", ")}`);

  const context = contextLines.join("\n");

  // Generate recommendations via Apphia
  let recommendations: Array<{
    category: string; title: string; priority: "critical" | "high" | "medium" | "low";
    rationale: string; action: string; estimatedImpact: string;
  }> = [];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1500,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are Apphia, the knowledge engine for Tech-Ops by Martin PMO. Analyze the user's technology stack and connected systems, then generate specific, actionable recommendations. Return ONLY valid JSON matching this schema:
{
  "recommendations": [
    {
      "category": "string (e.g. Security, Performance, Connectivity, Monitoring, Storage)",
      "title": "string",
      "priority": "critical|high|medium|low",
      "rationale": "string (1-2 sentences explaining why based on the actual data)",
      "action": "string (specific step to take)",
      "estimatedImpact": "string (e.g. '~40% reduction in auth failures')"
    }
  ],
  "stackHealth": { "score": number_0_100, "summary": "string" },
  "topGaps": ["string"]
}
Generate 5-8 recommendations based on the actual data. If no snapshot exists, focus on recommending environment capture and connector setup. Never say 'AI' or 'assistant'.`,
        },
        {
          role: "user",
          content: `Analyze this tech stack and provide recommendations:\n\n${context}`,
        },
      ],
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}") as {
      recommendations?: typeof recommendations;
      stackHealth?: { score: number; summary: string };
      topGaps?: string[];
    };
    recommendations = parsed.recommendations || [];

    res.json({
      hasSnapshot,
      snapshotAge: latestSnapshot ? Math.round((Date.now() - latestSnapshot.createdAt.getTime()) / (1000 * 60)) : null,
      connectors: connectors.map(c => ({
        name: c.name,
        status: c.latestStatus,
        uptime: c.checks > 0 ? Math.round(((Number(c.checks) - Number(c.failures)) / Number(c.checks)) * 100) : 100,
        totalChecks: Number(c.checks),
      })),
      kbDomains: kbDomains.map(d => d.domain),
      recommendations,
      stackHealth: parsed.stackHealth || { score: hasSnapshot ? 65 : 30, summary: "Insufficient data for full analysis." },
      topGaps: parsed.topGaps || [],
    });
  } catch (err) {
    // Fallback if AI call fails
    res.json({
      hasSnapshot,
      snapshotAge: null,
      connectors: connectors.map(c => ({
        name: c.name, status: c.latestStatus,
        uptime: 100, totalChecks: Number(c.checks),
      })),
      kbDomains: kbDomains.map(d => d.domain),
      recommendations: [],
      stackHealth: { score: hasSnapshot ? 60 : 25, summary: "Analysis unavailable. Check API configuration." },
      topGaps: ["Capture environment snapshot", "Connect at least one system connector"],
      error: "Recommendation engine temporarily unavailable",
    });
  }
}));

export default router;
