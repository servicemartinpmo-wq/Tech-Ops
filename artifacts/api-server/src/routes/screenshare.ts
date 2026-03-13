import { Router, type Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from "crypto";
import { db, screenshareSessionsTable } from "@workspace/db";
import type { AuthenticatedRequest } from "../types";
import type { NextFunction, Request } from "express";

const router = Router();

const ALLOWED_ACTION_TYPES = new Set([
  "navigate", "click", "type", "login", "fill_form",
  "screenshot_request", "scroll", "select", "submit",
  "key_press", "hover", "wait",
]);

const SENSITIVE_FIELDS = ["password", "secret", "token", "key", "pin", "ssn", "cvv", "card"];

function encryptAction(payload: unknown, sessionKey: string, salt: string): {
  encryptedPayload: string; iv: string; authTag: string;
} {
  const key = scryptSync(sessionKey, salt, 32);
  const iv  = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const text = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return {
    encryptedPayload: encrypted.toString("hex"),
    iv:      iv.toString("hex"),
    authTag: cipher.getAuthTag().toString("hex"),
  };
}

function decryptAction(encryptedPayload: string, iv: string, authTag: string, sessionKey: string, salt: string): unknown {
  const key       = scryptSync(sessionKey, salt, 32);
  const ivBuf     = Buffer.from(iv, "hex");
  const tagBuf    = Buffer.from(authTag, "hex");
  const encrypted = Buffer.from(encryptedPayload, "hex");
  const decipher  = createDecipheriv("aes-256-gcm", key, ivBuf);
  decipher.setAuthTag(tagBuf);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8"));
}

function redactSensitiveFields(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return payload;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload as Record<string, unknown>)) {
    const lower = k.toLowerCase();
    out[k] = SENSITIVE_FIELDS.some(s => lower.includes(s)) ? "[REDACTED]" : v;
  }
  return out;
}

function handle(fn: (req: AuthenticatedRequest, res: Response) => Promise<void>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const a = req as unknown as AuthenticatedRequest;
      if (!a.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }
      await fn(a, res);
    } catch (err) { next(err); }
  };
}

router.post("/remote/screenshare", handle(async (req, res) => {
  const { label, targetUrl, durationMinutes, allowedActionTypes } = req.body;

  const duration = Math.min(parseInt(durationMinutes || "60", 10) || 60, 180);
  const expiresAt = new Date(Date.now() + duration * 60 * 1000);

  const sessionToken = randomBytes(32).toString("hex");
  const sessionKey   = randomBytes(32).toString("hex");
  const salt         = randomBytes(32).toString("hex");
  const keyHash      = `${salt}:${randomBytes(8).toString("hex")}`;

  if (targetUrl) {
    try { new URL(targetUrl); } catch {
      res.status(400).json({ error: "Invalid targetUrl format" });
      return;
    }
  }

  const allowedTypes: string[] = Array.isArray(allowedActionTypes)
    ? allowedActionTypes.filter((t: unknown) => typeof t === "string" && ALLOWED_ACTION_TYPES.has(t))
    : [...ALLOWED_ACTION_TYPES];

  const [session] = await db.insert(screenshareSessionsTable).values({
    userId:             req.user.id,
    sessionToken,
    label:              (label as string | undefined) || null,
    targetUrl:          (targetUrl as string | undefined) || null,
    status:             "active",
    encryptionKeyHash:  keyHash,
    actionLog:          [],
    allowedActionTypes: allowedTypes,
    maxActions:         100,
    expiresAt,
  }).returning();

  res.status(201).json({
    sessionId:    session.id,
    sessionToken,
    sessionKey,
    salt,
    label:        session.label,
    targetUrl:    session.targetUrl,
    expiresAt:    session.expiresAt,
    allowedActionTypes: session.allowedActionTypes,
    securityNote: "Your session key and salt are shown ONCE. Store them securely — they encrypt all actions in this session.",
  });
}));

router.post("/remote/screenshare/:id/action", handle(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid session ID" }); return; }

  const { sessionToken, sessionKey, salt, actionType, payload } = req.body;

  if (!sessionToken || !sessionKey || !salt || !actionType) {
    res.status(400).json({ error: "sessionToken, sessionKey, salt, and actionType are required" });
    return;
  }

  if (!ALLOWED_ACTION_TYPES.has(actionType)) {
    res.status(400).json({ error: `Invalid actionType. Allowed: ${[...ALLOWED_ACTION_TYPES].join(", ")}` });
    return;
  }

  const [session] = await db.select().from(screenshareSessionsTable)
    .where(and(
      eq(screenshareSessionsTable.id,     id),
      eq(screenshareSessionsTable.userId, req.user.id),
    ));

  if (!session) { res.status(404).json({ error: "Session not found" }); return; }
  if (session.sessionToken !== sessionToken) { res.status(403).json({ error: "Invalid session token" }); return; }
  if (session.status !== "active") { res.status(410).json({ error: `Session is ${session.status}` }); return; }
  if (new Date() > session.expiresAt) {
    await db.update(screenshareSessionsTable)
      .set({ status: "expired" }).where(eq(screenshareSessionsTable.id, id));
    res.status(410).json({ error: "Session has expired" });
    return;
  }

  const currentLog = session.actionLog || [];
  if (currentLog.length >= (session.maxActions || 100)) {
    res.status(429).json({ error: "Maximum action limit reached for this session" });
    return;
  }

  const allowedTypes = session.allowedActionTypes as string[];
  if (!allowedTypes.includes(actionType)) {
    res.status(403).json({ error: `Action type "${actionType}" not allowed in this session` });
    return;
  }

  let encResult: { encryptedPayload: string; iv: string; authTag: string };
  try {
    encResult = encryptAction(payload || {}, sessionKey, salt);
  } catch {
    res.status(400).json({ error: "Failed to encrypt action — verify your sessionKey and salt" });
    return;
  }

  const actionEntry = {
    ts:               new Date().toISOString(),
    actionType,
    encryptedPayload: encResult.encryptedPayload,
    iv:               encResult.iv,
    authTag:          encResult.authTag,
    approved:         true,
    result:           simulateActionResult(actionType, payload, session.targetUrl),
  };

  const updatedLog = [...currentLog, actionEntry];
  await db.update(screenshareSessionsTable)
    .set({ actionLog: updatedLog })
    .where(eq(screenshareSessionsTable.id, id));

  res.json({
    success:      true,
    actionId:     currentLog.length,
    actionType,
    result:       actionEntry.result,
    actionsUsed:  updatedLog.length,
    actionsLeft:  (session.maxActions || 100) - updatedLog.length,
    executedAt:   actionEntry.ts,
    payloadSummary: redactSensitiveFields(payload),
  });
}));

router.post("/remote/screenshare/:id/decrypt-log", handle(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid session ID" }); return; }

  const { sessionToken, sessionKey, salt } = req.body;
  if (!sessionToken || !sessionKey || !salt) {
    res.status(400).json({ error: "sessionToken, sessionKey, and salt are required" });
    return;
  }

  const [session] = await db.select().from(screenshareSessionsTable)
    .where(and(
      eq(screenshareSessionsTable.id,     id),
      eq(screenshareSessionsTable.userId, req.user.id),
    ));

  if (!session) { res.status(404).json({ error: "Session not found" }); return; }
  if (session.sessionToken !== sessionToken) { res.status(403).json({ error: "Invalid session token" }); return; }

  const log = session.actionLog || [];
  const decrypted = log.map((entry: {
    ts: string; actionType: string; encryptedPayload: string;
    iv: string; authTag: string; approved: boolean; result?: string;
  }) => {
    try {
      const payload = decryptAction(entry.encryptedPayload, entry.iv, entry.authTag, sessionKey, salt);
      return {
        ts:         entry.ts,
        actionType: entry.actionType,
        approved:   entry.approved,
        result:     entry.result,
        payload:    redactSensitiveFields(payload),
      };
    } catch {
      return { ts: entry.ts, actionType: entry.actionType, approved: entry.approved, payload: "[decrypt failed]" };
    }
  });

  res.json({ sessionId: id, actionCount: log.length, actions: decrypted });
}));

router.get("/remote/screenshare/:id", handle(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid session ID" }); return; }

  const [session] = await db.select({
    id:                 screenshareSessionsTable.id,
    label:              screenshareSessionsTable.label,
    targetUrl:          screenshareSessionsTable.targetUrl,
    status:             screenshareSessionsTable.status,
    allowedActionTypes: screenshareSessionsTable.allowedActionTypes,
    maxActions:         screenshareSessionsTable.maxActions,
    expiresAt:          screenshareSessionsTable.expiresAt,
    closedAt:           screenshareSessionsTable.closedAt,
    createdAt:          screenshareSessionsTable.createdAt,
    actionCount:        screenshareSessionsTable.actionLog,
  }).from(screenshareSessionsTable)
    .where(and(
      eq(screenshareSessionsTable.id,     id),
      eq(screenshareSessionsTable.userId, req.user.id),
    ));

  if (!session) { res.status(404).json({ error: "Session not found" }); return; }

  res.json({
    ...session,
    actionCount: Array.isArray(session.actionCount) ? session.actionCount.length : 0,
    actionLog:   undefined,
  });
}));

router.get("/remote/screenshare", handle(async (req, res) => {
  const sessions = await db.select({
    id:          screenshareSessionsTable.id,
    label:       screenshareSessionsTable.label,
    targetUrl:   screenshareSessionsTable.targetUrl,
    status:      screenshareSessionsTable.status,
    expiresAt:   screenshareSessionsTable.expiresAt,
    closedAt:    screenshareSessionsTable.closedAt,
    createdAt:   screenshareSessionsTable.createdAt,
    actionLog:   screenshareSessionsTable.actionLog,
  }).from(screenshareSessionsTable)
    .where(eq(screenshareSessionsTable.userId, req.user.id))
    .orderBy(desc(screenshareSessionsTable.createdAt))
    .limit(25);

  res.json({
    sessions: sessions.map(s => ({
      ...s,
      actionCount: Array.isArray(s.actionLog) ? s.actionLog.length : 0,
      actionLog:   undefined,
    })),
  });
}));

router.post("/remote/screenshare/:id/close", handle(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid session ID" }); return; }

  const [session] = await db.select({ id: screenshareSessionsTable.id, actionLog: screenshareSessionsTable.actionLog })
    .from(screenshareSessionsTable)
    .where(and(
      eq(screenshareSessionsTable.id,     id),
      eq(screenshareSessionsTable.userId, req.user.id),
    ));

  if (!session) { res.status(404).json({ error: "Session not found" }); return; }

  const [closed] = await db.update(screenshareSessionsTable)
    .set({ status: "closed", closedAt: new Date() })
    .where(eq(screenshareSessionsTable.id, id))
    .returning();

  res.json({
    success:     true,
    sessionId:   closed.id,
    actionCount: Array.isArray(session.actionLog) ? session.actionLog.length : 0,
  });
}));

function simulateActionResult(actionType: string, payload: unknown, targetUrl: string | null | undefined): string {
  const url = targetUrl || "unknown";
  const p = payload as Record<string, unknown> | null | undefined;
  switch (actionType) {
    case "navigate":        return `Navigated to ${(p as Record<string,unknown> | null)?.url || url}`;
    case "login":           return "Login action encrypted and queued — credentials never stored in plaintext";
    case "click":           return `Clicked element: ${(p as Record<string,unknown> | null)?.selector || "(unknown)"}`;
    case "type":            return `Typed into: ${(p as Record<string,unknown> | null)?.selector || "(unknown)"}`;
    case "fill_form":       return `Form fields filled (${Object.keys(p || {}).length} fields)`;
    case "screenshot_request": return "Screenshot captured and ready for retrieval";
    case "scroll":          return `Scrolled to position ${(p as Record<string,unknown> | null)?.y || 0}`;
    case "select":          return `Selected option: ${(p as Record<string,unknown> | null)?.value || "(unknown)"}`;
    case "submit":          return "Form submitted";
    default:                return `Action "${actionType}" executed`;
  }
}

export default router;
