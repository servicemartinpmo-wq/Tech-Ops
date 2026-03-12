import type { Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { AuthenticatedRequest } from "../types";

const TIER_LIMITS: Record<string, {
  maxCases: number;
  maxBatchConcurrency: number;
  features: string[];
}> = {
  free: {
    maxCases: 3,
    maxBatchConcurrency: 1,
    features: ["basic_diagnostics"],
  },
  individual: {
    maxCases: 10,
    maxBatchConcurrency: 1,
    features: ["basic_diagnostics", "single_connector"],
  },
  professional: {
    maxCases: 50,
    maxBatchConcurrency: 5,
    features: ["advanced_diagnostics", "multi_connector", "preferences_quiz", "batch_execution"],
  },
  business: {
    maxCases: 200,
    maxBatchConcurrency: 20,
    features: ["full_diagnostics", "automation_center", "connector_monitoring", "batch_execution", "priority_support"],
  },
  enterprise: {
    maxCases: Infinity,
    maxBatchConcurrency: Infinity,
    features: ["all_features", "custom_integrations", "dedicated_support", "sla_guarantee"],
  },
};

export function getTierLimits(tier: string) {
  return TIER_LIMITS[tier] || TIER_LIMITS.free;
}

export function requireFeature(feature: string) {
  return async (req: unknown, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.isAuthenticated()) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, authReq.user.id));
    const tier = user?.subscriptionTier || "free";
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
    const authReq = req as AuthenticatedRequest;
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
    if (limits.features.includes(feature)) return tier;
  }
  return "enterprise";
}
