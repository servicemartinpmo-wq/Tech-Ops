import type { Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { AuthenticatedRequest } from "../types";

const TIER_LIMITS: Record<string, {
  maxCases: number;
  maxBatchConcurrency: number;
  maxConcurrentTickets: number;
  features: string[];
}> = {
  free: {
    maxCases: 3,
    maxBatchConcurrency: 1,
    maxConcurrentTickets: 1,
    features: ["basic_diagnostics"],
  },
  starter: {
    maxCases: 25,
    maxBatchConcurrency: 1,
    maxConcurrentTickets: 1,
    features: ["basic_diagnostics", "single_connector", "vault", "kb_lookup"],
  },
  professional: {
    maxCases: 100,
    maxBatchConcurrency: 2,
    maxConcurrentTickets: 2,
    features: [
      "advanced_diagnostics", "multi_connector", "preferences_quiz",
      "batch_execution", "automation_center", "cybersecurity_monitoring",
      "cloud_management", "vault", "kb_lookup",
    ],
  },
  business: {
    maxCases: 500,
    maxBatchConcurrency: 5,
    maxConcurrentTickets: 5,
    features: [
      "full_diagnostics", "automation_center", "connector_monitoring",
      "batch_execution", "priority_support", "hipaa_compliance",
      "audit_trail", "sla_monitoring", "vault", "kb_lookup",
      "cybersecurity_monitoring", "cloud_management",
    ],
  },
  enterprise: {
    maxCases: Infinity,
    maxBatchConcurrency: Infinity,
    maxConcurrentTickets: Infinity,
    features: ["all_features", "custom_integrations", "dedicated_support", "sla_guarantee"],
  },
};

const TIER_ALIASES: Record<string, string> = {
  individual: "starter",
  foundation: "starter",
  proactive: "professional",
  compliance: "business",
};

export function normalizeTier(tier: string): string {
  const lower = (tier || "free").toLowerCase();
  return TIER_ALIASES[lower] || lower;
}

export function getTierLimits(tier: string) {
  return TIER_LIMITS[normalizeTier(tier)] || TIER_LIMITS.free;
}

export function requireFeature(feature: string) {
  return async (req: unknown, res: Response, next: NextFunction) => {
    const authReq = req as unknown as AuthenticatedRequest;
    if (!authReq.isAuthenticated()) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, authReq.user.id));
    const tier = normalizeTier(user?.subscriptionTier || "free");
    const limits = getTierLimits(tier);

    if (!limits.features.includes(feature) && !limits.features.includes("all_features")) {
      res.status(403).json({
        error: "Feature not available on your plan",
        requiredTier: getMinTierForFeature(feature),
        currentTier: tier,
      });
      return;
    }

    next();
  };
}

export function requireRole(...roles: string[]) {
  return async (req: unknown, res: Response, next: NextFunction) => {
    const authReq = req as unknown as AuthenticatedRequest;
    if (!authReq.isAuthenticated()) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, authReq.user.id));
    const role = user?.role || "viewer";

    if (!roles.includes(role)) {
      res.status(403).json({
        error: "Insufficient permissions",
        requiredRole: roles,
        currentRole: role,
      });
      return;
    }

    next();
  };
}

function getMinTierForFeature(feature: string): string {
  for (const [tier, limits] of Object.entries(TIER_LIMITS)) {
    if (limits.features.includes(feature) || limits.features.includes("all_features")) return tier;
  }
  return "enterprise";
}
