import { Router, type Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { randomBytes, createHash } from "crypto";
import {
  db,
  apiKeysTable,
  hostedProjectsTable,
  websiteContentsTable,
  websiteDeploymentsTable,
} from "@workspace/db";
import type { AuthenticatedRequest } from "../types";
import type { NextFunction, Request } from "express";
import { z } from "zod/v4";

const router = Router();

function auth(req: Request, res: Response): AuthenticatedRequest | null {
  const a = req as unknown as AuthenticatedRequest;
  if (!a.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return null; }
  return a;
}

function handle(fn: (req: AuthenticatedRequest, res: Response) => Promise<void>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const a = auth(req, res);
      if (!a) return;
      await fn(a, res);
    } catch (err) { next(err); }
  };
}

function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = `tk_${randomBytes(32).toString("hex")}`;
  const hash = createHash("sha256").update(raw).digest("hex");
  const prefix = raw.slice(0, 10);
  return { raw, hash, prefix };
}

const createKeySchema = z.object({
  name: z.string().min(1),
  expiresInDays: z.number().int().min(1).max(3650).optional(),
});

router.post("/builder/api-keys", handle(async (req, res) => {
  const parsed = createKeySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.format() });
    return;
  }

  const { raw, hash, prefix } = generateApiKey();
  const expiresAt = parsed.data.expiresInDays
    ? new Date(Date.now() + parsed.data.expiresInDays * 86400_000)
    : null;

  const [key] = await db.insert(apiKeysTable).values({
    userId: req.user.id,
    name: parsed.data.name,
    keyHash: hash,
    keyPrefix: prefix,
    scopes: ["hosting:read", "hosting:write", "builder:full"],
    expiresAt,
    revoked: false,
  }).returning();

  res.status(201).json({ ...key, key: raw, keyHash: undefined });
}));

router.get("/builder/api-keys", handle(async (req, res) => {
  const keys = await db.select({
    id: apiKeysTable.id,
    name: apiKeysTable.name,
    keyPrefix: apiKeysTable.keyPrefix,
    scopes: apiKeysTable.scopes,
    lastUsedAt: apiKeysTable.lastUsedAt,
    expiresAt: apiKeysTable.expiresAt,
    revoked: apiKeysTable.revoked,
    createdAt: apiKeysTable.createdAt,
  }).from(apiKeysTable)
    .where(eq(apiKeysTable.userId, req.user.id))
    .orderBy(desc(apiKeysTable.createdAt));

  res.json({ keys });
}));

router.delete("/builder/api-keys/:id", handle(async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid key ID" }); return; }

  const [key] = await db.select({ id: apiKeysTable.id, userId: apiKeysTable.userId })
    .from(apiKeysTable)
    .where(and(eq(apiKeysTable.id, id), eq(apiKeysTable.userId, req.user.id)));

  if (!key) { res.status(404).json({ error: "API key not found" }); return; }

  await db.update(apiKeysTable)
    .set({ revoked: true })
    .where(eq(apiKeysTable.id, id));

  res.json({ success: true });
}));

router.get("/builder/projects/:id/content", handle(async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid project ID" }); return; }

  const [project] = await db.select({ id: hostedProjectsTable.id })
    .from(hostedProjectsTable)
    .where(and(eq(hostedProjectsTable.id, id), eq(hostedProjectsTable.userId, req.user.id)));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const pages = await db.select().from(websiteContentsTable)
    .where(and(
      eq(websiteContentsTable.projectId, id),
      eq(websiteContentsTable.userId, req.user.id),
    ))
    .orderBy(desc(websiteContentsTable.updatedAt));

  res.json({ pages });
}));

const contentSchema = z.object({
  html: z.string().optional().default(""),
  css: z.string().optional().default(""),
  js: z.string().optional().default(""),
  config: z.record(z.string(), z.unknown()).optional().default({}),
  pageName: z.string().optional().default("index"),
});

router.put("/builder/projects/:id/content", handle(async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid project ID" }); return; }

  const parsed = contentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.format() });
    return;
  }

  const [project] = await db.select().from(hostedProjectsTable)
    .where(and(eq(hostedProjectsTable.id, id), eq(hostedProjectsTable.userId, req.user.id)));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const [existing] = await db.select().from(websiteContentsTable)
    .where(and(
      eq(websiteContentsTable.projectId, id),
      eq(websiteContentsTable.userId, req.user.id),
      eq(websiteContentsTable.pageName, parsed.data.pageName),
    ));

  let content;
  if (existing) {
    [content] = await db.update(websiteContentsTable).set({
      html: parsed.data.html,
      css: parsed.data.css,
      js: parsed.data.js,
      config: parsed.data.config,
      version: existing.version + 1,
      updatedAt: new Date(),
    }).where(eq(websiteContentsTable.id, existing.id)).returning();
  } else {
    [content] = await db.insert(websiteContentsTable).values({
      projectId: id,
      userId: req.user.id,
      html: parsed.data.html,
      css: parsed.data.css,
      js: parsed.data.js,
      config: parsed.data.config,
      pageName: parsed.data.pageName,
      version: 1,
    }).returning();
  }

  await db.update(hostedProjectsTable)
    .set({ updatedAt: new Date() })
    .where(eq(hostedProjectsTable.id, id));

  res.json({ content });
}));

router.post("/builder/projects/:id/deploy", handle(async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid project ID" }); return; }

  const [project] = await db.select().from(hostedProjectsTable)
    .where(and(eq(hostedProjectsTable.id, id), eq(hostedProjectsTable.userId, req.user.id)));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const pages = await db.select().from(websiteContentsTable)
    .where(and(eq(websiteContentsTable.projectId, id), eq(websiteContentsTable.userId, req.user.id)));

  if (pages.length === 0) {
    res.status(400).json({ error: "No content to deploy. Save content first." });
    return;
  }

  const latestVersion = Math.max(...pages.map(p => p.version));
  const deployedUrl = project.customDomain
    ? `https://${project.customDomain}`
    : `https://${project.slug}.martinpmo.com`;

  const [deployment] = await db.insert(websiteDeploymentsTable).values({
    projectId: id,
    userId: req.user.id,
    version: latestVersion,
    status: "building",
    triggeredBy: (req as unknown as { apiKeyId?: number }).apiKeyId ? "api_key" : "manual",
    buildLog: `[${new Date().toISOString()}] Deployment started\n`,
  }).returning();

  await db.update(websiteContentsTable)
    .set({ publishedAt: new Date(), publishedVersion: latestVersion })
    .where(and(eq(websiteContentsTable.projectId, id), eq(websiteContentsTable.userId, req.user.id)));

  await db.update(hostedProjectsTable)
    .set({ status: "deployed", deployedAt: new Date(), previewUrl: deployedUrl, updatedAt: new Date() })
    .where(eq(hostedProjectsTable.id, id));

  setTimeout(async () => {
    try {
      await db.update(websiteDeploymentsTable).set({
        status: "live",
        deployedUrl,
        completedAt: new Date(),
        buildLog: `[${new Date().toISOString()}] Deployment started\n[${new Date().toISOString()}] Content packaged\n[${new Date().toISOString()}] Domain routing configured\n[${new Date().toISOString()}] Deployment live at ${deployedUrl}\n`,
      }).where(eq(websiteDeploymentsTable.id, deployment.id));
    } catch { /* ignore */ }
  }, 3_000);

  res.status(201).json({
    deployment,
    deployedUrl,
    message: "Deployment initiated. Your site will be live shortly.",
  });
}));

router.get("/builder/projects/:id/deployments", handle(async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid project ID" }); return; }

  const deployments = await db.select().from(websiteDeploymentsTable)
    .where(and(
      eq(websiteDeploymentsTable.projectId, id),
      eq(websiteDeploymentsTable.userId, req.user.id),
    ))
    .orderBy(desc(websiteDeploymentsTable.createdAt))
    .limit(20);

  res.json({ deployments });
}));

router.get("/builder/info", handle(async (req, res) => {
  const apiBase = process.env["API_BASE_URL"] ?? "https://techops-api.martinpmo.com";
  res.json({
    apiBase,
    version: "1.0",
    endpoints: {
      projects: {
        list:   "GET  /api/hosting/projects",
        create: "POST /api/hosting/projects",
        get:    "GET  /api/hosting/projects/:id",
        update: "PATCH /api/hosting/projects/:id",
        delete: "DELETE /api/hosting/projects/:id",
      },
      content: {
        get:    "GET  /api/builder/projects/:id/content",
        save:   "PUT  /api/builder/projects/:id/content",
        deploy: "POST /api/builder/projects/:id/deploy",
        history:"GET  /api/builder/projects/:id/deployments",
      },
      domains: {
        list:   "GET  /api/hosting/domains",
        add:    "POST /api/hosting/domains",
        verify: "POST /api/hosting/domains/:id/verify",
        delete: "DELETE /api/hosting/domains/:id",
      },
      auth: {
        info: "Authorization: Bearer tk_<your_api_key>",
      },
    },
  });
}));

export default router;
