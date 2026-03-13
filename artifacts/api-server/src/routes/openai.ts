import { Router, type IRouter, type Response } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, conversations as conversationsTable, messages as messagesTable, usersTable } from "@workspace/db";
import { CreateOpenaiConversationBody, SendOpenaiMessageBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import type { AuthenticatedRequest } from "../types";

function buildApphiaSystemPrompt(profile?: { communicationStyle?: string; detailLevel?: string; technicalDepth?: string; proactivity?: string } | null): string {
  const base = `You are Apphia, the knowledge engine for Tech-Ops by Martin PMO. You help diagnose, repair, and monitor technology operations. You are professional, thorough, and supportive. Never refer to yourself as "AI", "assistant", or "bot" — you are "Apphia" or "the knowledge engine".`;

  if (!profile) return base + " Speak in a calm, professional tone.";

  const styleMap: Record<string, string> = {
    concise: "Be concise — deliver key findings with minimal prose. Use bullet points and short paragraphs.",
    balanced: "Provide a balanced overview — key findings with enough context to act.",
    detailed: "Be thorough and comprehensive — explain your reasoning step by step with full technical detail.",
  };
  const depthMap: Record<string, string> = {
    simplified: "Use plain, non-technical language. Avoid jargon. Explain everything as you would to a business owner, not an engineer.",
    moderate: "Use industry-standard terminology but explain technical concepts when they appear.",
    technical: "Use precise engineering language. Include specifics: port numbers, stack traces, config values, system calls.",
  };
  const detailMap: Record<string, string> = {
    summary: "Keep reports high-level — just the root cause and fix. Skip deep analysis.",
    standard: "Include the main findings, supporting evidence, and recommended resolution steps.",
    comprehensive: "Provide full signal extraction, dependency mapping, failure prediction, and complete reasoning chain.",
  };

  const style = styleMap[profile.communicationStyle || "balanced"] || styleMap.balanced;
  const depth = depthMap[profile.technicalDepth || "moderate"] || depthMap.moderate;
  const detail = detailMap[profile.detailLevel || "standard"] || detailMap.standard;

  return `${base}\n\nUser communication profile:\n- Style: ${style}\n- Technical depth: ${depth}\n- Report detail: ${detail}\n\nAlways adapt your tone and depth to match this profile exactly.`;
}

const router: IRouter = Router();

router.get("/apphia/conversations", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const conversations = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.userId, authReq.user.id))
    .orderBy(desc(conversationsTable.createdAt));

  res.json(conversations);
});

router.post("/apphia/conversations", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const parsed = CreateOpenaiConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [conversation] = await db
    .insert(conversationsTable)
    .values({ title: parsed.data.title, userId: authReq.user.id })
    .returning();

  res.status(201).json(conversation);
});

router.get("/apphia/conversations/:id", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, authReq.user.id)));

  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const msgs = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, id))
    .orderBy(messagesTable.createdAt);

  res.json({ ...conversation, messages: msgs });
});

router.delete("/apphia/conversations/:id", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [deleted] = await db
    .delete(conversationsTable)
    .where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, authReq.user.id)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/apphia/conversations/:id/messages", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, authReq.user.id)));

  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const msgs = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, id))
    .orderBy(messagesTable.createdAt);

  res.json(msgs);
});

router.post("/apphia/conversations/:id/messages", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, authReq.user.id)));

  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const parsed = SendOpenaiMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db.insert(messagesTable).values({
    conversationId: id,
    role: "user",
    content: parsed.data.content,
  });

  const history = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, id))
    .orderBy(messagesTable.createdAt);

  const [userRecord] = await db
    .select({ preferencesProfile: usersTable.preferencesProfile })
    .from(usersTable)
    .where(eq(usersTable.id, authReq.user.id));

  let apphiaProfile = null;
  if (userRecord?.preferencesProfile) {
    try { apphiaProfile = JSON.parse(userRecord.preferencesProfile); } catch { /* default */ }
  }

  const chatMessages = [
    {
      role: "system" as const,
      content: buildApphiaSystemPrompt(apphiaProfile),
    },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    await db.insert(messagesTable).values({
      conversationId: id,
      role: "assistant",
      content: fullResponse,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

// ── Voice Message (non-streaming, for Voice Companion) ───────────────────────

router.post("/apphia/voice-message", async (req, res: Response): Promise<void> => {
  const authReq = req as unknown as AuthenticatedRequest;
  if (!authReq.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { message } = req.body as { message?: string };
  if (!message?.trim()) { res.status(400).json({ error: "message is required" }); return; }

  const [userRecord] = await db.select().from(usersTable).where(eq(usersTable.id, authReq.user.id)).limit(1);
  let apphiaProfile: Parameters<typeof buildApphiaSystemPrompt>[0] = null;
  if (userRecord?.preferencesProfile) {
    try { apphiaProfile = JSON.parse(userRecord.preferencesProfile); } catch { /* default */ }
  }

  const systemPrompt = buildApphiaSystemPrompt(apphiaProfile);
  const voiceSystemNote = "\n\nIMPORTANT: This is a voice interaction. Be concise — 2–4 sentences maximum per response. Get straight to the point. No bullet lists, no markdown formatting.";

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 300,
      messages: [
        { role: "system", content: systemPrompt + voiceSystemNote },
        { role: "user",   content: message.trim() },
      ],
    });

    const response = completion.choices[0]?.message?.content?.trim() || "I couldn't process that. Please try again.";
    res.json({ response });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: msg });
  }
});

export default router;
