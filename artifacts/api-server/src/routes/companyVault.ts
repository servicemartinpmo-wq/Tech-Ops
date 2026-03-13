import { Router, type Response } from "express";
import { eq, and, desc, or, sql } from "drizzle-orm";
import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from "crypto";
import { db, companyVaultDocumentsTable, VAULT_CATEGORIES } from "@workspace/db";
import type { AuthenticatedRequest } from "../types";
import type { NextFunction, Request } from "express";
import { z } from "zod/v4";

const router = Router();

function encryptDoc(content: string, passphrase: string): {
  encryptedContent: string; iv: string; salt: string; authTag: string;
} {
  const salt = randomBytes(32).toString("hex");
  const key  = scryptSync(passphrase, salt, 32);
  const iv   = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc  = Buffer.concat([cipher.update(content, "utf8"), cipher.final()]);
  return {
    encryptedContent: enc.toString("hex"),
    iv:      iv.toString("hex"),
    salt,
    authTag: cipher.getAuthTag().toString("hex"),
  };
}

function decryptDoc(encryptedContent: string, iv: string, salt: string, authTag: string, passphrase: string): string {
  const key       = scryptSync(passphrase, salt, 32);
  const ivBuf     = Buffer.from(iv, "hex");
  const tagBuf    = Buffer.from(authTag, "hex");
  const enc       = Buffer.from(encryptedContent, "hex");
  const decipher  = createDecipheriv("aes-256-gcm", key, ivBuf);
  decipher.setAuthTag(tagBuf);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
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

const createDocSchema = z.object({
  category:       z.enum([...VAULT_CATEGORIES] as [string, ...string[]]),
  title:          z.string().min(1),
  description:    z.string().optional(),
  content:        z.string().min(1),
  passphrase:     z.string().min(8, "Passphrase must be at least 8 characters"),
  fileType:       z.string().optional(),
  tags:           z.array(z.string()).optional().default([]),
  isConfidential: z.boolean().optional().default(true),
  sharedWith:     z.array(z.string()).optional().default([]),
  expiresAt:      z.string().datetime().optional(),
  metadata:       z.record(z.string(), z.unknown()).optional().default({}),
});

router.get("/company-vault/documents", handle(async (req, res) => {
  const { category, tag, search, limit = "50", offset = "0" } = req.query as Record<string, string>;

  const rows = await db.select({
    id:             companyVaultDocumentsTable.id,
    category:       companyVaultDocumentsTable.category,
    title:          companyVaultDocumentsTable.title,
    description:    companyVaultDocumentsTable.description,
    fileType:       companyVaultDocumentsTable.fileType,
    fileSizeBytes:  companyVaultDocumentsTable.fileSizeBytes,
    tags:           companyVaultDocumentsTable.tags,
    isConfidential: companyVaultDocumentsTable.isConfidential,
    sharedWith:     companyVaultDocumentsTable.sharedWith,
    accessCount:    companyVaultDocumentsTable.accessCount,
    version:        companyVaultDocumentsTable.version,
    expiresAt:      companyVaultDocumentsTable.expiresAt,
    lastAccessedAt: companyVaultDocumentsTable.lastAccessedAt,
    metadata:       companyVaultDocumentsTable.metadata,
    createdAt:      companyVaultDocumentsTable.createdAt,
    updatedAt:      companyVaultDocumentsTable.updatedAt,
  }).from(companyVaultDocumentsTable)
    .where(and(
      or(
        eq(companyVaultDocumentsTable.userId, req.user.id),
        sql`${companyVaultDocumentsTable.sharedWith} @> ${JSON.stringify([req.user.id])}::jsonb`,
      ),
      category ? eq(companyVaultDocumentsTable.category, category) : undefined,
      tag ? sql`${companyVaultDocumentsTable.tags} @> ${JSON.stringify([tag])}::jsonb` : undefined,
      search
        ? or(
            sql`lower(${companyVaultDocumentsTable.title}) like ${"%" + search.toLowerCase() + "%"}`,
            sql`lower(${companyVaultDocumentsTable.description}) like ${"%" + search.toLowerCase() + "%"}`,
          )
        : undefined,
    ))
    .orderBy(desc(companyVaultDocumentsTable.updatedAt))
    .limit(Math.min(parseInt(limit, 10) || 50, 100))
    .offset(parseInt(offset, 10) || 0);

  res.json({
    documents: rows,
    total: rows.length,
    categories: VAULT_CATEGORIES,
  });
}));

router.get("/company-vault/documents/:id", handle(async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid document ID" }); return; }

  const [doc] = await db.select({
    id:             companyVaultDocumentsTable.id,
    category:       companyVaultDocumentsTable.category,
    title:          companyVaultDocumentsTable.title,
    description:    companyVaultDocumentsTable.description,
    fileType:       companyVaultDocumentsTable.fileType,
    fileSizeBytes:  companyVaultDocumentsTable.fileSizeBytes,
    tags:           companyVaultDocumentsTable.tags,
    isConfidential: companyVaultDocumentsTable.isConfidential,
    sharedWith:     companyVaultDocumentsTable.sharedWith,
    accessCount:    companyVaultDocumentsTable.accessCount,
    version:        companyVaultDocumentsTable.version,
    expiresAt:      companyVaultDocumentsTable.expiresAt,
    lastAccessedAt: companyVaultDocumentsTable.lastAccessedAt,
    metadata:       companyVaultDocumentsTable.metadata,
    createdAt:      companyVaultDocumentsTable.createdAt,
    updatedAt:      companyVaultDocumentsTable.updatedAt,
    userId:         companyVaultDocumentsTable.userId,
  }).from(companyVaultDocumentsTable)
    .where(and(
      eq(companyVaultDocumentsTable.id, id),
      or(
        eq(companyVaultDocumentsTable.userId, req.user.id),
        sql`${companyVaultDocumentsTable.sharedWith} @> ${JSON.stringify([req.user.id])}::jsonb`,
      ),
    ));

  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }

  if (doc.expiresAt && doc.expiresAt < new Date()) {
    res.status(410).json({ error: "This document has expired" });
    return;
  }

  res.json(doc);
}));

router.post("/company-vault/documents/:id/unlock", handle(async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid document ID" }); return; }

  const { passphrase } = req.body;
  if (!passphrase) { res.status(400).json({ error: "passphrase is required" }); return; }

  const [doc] = await db.select().from(companyVaultDocumentsTable)
    .where(and(
      eq(companyVaultDocumentsTable.id, id),
      or(
        eq(companyVaultDocumentsTable.userId, req.user.id),
        sql`${companyVaultDocumentsTable.sharedWith} @> ${JSON.stringify([req.user.id])}::jsonb`,
      ),
    ));

  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }
  if (doc.expiresAt && doc.expiresAt < new Date()) {
    res.status(410).json({ error: "This document has expired" });
    return;
  }

  let content: string;
  try {
    content = decryptDoc(doc.encryptedContent, doc.iv, doc.salt, doc.authTag, passphrase);
  } catch {
    res.status(401).json({ error: "Incorrect passphrase" });
    return;
  }

  await db.update(companyVaultDocumentsTable)
    .set({ accessCount: doc.accessCount + 1, lastAccessedAt: new Date() })
    .where(eq(companyVaultDocumentsTable.id, id));

  res.json({
    id:          doc.id,
    title:       doc.title,
    category:    doc.category,
    content,
    fileType:    doc.fileType,
    version:     doc.version,
    accessCount: doc.accessCount + 1,
  });
}));

router.post("/company-vault/documents", handle(async (req, res) => {
  const parsed = createDocSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.format() });
    return;
  }

  const { content, passphrase, ...meta } = parsed.data;

  const { encryptedContent, iv, salt, authTag } = encryptDoc(content, passphrase);

  const [doc] = await db.insert(companyVaultDocumentsTable).values({
    userId:          req.user.id,
    category:        meta.category,
    title:           meta.title,
    description:     meta.description ?? null,
    fileType:        meta.fileType ?? null,
    fileSizeBytes:   Buffer.byteLength(content, "utf8"),
    encryptedContent,
    iv,
    salt,
    authTag,
    tags:            meta.tags ?? [],
    isConfidential:  meta.isConfidential ?? true,
    sharedWith:      meta.sharedWith ?? [],
    expiresAt:       meta.expiresAt ? new Date(meta.expiresAt) : null,
    metadata:        meta.metadata ?? {},
    version:         1,
    accessCount:     0,
  }).returning({
    id:          companyVaultDocumentsTable.id,
    category:    companyVaultDocumentsTable.category,
    title:       companyVaultDocumentsTable.title,
    tags:        companyVaultDocumentsTable.tags,
    createdAt:   companyVaultDocumentsTable.createdAt,
    fileSizeBytes: companyVaultDocumentsTable.fileSizeBytes,
  });

  res.status(201).json({ ...doc, message: "Document encrypted and stored securely." });
}));

router.patch("/company-vault/documents/:id", handle(async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid document ID" }); return; }

  const [doc] = await db.select().from(companyVaultDocumentsTable)
    .where(and(
      eq(companyVaultDocumentsTable.id,     id),
      eq(companyVaultDocumentsTable.userId, req.user.id),
    ));

  if (!doc) { res.status(404).json({ error: "Document not found or insufficient permissions" }); return; }

  const { content, passphrase, title, description, category, tags, sharedWith, isConfidential, expiresAt, metadata } = req.body;

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (content !== undefined && passphrase !== undefined) {
    const enc = encryptDoc(content, passphrase);
    Object.assign(updates, enc, {
      fileSizeBytes: Buffer.byteLength(content, "utf8"),
      version: (doc.version || 1) + 1,
    });
  }

  if (title       !== undefined) updates.title       = String(title).slice(0, 200);
  if (description !== undefined) updates.description = String(description).slice(0, 1000);
  if (category    !== undefined && VAULT_CATEGORIES.includes(category)) updates.category = category;
  if (Array.isArray(tags))        updates.tags        = tags.slice(0, 20);
  if (Array.isArray(sharedWith))  updates.sharedWith  = sharedWith.slice(0, 50);
  if (isConfidential !== undefined) updates.isConfidential = Boolean(isConfidential);
  if (expiresAt !== undefined)    updates.expiresAt   = expiresAt ? new Date(expiresAt) : null;
  if (metadata  !== undefined)    updates.metadata    = metadata;

  const [updated] = await db.update(companyVaultDocumentsTable)
    .set(updates)
    .where(eq(companyVaultDocumentsTable.id, id))
    .returning({
      id:       companyVaultDocumentsTable.id,
      title:    companyVaultDocumentsTable.title,
      version:  companyVaultDocumentsTable.version,
      updatedAt: companyVaultDocumentsTable.updatedAt,
    });

  res.json(updated);
}));

router.delete("/company-vault/documents/:id", handle(async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid document ID" }); return; }

  const [doc] = await db.select({ id: companyVaultDocumentsTable.id }).from(companyVaultDocumentsTable)
    .where(and(
      eq(companyVaultDocumentsTable.id,     id),
      eq(companyVaultDocumentsTable.userId, req.user.id),
    ));

  if (!doc) { res.status(404).json({ error: "Document not found or insufficient permissions" }); return; }

  await db.delete(companyVaultDocumentsTable)
    .where(eq(companyVaultDocumentsTable.id, id));

  res.json({ success: true, deletedId: id });
}));

router.get("/company-vault/categories", handle(async (_req, res) => {
  res.json({
    categories: VAULT_CATEGORIES.map(c => ({
      id:    c,
      label: c.charAt(0).toUpperCase() + c.slice(1),
    })),
  });
}));

export default router;
