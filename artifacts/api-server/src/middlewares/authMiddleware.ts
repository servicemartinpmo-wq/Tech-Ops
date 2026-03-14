import { type Request, type Response, type NextFunction } from "express";

interface AuthUser {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

declare global {
  namespace Express {
    interface User extends AuthUser {}

    interface Request {
      isAuthenticated(): this is AuthedRequest;
      user?: User | undefined;
      apiKeyId?: number;
    }

    interface AuthedRequest {
      user: User;
    }
  }
}

import { createHash } from "crypto";
import { clearSession, getSessionId, getSession } from "../lib/auth";
import { db, apiKeysTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

async function resolveApiKey(rawKey: string): Promise<{ user: AuthUser; keyId: number } | null> {
  try {
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    const [key] = await db.select().from(apiKeysTable).where(
      and(
        eq(apiKeysTable.keyHash, keyHash),
        eq(apiKeysTable.revoked, false),
      )
    ).limit(1);

    if (!key) return null;
    if (key.expiresAt && key.expiresAt < new Date()) return null;

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, key.userId)).limit(1);
    if (!user) return null;

    db.update(apiKeysTable)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeysTable.id, key.id))
      .catch(() => {});

    return {
      user: {
        id: user.id,
        email: user.email ?? undefined,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
        profileImageUrl: user.profileImageUrl ?? undefined,
      },
      keyId: key.id,
    };
  } catch {
    return null;
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer tk_")) {
    const rawKey = authHeader.slice(7).trim();
    const result = await resolveApiKey(rawKey);
    if (result) {
      req.user = result.user;
      req.apiKeyId = result.keyId;
      next();
      return;
    }
  }

  const sid = getSessionId(req);
  if (!sid) { next(); return; }

  const session = await getSession(sid);
  if (!session?.user?.id) {
    await clearSession(res, sid);
    next();
    return;
  }

  req.user = session.user;
  next();
}
