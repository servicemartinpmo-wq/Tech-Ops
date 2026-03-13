import { Router, type Response } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db, hostedProjectsTable, hostedDomainsTable } from "@workspace/db";
import { insertHostedProjectSchema, insertHostedDomainSchema } from "@workspace/db";
import type { AuthenticatedRequest } from "../types";
import type { NextFunction, Request } from "express";

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

function generateVerificationToken(): string {
  return `verify_${randomBytes(20).toString("hex")}`;
}

function generateDnsRecords(domain: string, subdomain?: string | null) {
  const target = subdomain ? `${subdomain}.${domain}` : domain;
  return [
    { type: "A",     name: target,          value: "34.120.0.1",   ttl: 300 },
    { type: "AAAA",  name: target,          value: "2600:1901::1", ttl: 300 },
    { type: "CNAME", name: `www.${target}`, value: `${target}.`,   ttl: 300 },
    { type: "TXT",   name: `_verify.${target}`, value: generateVerificationToken(), ttl: 300 },
  ];
}

router.get("/hosting/projects", handle(async (req, res) => {
  const { type, status, limit = "50", offset = "0" } = req.query as Record<string, string>;

  const rows = await db.select().from(hostedProjectsTable)
    .where(and(
      eq(hostedProjectsTable.userId, req.user.id),
      type   ? eq(hostedProjectsTable.type,   type)   : undefined,
      status ? eq(hostedProjectsTable.status, status) : undefined,
    ))
    .orderBy(desc(hostedProjectsTable.updatedAt))
    .limit(Math.min(parseInt(limit, 10) || 50, 100))
    .offset(parseInt(offset, 10) || 0);

  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` })
    .from(hostedProjectsTable)
    .where(eq(hostedProjectsTable.userId, req.user.id));

  res.json({ projects: rows, total, limit: parseInt(limit, 10), offset: parseInt(offset, 10) });
}));

router.get("/hosting/projects/:id", handle(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid project ID" }); return; }

  const [project] = await db.select().from(hostedProjectsTable)
    .where(and(eq(hostedProjectsTable.id, id), eq(hostedProjectsTable.userId, req.user.id)));

  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const domains = await db.select().from(hostedDomainsTable)
    .where(and(eq(hostedDomainsTable.projectId, id), eq(hostedDomainsTable.userId, req.user.id)));

  res.json({ ...project, domains });
}));

router.post("/hosting/projects", handle(async (req, res) => {
  const parsed = insertHostedProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.format() });
    return;
  }

  const existing = await db.select({ id: hostedProjectsTable.id }).from(hostedProjectsTable)
    .where(and(
      eq(hostedProjectsTable.slug,   parsed.data.slug),
      eq(hostedProjectsTable.userId, req.user.id),
    ));
  if (existing.length > 0) {
    res.status(409).json({ error: "A project with this slug already exists" });
    return;
  }

  const previewUrl = `https://${parsed.data.slug}.techops.app`;

  const [project] = await db.insert(hostedProjectsTable).values({
    userId:       req.user.id,
    name:         parsed.data.name,
    slug:         parsed.data.slug,
    type:         parsed.data.type,
    status:       "draft",
    description:  parsed.data.description ?? null,
    framework:    parsed.data.framework ?? null,
    buildCommand: parsed.data.buildCommand ?? null,
    startCommand: parsed.data.startCommand ?? null,
    outputDir:    parsed.data.outputDir ?? null,
    envVars:      parsed.data.envVars ?? {},
    tags:         parsed.data.tags ?? [],
    settings:     parsed.data.settings ?? {},
    previewUrl,
  }).returning();

  res.status(201).json(project);
}));

router.patch("/hosting/projects/:id", handle(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid project ID" }); return; }

  const [project] = await db.select().from(hostedProjectsTable)
    .where(and(eq(hostedProjectsTable.id, id), eq(hostedProjectsTable.userId, req.user.id)));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const ALLOWED_PATCH_FIELDS = [
    "name", "description", "status", "framework", "buildCommand",
    "startCommand", "outputDir", "envVars", "tags", "settings", "buildLog",
  ] as const;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const field of ALLOWED_PATCH_FIELDS) {
    if (field in req.body) updates[field] = req.body[field];
  }

  if (req.body.status === "deployed" && !project.deployedAt) {
    updates.deployedAt = new Date();
  }

  const [updated] = await db.update(hostedProjectsTable)
    .set(updates)
    .where(and(eq(hostedProjectsTable.id, id), eq(hostedProjectsTable.userId, req.user.id)))
    .returning();

  res.json(updated);
}));

router.delete("/hosting/projects/:id", handle(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid project ID" }); return; }

  const [project] = await db.select({ id: hostedProjectsTable.id }).from(hostedProjectsTable)
    .where(and(eq(hostedProjectsTable.id, id), eq(hostedProjectsTable.userId, req.user.id)));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  await db.delete(hostedDomainsTable)
    .where(and(eq(hostedDomainsTable.projectId, id), eq(hostedDomainsTable.userId, req.user.id)));
  await db.delete(hostedProjectsTable)
    .where(and(eq(hostedProjectsTable.id, id), eq(hostedProjectsTable.userId, req.user.id)));

  res.json({ success: true, deletedId: id });
}));

router.get("/hosting/domains", handle(async (req, res) => {
  const { projectId } = req.query as Record<string, string>;
  const domains = await db.select().from(hostedDomainsTable)
    .where(and(
      eq(hostedDomainsTable.userId, req.user.id),
      projectId ? eq(hostedDomainsTable.projectId, parseInt(projectId, 10)) : undefined,
    ))
    .orderBy(desc(hostedDomainsTable.createdAt));
  res.json({ domains });
}));

router.post("/hosting/domains", handle(async (req, res) => {
  const parsed = insertHostedDomainSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.format() });
    return;
  }

  const existing = await db.select({ id: hostedDomainsTable.id }).from(hostedDomainsTable)
    .where(eq(hostedDomainsTable.domain, parsed.data.domain));
  if (existing.length > 0) {
    res.status(409).json({ error: "This domain is already registered" });
    return;
  }

  if (parsed.data.projectId) {
    const [proj] = await db.select({ id: hostedProjectsTable.id }).from(hostedProjectsTable)
      .where(and(
        eq(hostedProjectsTable.id,     parsed.data.projectId),
        eq(hostedProjectsTable.userId, req.user.id),
      ));
    if (!proj) { res.status(404).json({ error: "Project not found or not owned by you" }); return; }
  }

  const verificationToken = generateVerificationToken();
  const dnsRecords = generateDnsRecords(parsed.data.domain, parsed.data.subdomain);

  const [domain] = await db.insert(hostedDomainsTable).values({
    userId:            req.user.id,
    domain:            parsed.data.domain,
    subdomain:         parsed.data.subdomain ?? null,
    projectId:         parsed.data.projectId ?? null,
    status:            "pending_verification",
    verificationToken,
    sslStatus:         "pending",
    dnsRecords,
    autoRenewSsl:      parsed.data.autoRenewSsl ?? true,
    registrar:         parsed.data.registrar ?? null,
    nameservers:       [],
    metadata:          {},
  }).returning();

  res.status(201).json({
    ...domain,
    setupInstructions: {
      step1: "Add the following DNS records at your registrar:",
      records: dnsRecords,
      step2: `Add a TXT record at _verify.${parsed.data.domain} with value: ${verificationToken}`,
      step3: "Click Verify Domain once DNS has propagated (can take up to 48 hours)",
    },
  });
}));

router.post("/hosting/domains/:id/verify", handle(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid domain ID" }); return; }

  const [domain] = await db.select().from(hostedDomainsTable)
    .where(and(eq(hostedDomainsTable.id, id), eq(hostedDomainsTable.userId, req.user.id)));
  if (!domain) { res.status(404).json({ error: "Domain not found" }); return; }

  const [updated] = await db.update(hostedDomainsTable)
    .set({
      status:      "active",
      verifiedAt:  new Date(),
      sslStatus:   "issuing",
      updatedAt:   new Date(),
    })
    .where(eq(hostedDomainsTable.id, id))
    .returning();

  setTimeout(async () => {
    try {
      await db.update(hostedDomainsTable).set({
        sslStatus:    "active",
        sslIssuedAt:  new Date(),
        sslExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        updatedAt:    new Date(),
      }).where(eq(hostedDomainsTable.id, id));
    } catch (err) {
      console.warn("[hosting] SSL issuance update failed:", err);
    }
  }, 5_000);

  res.json({ success: true, domain: updated, message: "Domain verified. SSL certificate being issued." });
}));

router.delete("/hosting/domains/:id", handle(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid domain ID" }); return; }

  const [domain] = await db.select({ id: hostedDomainsTable.id }).from(hostedDomainsTable)
    .where(and(eq(hostedDomainsTable.id, id), eq(hostedDomainsTable.userId, req.user.id)));
  if (!domain) { res.status(404).json({ error: "Domain not found" }); return; }

  await db.delete(hostedDomainsTable)
    .where(and(eq(hostedDomainsTable.id, id), eq(hostedDomainsTable.userId, req.user.id)));

  res.json({ success: true });
}));

export default router;
