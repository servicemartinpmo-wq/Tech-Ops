import { Router, type Response } from "express";
import { db } from "@workspace/db";
import { casesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import type { AuthenticatedRequest } from "../types";
import type { NextFunction, Request } from "express";
import { z } from "zod/v4";

const router = Router();

function handle(fn: (req: AuthenticatedRequest, res: Response) => Promise<void>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const a = req as unknown as AuthenticatedRequest;
      if (!a.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }
      await fn(a, res);
    } catch (err) { next(err); }
  };
}

const recommendSchema = z.object({
  question:  z.string().min(3).max(2000),
  context:   z.string().max(5000).optional(),
  caseId:    z.number().int().positive().optional(),
  domain:    z.string().max(100).optional(),
  urgency:   z.enum(["low", "medium", "high", "critical"]).optional().default("medium"),
});

const DOMAIN_KNOWLEDGE: Record<string, {
  patterns: RegExp[];
  recommendation: string;
  confidence: number;
  alternatives?: string[];
  caveats?: string[];
}[]> = {
  connectivity: [
    {
      patterns: [/timeout|connection.*refused|cannot.*connect/i],
      recommendation: "Check firewall rules first — 80% of connection issues are blocked ports. Run `netstat -tlpn` to see what's listening, then verify the target service is actually running.",
      confidence: 0.85,
      alternatives: ["Check DNS resolution with `nslookup`", "Test with `curl -v` for detailed handshake info"],
      caveats: ["If behind a proxy, ensure CONNECT is allowed for HTTPS"],
    },
    {
      patterns: [/dns|hostname|resolve/i],
      recommendation: "Flush the DNS cache and test with a raw IP address to isolate DNS from routing issues.",
      confidence: 0.80,
    },
  ],
  performance: [
    {
      patterns: [/slow|latency|high.*cpu|memory.*leak/i],
      recommendation: "Profile before optimizing. Use `top` to identify the heaviest process, then check for memory leaks with heap snapshots before making code changes.",
      confidence: 0.75,
      caveats: ["Never optimize without a benchmark — you need a baseline to know if your fix worked"],
    },
  ],
  auth: [
    {
      patterns: [/login|auth|401|403|permission|token.*expired/i],
      recommendation: "Check the token expiry first — most auth issues are expired JWTs or session cookies. Inspect the response headers for `WWW-Authenticate` details.",
      confidence: 0.88,
      alternatives: ["Clear all cookies and re-authenticate from scratch", "Verify the clock drift between client and server (JWT is time-sensitive)"],
    },
  ],
  database: [
    {
      patterns: [/database|db|postgres|sql|query.*slow|deadlock/i],
      recommendation: "Run `EXPLAIN ANALYZE` on the slow query first. Add an index on the WHERE clause columns before touching application code.",
      confidence: 0.82,
      alternatives: ["Check for table bloat with `pg_stat_user_tables`", "Look for long-running transactions blocking others"],
    },
  ],
  deployment: [
    {
      patterns: [/deploy|container|docker|kubernetes|pod|crash.*loop/i],
      recommendation: "Check the container logs (`kubectl logs` or `docker logs`) before anything else. Most deployment failures are config/env variable issues, not code bugs.",
      confidence: 0.87,
      alternatives: ["Compare working vs failing env vars", "Run the container locally with the same env to reproduce"],
    },
  ],
};

function analyzeQuestion(question: string, domain?: string, context?: string): {
  recommendation: string;
  confidence: number;
  certainty: "high" | "medium" | "low" | "uncertain";
  alternatives: string[];
  caveats: string[];
  followUpQuestions: string[];
  domain: string;
} {
  const fullText = `${question} ${context || ""}`.toLowerCase();
  let bestMatch: typeof DOMAIN_KNOWLEDGE[string][number] | null = null;
  let bestDomain = domain || "general";

  for (const [dom, entries] of Object.entries(DOMAIN_KNOWLEDGE)) {
    if (domain && dom !== domain) continue;
    for (const entry of entries) {
      if (entry.patterns.some(p => p.test(fullText))) {
        if (!bestMatch || entry.confidence > bestMatch.confidence) {
          bestMatch = entry;
          bestDomain = dom;
        }
      }
    }
  }

  if (!bestMatch) {
    return {
      recommendation: buildUncertainResponse(question),
      confidence: 0,
      certainty: "uncertain",
      alternatives: [
        "Open a support ticket with full error logs for a detailed diagnosis",
        "Check the knowledge base for similar issues",
        "Run a full diagnostic scan through the pipeline",
      ],
      caveats: ["This answer is based on general patterns — your specific environment may differ"],
      followUpQuestions: buildFollowUpQuestions(question),
      domain: bestDomain,
    };
  }

  const certainty = bestMatch.confidence >= 0.85 ? "high"
    : bestMatch.confidence >= 0.70 ? "medium"
    : "low";

  return {
    recommendation: bestMatch.recommendation,
    confidence: bestMatch.confidence,
    certainty,
    alternatives: bestMatch.alternatives || [],
    caveats: bestMatch.caveats || [],
    followUpQuestions: buildFollowUpQuestions(question),
    domain: bestDomain,
  };
}

function buildUncertainResponse(question: string): string {
  const q = question.toLowerCase();
  if (q.includes("should i") || q.includes("which") || q.includes("best")) {
    return "Based on available patterns, I don't have a high-confidence recommendation for this specific situation. The answer depends heavily on your environment, scale, and constraints. I'd suggest opening a diagnostic case so I can analyze your live environment before advising.";
  }
  if (q.includes("why") || q.includes("cause")) {
    return "The root cause isn't clear from the question alone. To give you a reliable answer, I'd need error logs, the environment context, and recent changes made to the system. Run a full diagnostic pipeline to gather that data automatically.";
  }
  return "I don't have enough information to give a confident recommendation on this. Rather than guessing, I'd recommend collecting more data first — run diagnostics, capture logs, and describe what changed recently. That context will lead to a much more useful answer.";
}

function buildFollowUpQuestions(question: string): string[] {
  const q = question.toLowerCase();
  const questions: string[] = [];

  if (!q.includes("error") && !q.includes("log")) {
    questions.push("What error messages or logs are you seeing?");
  }
  if (!q.includes("when") && !q.includes("recently")) {
    questions.push("When did this issue first appear, and what changed around that time?");
  }
  if (!q.includes("environment") && !q.includes("production") && !q.includes("staging")) {
    questions.push("Is this happening in production, staging, or development?");
  }
  if (!q.includes("tried") && !q.includes("attempted")) {
    questions.push("What have you already tried?");
  }
  questions.push("How many users or systems are affected?");

  return questions.slice(0, 3);
}

router.post("/apphia/recommend", handle(async (req, res) => {
  const parsed = recommendSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.format() });
    return;
  }

  const { question, context, caseId, domain, urgency } = parsed.data;

  let caseContext: string | undefined;
  if (caseId) {
    const [c] = await db.select({
      title:   casesTable.title,
      status:  casesTable.status,
      priority: casesTable.priority,
    }).from(casesTable).where(and(
      eq(casesTable.id,     caseId),
      eq(casesTable.userId, req.user.id),
    ));
    if (c) {
      caseContext = `Case context: "${c.title}" (${c.status}, priority: ${c.priority})`;
    }
  }

  const fullContext = [context, caseContext].filter(Boolean).join("\n");
  const analysis = analyzeQuestion(question, domain, fullContext || undefined);

  const urgencyModifier = urgency === "critical" || urgency === "high"
    ? " Given the urgency, act on the highest-confidence option first and escalate if not resolved within 30 minutes."
    : "";

  res.json({
    question,
    domain:           analysis.domain,
    urgency,
    recommendation:   analysis.recommendation + urgencyModifier,
    certainty:        analysis.certainty,
    confidence:       analysis.confidence,
    confidenceLabel:  analysis.confidence >= 0.85 ? "High confidence"
                    : analysis.confidence >= 0.70 ? "Moderate confidence"
                    : analysis.confidence > 0     ? "Low confidence — verify before acting"
                    : "Insufficient data — recommendation not available",
    alternatives:          analysis.alternatives,
    caveats:               analysis.caveats,
    followUpQuestions:     analysis.followUpQuestions,
    disclaimer: "Recommendations are based on pattern analysis. Always validate in a non-production environment first.",
    generatedAt: new Date().toISOString(),
  });
}));

router.get("/apphia/recommend/domains", handle(async (_req, res) => {
  res.json({
    domains: Object.keys(DOMAIN_KNOWLEDGE).map(d => ({
      id:    d,
      label: d.charAt(0).toUpperCase() + d.slice(1),
    })),
  });
}));

export default router;
