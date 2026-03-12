import { Router, type Response } from "express";
import { db } from "@workspace/db";
import { secureVaultTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import type { AuthenticatedRequest } from "../types";
import crypto from "node:crypto";

const router = Router();

function encryptContent(content: string, password: string) {
  const salt = crypto.randomBytes(32).toString("hex");
  const key = crypto.scryptSync(password, salt, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(content, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([authTag, encrypted]);
  return {
    encrypted: combined.toString("hex"),
    iv: iv.toString("hex"),
    salt,
  };
}

function decryptContent(encryptedHex: string, ivHex: string, salt: string, password: string): string {
  const key = crypto.scryptSync(password, salt, 32);
  const iv = Buffer.from(ivHex, "hex");
  const combined = Buffer.from(encryptedHex, "hex");
  const authTag = combined.subarray(0, 16);
  const encrypted = combined.subarray(16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

function generateAccessToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

router.get("/vault/items", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const items = await db
      .select({
        id: secureVaultTable.id,
        type: secureVaultTable.type,
        title: secureVaultTable.title,
        description: secureVaultTable.description,
        accessToken: secureVaultTable.accessToken,
        passwordProtected: secureVaultTable.passwordProtected,
        accessCount: secureVaultTable.accessCount,
        maxAccess: secureVaultTable.maxAccess,
        expiresAt: secureVaultTable.expiresAt,
        metadata: secureVaultTable.metadata,
        createdAt: secureVaultTable.createdAt,
      })
      .from(secureVaultTable)
      .where(eq(secureVaultTable.userId, authReq.user.id))
      .orderBy(desc(secureVaultTable.createdAt));
    res.json(items);
  } catch (err) {
    console.error("vault list error:", err);
    res.status(500).json({ error: "Failed to list vault items" });
  }
});

router.post("/vault/items", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const { type, title, description, content, password, maxAccess, expiresAt, metadata } = req.body;

  if (!type || !title || !content || !password) {
    res.status(400).json({ error: "type, title, content, and password are required" });
    return;
  }

  try {
    const { encrypted, iv, salt } = encryptContent(JSON.stringify(content), password);
    const accessToken = generateAccessToken();

    const [item] = await db.insert(secureVaultTable).values({
      userId: authReq.user.id,
      type,
      title,
      description: description ?? null,
      encryptedContent: encrypted,
      iv,
      salt,
      accessToken,
      passwordProtected: true,
      accessCount: 0,
      maxAccess: maxAccess ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      metadata: metadata ?? null,
    }).returning();

    res.status(201).json({
      id: item.id,
      accessToken: item.accessToken,
      title: item.title,
      type: item.type,
      createdAt: item.createdAt,
    });
  } catch (err) {
    console.error("vault create error:", err);
    res.status(500).json({ error: "Failed to create vault item" });
  }
});

router.post("/vault/items/:id/unlock", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const id = parseInt(req.params.id);
  const { password } = req.body;

  if (!password) {
    res.status(400).json({ error: "Password is required" });
    return;
  }

  try {
    const [item] = await db
      .select()
      .from(secureVaultTable)
      .where(and(eq(secureVaultTable.id, id), eq(secureVaultTable.userId, authReq.user.id)));

    if (!item) {
      res.status(404).json({ error: "Vault item not found" });
      return;
    }

    if (item.expiresAt && item.expiresAt < new Date()) {
      res.status(410).json({ error: "This vault item has expired" });
      return;
    }

    if (item.maxAccess !== null && item.accessCount >= item.maxAccess) {
      res.status(410).json({ error: "Maximum access count reached" });
      return;
    }

    let content: unknown;
    try {
      const decrypted = decryptContent(item.encryptedContent, item.iv, item.salt, password);
      content = JSON.parse(decrypted);
    } catch {
      res.status(401).json({ error: "Incorrect password" });
      return;
    }

    await db
      .update(secureVaultTable)
      .set({ accessCount: item.accessCount + 1 })
      .where(eq(secureVaultTable.id, id));

    res.json({ content, accessCount: item.accessCount + 1 });
  } catch (err) {
    console.error("vault unlock error:", err);
    res.status(500).json({ error: "Failed to unlock vault item" });
  }
});

router.delete("/vault/items/:id", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const id = parseInt(req.params.id);
  try {
    await db
      .delete(secureVaultTable)
      .where(and(eq(secureVaultTable.id, id), eq(secureVaultTable.userId, authReq.user.id)));
    res.json({ success: true });
  } catch (err) {
    console.error("vault delete error:", err);
    res.status(500).json({ error: "Failed to delete vault item" });
  }
});

export default router;
