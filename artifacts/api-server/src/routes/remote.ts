import { Router, type IRouter, type Response } from "express";
import { eq, desc, and } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db, remoteSessionsTable } from "@workspace/db";
import { requireRole } from "../middleware/tierGating";
import type { AuthenticatedRequest } from "../types";

const router: IRouter = Router();

const ALLOWED_READ_COMMANDS = new Set([
  "ls", "pwd", "whoami", "df", "du", "ps", "top", "uptime", "hostname",
  "cat", "head", "tail", "grep", "find", "which", "env", "printenv",
  "systemctl status", "service status", "ping", "nslookup", "dig",
  "curl -I", "curl --head", "netstat", "ss", "lsof", "uname",
]);

const BLOCKED_PATTERNS = [
  /rm\s+-rf/i, />\s*\//, /\|\s*sh/i, /\|\s*bash/i, /eval\s*\(/i,
  /exec\s*\(/i, /system\s*\(/i, /\bdd\b/, /mkfs/i, /fdisk/i,
  /chmod\s+777/i, /sudo\s+su/i, /passwd/i, /shadow/i,
  /\/etc\/hosts/, /crontab\s+-r/i, /kill\s+-9\s+1$/,
];

function isCommandSafe(command: string, scope: string): { safe: boolean; reason?: string } {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(command)) {
      return { safe: false, reason: `Blocked pattern detected: ${pattern.toString()}` };
    }
  }

  if (scope === "read") {
    const firstWord = command.trim().split(/\s+/).slice(0, 2).join(" ");
    const allowed = [...ALLOWED_READ_COMMANDS].some(cmd => command.trim().startsWith(cmd));
    if (!allowed) {
      return { safe: false, reason: `Command "${firstWord}" not permitted in read-only scope. Request a write-scope session for mutating operations.` };
    }
  }

  return { safe: true };
}

function simulateCommandExecution(command: string, targetSystem?: string): { output: string; exitCode: number } {
  const cmd = command.trim().toLowerCase();

  if (cmd.startsWith("ls")) {
    return { output: `bin  etc  home  lib  opt  tmp  usr  var\nDiagnostic environment: ${targetSystem || "local"}`, exitCode: 0 };
  }
  if (cmd.startsWith("ps")) {
    return { output: `PID  TTY    TIME CMD\n1    ?      0:00 systemd\n100  ?      0:00 apphia-agent\n200  ?      0:02 node`, exitCode: 0 };
  }
  if (cmd.startsWith("df")) {
    return { output: `Filesystem     1K-blocks   Used  Available Use% Mounted on\n/dev/sda1      20971520 8388608   12582912  40% /`, exitCode: 0 };
  }
  if (cmd.startsWith("uptime")) {
    return { output: `up 14 days, 3:22,  2 users,  load average: 0.12, 0.08, 0.05`, exitCode: 0 };
  }
  if (cmd.startsWith("hostname")) {
    return { output: targetSystem || "techops-diagnostic-node", exitCode: 0 };
  }
  if (cmd.startsWith("ping")) {
    const target = command.split(/\s+/)[1] || "8.8.8.8";
    return { output: `PING ${target}: 56 data bytes\n64 bytes from ${target}: icmp_seq=0 ttl=56 time=12.3 ms\n64 bytes from ${target}: icmp_seq=1 ttl=56 time=11.8 ms\n--- ${target} ping statistics ---\n2 packets transmitted, 2 received, 0% packet loss`, exitCode: 0 };
  }
  if (cmd.startsWith("curl -i") || cmd.startsWith("curl --head")) {
    const target = command.split(/\s+/).pop() || "localhost";
    return { output: `HTTP/2 200\ncontent-type: application/json\ncache-control: no-cache\nserver: techops-apphia\ndate: ${new Date().toUTCString()}`, exitCode: 0 };
  }
  if (cmd.startsWith("systemctl status") || cmd.startsWith("service")) {
    const svc = command.split(/\s+/).pop() || "unknown";
    return { output: `● ${svc}.service - ${svc} Service\n   Loaded: loaded (/lib/systemd/system/${svc}.service; enabled)\n   Active: active (running) since ${new Date().toUTCString()}; 14 days ago\n Main PID: 1234`, exitCode: 0 };
  }
  if (cmd.startsWith("env") || cmd.startsWith("printenv")) {
    return { output: `NODE_ENV=production\nPORT=8080\nAPPHIA_VERSION=2.0.0\nTECHOPS_TIER=professional\n[Sensitive variables redacted by Apphia guardrails]`, exitCode: 0 };
  }
  if (cmd.startsWith("netstat") || cmd.startsWith("ss")) {
    return { output: `Proto Recv-Q Send-Q Local Address      Foreign Address    State\ntcp        0      0 0.0.0.0:8080       0.0.0.0:*          LISTEN\ntcp        0      0 0.0.0.0:5432       0.0.0.0:*          LISTEN`, exitCode: 0 };
  }

  return { output: `[Apphia Remote] Command acknowledged: ${command}\n[Sandbox] Execution simulated in read-only diagnostic mode`, exitCode: 0 };
}

router.post("/remote/session", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { caseId, scope, targetSystem, permissions, durationMinutes } = req.body;

  const validScopes = ["read", "write", "admin"];
  const sessionScope = validScopes.includes(scope) ? scope : "read";

  if (sessionScope !== "read") {
    const userRole = (req as unknown as AuthenticatedRequest & { user: { role?: string } }).user.role;
    if (userRole !== "owner" && userRole !== "admin") {
      res.status(403).json({ error: "Write and admin remote sessions require owner or admin role." });
      return;
    }
  }

  const token = randomBytes(32).toString("hex");
  const duration = Math.min(parseInt(durationMinutes || "60", 10) || 60, 240);
  const expiresAt = new Date(Date.now() + duration * 60 * 1000);

  const [session] = await db.insert(remoteSessionsTable).values({
    sessionToken: token,
    userId: authReq.user.id,
    caseId: caseId ? parseInt(caseId, 10) : null,
    scope: sessionScope,
    targetSystem: targetSystem || null,
    permissions: permissions || ["read:logs", "read:metrics", "read:config"],
    status: "active",
    commandLog: [],
    expiresAt,
  }).returning();

  res.status(201).json({
    sessionId: session.id,
    sessionToken: token,
    scope: sessionScope,
    targetSystem,
    expiresAt,
    permissions: session.permissions,
    warningMessage: sessionScope === "read"
      ? "Read-only session. Mutating commands will be blocked."
      : "Write session active. All commands are logged for audit.",
  });
});

router.post("/remote/session/:id/execute", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const sessionId = parseInt(req.params.id, 10);
  const { command, sessionToken } = req.body;

  if (!command || !sessionToken) { res.status(400).json({ error: "command and sessionToken are required" }); return; }
  if (!command.trim()) { res.status(400).json({ error: "Command cannot be empty" }); return; }

  const [session] = await db.select().from(remoteSessionsTable)
    .where(and(eq(remoteSessionsTable.id, sessionId), eq(remoteSessionsTable.userId, authReq.user.id)));

  if (!session) { res.status(404).json({ error: "Session not found" }); return; }
  if (session.sessionToken !== sessionToken) { res.status(403).json({ error: "Invalid session token" }); return; }
  if (session.status !== "active") { res.status(410).json({ error: `Session is ${session.status}. Please create a new session.` }); return; }
  if (new Date() > session.expiresAt) {
    await db.update(remoteSessionsTable).set({ status: "expired" }).where(eq(remoteSessionsTable.id, sessionId));
    res.status(410).json({ error: "Session has expired. Please create a new session." }); return;
  }

  const { safe, reason } = isCommandSafe(command, session.scope || "read");

  const logEntry = {
    ts: new Date().toISOString(),
    command,
    output: safe ? "" : `[BLOCKED] ${reason}`,
    approved: safe,
    exitCode: safe ? 0 : 126,
  };

  if (!safe) {
    const updatedLog = [...(session.commandLog || []), logEntry];
    await db.update(remoteSessionsTable).set({ commandLog: updatedLog }).where(eq(remoteSessionsTable.id, sessionId));
    res.status(403).json({ error: "Command blocked", reason, command, approved: false });
    return;
  }

  const { output, exitCode } = simulateCommandExecution(command, session.targetSystem || undefined);
  logEntry.output = output;
  logEntry.exitCode = exitCode;
  logEntry.approved = true;

  const updatedLog = [...(session.commandLog || []), logEntry];
  await db.update(remoteSessionsTable).set({ commandLog: updatedLog }).where(eq(remoteSessionsTable.id, sessionId));

  res.json({ output, exitCode, command, approved: true, executedAt: logEntry.ts, sessionScope: session.scope });
});

router.get("/remote/session/:id/log", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const sessionId = parseInt(req.params.id, 10);
  const [session] = await db.select().from(remoteSessionsTable)
    .where(and(eq(remoteSessionsTable.id, sessionId), eq(remoteSessionsTable.userId, authReq.user.id)));

  if (!session) { res.status(404).json({ error: "Session not found" }); return; }

  res.json({
    sessionId: session.id,
    scope: session.scope,
    targetSystem: session.targetSystem,
    status: session.status,
    commandLog: session.commandLog || [],
    commandCount: (session.commandLog || []).length,
    blockedCount: (session.commandLog || []).filter((e: { approved: boolean }) => !e.approved).length,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    closedAt: session.closedAt,
  });
});

router.post("/remote/session/:id/close", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const sessionId = parseInt(req.params.id, 10);
  const [session] = await db.select().from(remoteSessionsTable)
    .where(and(eq(remoteSessionsTable.id, sessionId), eq(remoteSessionsTable.userId, authReq.user.id)));

  if (!session) { res.status(404).json({ error: "Session not found" }); return; }

  const [closed] = await db.update(remoteSessionsTable)
    .set({ status: "closed", closedAt: new Date() })
    .where(eq(remoteSessionsTable.id, sessionId)).returning();

  res.json({ success: true, sessionId: closed.id, commandCount: (closed.commandLog || []).length });
});

router.get("/remote/sessions", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const sessions = await db.select({
    id: remoteSessionsTable.id,
    scope: remoteSessionsTable.scope,
    targetSystem: remoteSessionsTable.targetSystem,
    status: remoteSessionsTable.status,
    caseId: remoteSessionsTable.caseId,
    createdAt: remoteSessionsTable.createdAt,
    expiresAt: remoteSessionsTable.expiresAt,
    closedAt: remoteSessionsTable.closedAt,
  }).from(remoteSessionsTable)
    .where(eq(remoteSessionsTable.userId, authReq.user.id))
    .orderBy(desc(remoteSessionsTable.createdAt))
    .limit(50);

  res.json({ sessions });
});

export default router;
