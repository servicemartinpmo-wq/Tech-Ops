import { Router, type IRouter, type Request, type Response } from "express";
import bcryptjs from "bcryptjs";
import { db, usersTable, casesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createSession, setSessionCookie } from "../lib/auth";

const router: IRouter = Router();

const DEMO_EMAIL = "demo@techops-demo.internal";

router.post("/api/demo/session", async (req: Request, res: Response) => {
  try {
    let [demoUser] = await db.select().from(usersTable).where(eq(usersTable.email, DEMO_EMAIL)).limit(1);

    if (!demoUser) {
      const passwordHash = await bcryptjs.hash("demo-readonly-" + Date.now(), 10);
      [demoUser] = await db.insert(usersTable).values({
        email: DEMO_EMAIL,
        firstName: "Demo",
        lastName: "User",
        authProvider: "email",
        passwordHash,
        role: "viewer",
        subscriptionTier: "professional",
      }).returning();

      const demoCases: (typeof casesTable.$inferInsert)[] = [
        {
          userId: demoUser.id,
          title: "Network latency spike — US-East region",
          description: "Users reporting 3-4x higher latency on dashboard loads. Began at 14:30 UTC. Packet loss ~2%.",
          status: "open",
          priority: "critical",
        },
        {
          userId: demoUser.id,
          title: "SSL certificate expiry warning",
          description: "api.internal.example.com certificate expires in 12 days. Auto-renewal failed due to DNS propagation issue.",
          status: "open",
          priority: "high",
        },
        {
          userId: demoUser.id,
          title: "Memory leak in microservice pod",
          description: "order-processor pod consuming 94% of allocated memory. Requires rolling restart.",
          status: "resolved",
          priority: "high",
        },
      ];
      await db.insert(casesTable).values(demoCases);
    }

    const sid = await createSession({
      user: {
        id: demoUser.id,
        email: demoUser.email ?? undefined,
        firstName: "Demo",
        lastName: "User",
      },
    });
    setSessionCookie(res, sid);

    const base = process.env.APP_BASE_PATH || "/techops";
    return res.json({ success: true, redirect: `${base}/dashboard` });
  } catch (err) {
    console.error("[Demo] Session creation failed:", err);
    return res.status(500).json({ error: "Failed to start demo session" });
  }
});

export default router;
