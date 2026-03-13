import * as oidcClient from "openid-client";
import crypto from "crypto";
import bcryptjs from "bcryptjs";
import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, gt } from "drizzle-orm";
import { db, usersTable, magicLinksTable } from "@workspace/db";
import { GetCurrentAuthUserResponse } from "@workspace/api-zod";
import {
  clearSession, createSession, deleteSession, getSessionId, getSession,
  setSessionCookie, getOrigin, SESSION_COOKIE, SESSION_TTL,
  type SessionData,
} from "../lib/auth";
import { sendEmail } from "../emailService";

const router: IRouter = Router();

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

async function upsertUser(data: {
  id?: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  googleId?: string | null;
  authProvider?: string;
  passwordHash?: string | null;
}) {
  const id = data.id ?? crypto.randomUUID();
  const [user] = await db
    .insert(usersTable)
    .values({ ...data, id })
    .onConflictDoUpdate({
      target: usersTable.id,
      set: { ...data, updatedAt: new Date() },
    })
    .returning();
  return user;
}

// ── Current User ──────────────────────────────────────────────────────────────

router.get("/auth/user", (req: Request, res: Response) => {
  res.json(GetCurrentAuthUserResponse.parse({ user: req.isAuthenticated() ? req.user : null }));
});

// ── Update Profile ─────────────────────────────────────────────────────────────

router.patch("/auth/profile", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }
  const { firstName, lastName } = req.body as { firstName?: string; lastName?: string };
  await db.update(usersTable)
    .set({ firstName: firstName ?? null, lastName: lastName ?? null, updatedAt: new Date() })
    .where(eq(usersTable.id, (req.user as { id: string }).id));
  req.user = { ...(req.user as object), firstName, lastName } as Express.User;
  res.json({ ok: true });
});

// ── Change Password ────────────────────────────────────────────────────────────

router.patch("/auth/password", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
  if (!newPassword || newPassword.length < 8) { res.status(400).json({ error: "New password must be at least 8 characters" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, (req.user as { id: string }).id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  if (user.passwordHash) {
    if (!currentPassword) { res.status(400).json({ error: "Current password is required" }); return; }
    const valid = await bcryptjs.compare(currentPassword, user.passwordHash);
    if (!valid) { res.status(400).json({ error: "Current password is incorrect" }); return; }
  }

  const hash = await bcryptjs.hash(newPassword, 12);
  await db.update(usersTable).set({ passwordHash: hash, updatedAt: new Date() }).where(eq(usersTable.id, user.id));
  res.json({ ok: true });
});

// ── Logout ────────────────────────────────────────────────────────────────────

router.get("/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);
  const returnTo = getSafeReturnTo(req.query.returnTo);
  res.redirect(returnTo || "/");
});

router.post("/auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);
  res.json({ success: true });
});

// ── Email + Password ──────────────────────────────────────────────────────────

router.post("/auth/register", async (req: Request, res: Response) => {
  const { email, password, firstName, lastName } = req.body as {
    email?: string; password?: string; firstName?: string; lastName?: string;
  };

  if (!email?.trim() || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const emailNorm = email.trim().toLowerCase();

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, emailNorm)).limit(1);
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const hash = await bcryptjs.hash(password, 12);
  const user = await upsertUser({
    email:        emailNorm,
    firstName:    firstName?.trim() || null,
    lastName:     lastName?.trim() || null,
    passwordHash: hash,
    authProvider: "email",
  });

  const sid = await createSession({ user: { id: user.id, email: user.email ?? undefined, firstName: user.firstName ?? undefined, lastName: user.lastName ?? undefined, profileImageUrl: user.profileImageUrl ?? undefined } });
  setSessionCookie(res, sid);
  res.status(201).json({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
});

router.post("/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email?.trim() || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const emailNorm = email.trim().toLowerCase();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, emailNorm)).limit(1);

  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcryptjs.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const sid = await createSession({ user: { id: user.id, email: user.email ?? undefined, firstName: user.firstName ?? undefined, lastName: user.lastName ?? undefined, profileImageUrl: user.profileImageUrl ?? undefined } });
  setSessionCookie(res, sid);
  res.json({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
});

// ── Magic Link ─────────────────────────────────────────────────────────────────

router.post("/auth/magic-link/request", async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };
  if (!email?.trim()) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const emailNorm = email.trim().toLowerCase();

  const token    = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

  await db.insert(magicLinksTable).values({ email: emailNorm, token, expiresAt });

  const origin  = getOrigin(req);
  const link    = `${origin}/api/auth/magic-link/verify?token=${token}`;

  const { sent } = await sendEmail({
    to: emailNorm,
    subject: "Your Tech-Ops sign-in link",
    html: `
<!DOCTYPE html>
<html>
<body style="font-family:'Segoe UI',sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:0;">
  <div style="max-width:520px;margin:40px auto;background:#1e293b;border-radius:12px;overflow:hidden;border:1px solid #334155;">
    <div style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:28px 32px;">
      <h1 style="margin:0;font-size:20px;font-weight:700;color:#fff;">Tech-Ops by Martin PMO</h1>
      <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.8);">Support, Engineered.</p>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 12px;font-size:18px;font-weight:600;color:#f1f5f9;">Sign in to your account</h2>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">Click the button below to sign in. This link expires in 15 minutes and can only be used once.</p>
      <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff;font-size:14px;font-weight:600;padding:14px 28px;border-radius:8px;text-decoration:none;">Sign In to Tech-Ops →</a>
      <p style="margin:24px 0 0;font-size:12px;color:#475569;">If you didn't request this, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>`,
  });

  if (!sent) {
    console.log(`[MagicLink] Dev link for ${emailNorm}: ${link}`);
  }

  // Always return success so we don't leak whether email exists
  res.json({ sent: true, devLink: process.env.NODE_ENV !== "production" ? link : undefined });
});

router.get("/auth/magic-link/verify", async (req: Request, res: Response) => {
  const { token } = req.query as { token?: string };
  if (!token) { res.redirect("/auth?error=invalid"); return; }

  const [row] = await db
    .select()
    .from(magicLinksTable)
    .where(and(eq(magicLinksTable.token, token), eq(magicLinksTable.used, false), gt(magicLinksTable.expiresAt, new Date())))
    .limit(1);

  if (!row) { res.redirect("/auth?error=expired"); return; }

  await db.update(magicLinksTable).set({ used: true }).where(eq(magicLinksTable.id, row.id));

  const emailNorm = row.email.toLowerCase();
  let [user] = await db.select().from(usersTable).where(eq(usersTable.email, emailNorm)).limit(1);

  if (!user) {
    user = await upsertUser({ email: emailNorm, authProvider: "magic_link" });
  }

  const sid = await createSession({ user: { id: user.id, email: user.email ?? undefined, firstName: user.firstName ?? undefined, lastName: user.lastName ?? undefined, profileImageUrl: user.profileImageUrl ?? undefined } });
  setSessionCookie(res, sid);

  const base = process.env.APP_BASE_PATH || "/techops";
  res.redirect(`${base}/dashboard`);
});

// ── Google OAuth ──────────────────────────────────────────────────────────────

let googleConfig: oidcClient.Configuration | null = null;

async function getGoogleConfig(): Promise<oidcClient.Configuration | null> {
  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (!googleConfig) {
    googleConfig = await oidcClient.discovery(
      new URL("https://accounts.google.com"),
      clientId,
      clientSecret,
    );
  }
  return googleConfig;
}

router.get("/auth/google", async (req: Request, res: Response) => {
  const config = await getGoogleConfig();
  if (!config) {
    res.status(503).json({ error: "Google OAuth is not configured on this server" });
    return;
  }

  const origin      = getOrigin(req);
  const callbackUrl = `${origin}/api/auth/google/callback`;
  const returnTo    = getSafeReturnTo(req.query.returnTo);

  const state        = oidcClient.randomState();
  const nonce        = oidcClient.randomNonce();
  const codeVerifier = oidcClient.randomPKCECodeVerifier();
  const codeChallenge = await oidcClient.calculatePKCECodeChallenge(codeVerifier);

  const redirectTo = oidcClient.buildAuthorizationUrl(config, {
    redirect_uri:          callbackUrl,
    scope:                 "openid email profile",
    code_challenge:        codeChallenge,
    code_challenge_method: "S256",
    state,
    nonce,
  });

  const COOKIE_OPTS = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 10 * 60 * 1000 };
  res.cookie("g_cv",  codeVerifier, COOKIE_OPTS);
  res.cookie("g_nc",  nonce,        COOKIE_OPTS);
  res.cookie("g_st",  state,        COOKIE_OPTS);
  res.cookie("g_rt",  returnTo,     COOKIE_OPTS);
  res.redirect(redirectTo.href);
});

router.get("/auth/google/callback", async (req: Request, res: Response) => {
  const config = await getGoogleConfig();
  if (!config) { res.redirect("/auth?error=google_disabled"); return; }

  const origin      = getOrigin(req);
  const callbackUrl = `${origin}/api/auth/google/callback`;

  const codeVerifier = req.cookies?.g_cv  as string | undefined;
  const nonce        = req.cookies?.g_nc  as string | undefined;
  const expectedState = req.cookies?.g_st as string | undefined;
  const returnTo     = getSafeReturnTo(req.cookies?.g_rt);

  res.clearCookie("g_cv", { path: "/" });
  res.clearCookie("g_nc", { path: "/" });
  res.clearCookie("g_st", { path: "/" });
  res.clearCookie("g_rt", { path: "/" });

  if (!codeVerifier || !expectedState) { res.redirect("/auth?error=invalid"); return; }

  const currentUrl = new URL(`${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`);

  let tokens: oidcClient.TokenEndpointResponse & oidcClient.TokenEndpointResponseHelpers;
  try {
    tokens = await oidcClient.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce:    nonce,
      expectedState,
      idTokenExpected:  true,
    });
  } catch (err) {
    console.error("Google OAuth error:", err);
    res.redirect("/auth?error=google_failed");
    return;
  }

  const claims = tokens.claims();
  if (!claims?.sub) { res.redirect("/auth?error=no_claims"); return; }

  const googleId = claims.sub as string;
  const email    = (claims.email as string | undefined)?.toLowerCase();
  const name     = (claims.name as string | undefined) || "";
  const [firstName, ...rest] = name.split(" ");
  const lastName = rest.join(" ") || null;
  const picture  = (claims.picture as string | undefined) || null;

  // Check if user exists by googleId first, then by email
  let [user] = await db.select().from(usersTable).where(eq(usersTable.googleId, googleId)).limit(1);
  if (!user && email) {
    [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  }

  if (user) {
    await db.update(usersTable).set({ googleId, profileImageUrl: picture, updatedAt: new Date() }).where(eq(usersTable.id, user.id));
    user = { ...user, googleId, profileImageUrl: picture };
  } else {
    user = await upsertUser({ email, googleId, firstName: firstName || null, lastName, profileImageUrl: picture, authProvider: "google" });
  }

  const sid = await createSession({ user: { id: user.id, email: user.email ?? undefined, firstName: user.firstName ?? undefined, lastName: user.lastName ?? undefined, profileImageUrl: user.profileImageUrl ?? undefined } });
  setSessionCookie(res, sid);

  const base = process.env.APP_BASE_PATH || "/techops";
  res.redirect(returnTo !== "/" ? returnTo : `${base}/dashboard`);
});

// ── PATCH /api/auth/notification-preferences ──────────────────────────────────

router.patch("/auth/notification-preferences", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (!sid) return res.status(401).json({ error: "Unauthorized" });

  const session = await getSession(sid);
  if (!session?.user?.id) return res.status(401).json({ error: "Unauthorized" });

  const { preferences } = req.body as { preferences?: Record<string, boolean> };
  if (!preferences || typeof preferences !== "object") {
    return res.status(400).json({ error: "preferences must be a JSON object" });
  }

  await db.update(usersTable)
    .set({ notificationPreferences: preferences, updatedAt: new Date() })
    .where(eq(usersTable.id, session.user.id));

  return res.json({ success: true });
});

// ── Legacy /login redirect (keep old links working) ───────────────────────────

router.get("/login", (_req: Request, res: Response) => {
  res.redirect("/auth");
});

// ── Mobile token exchange (keep for Expo app) ─────────────────────────────────

router.post("/mobile-auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) await deleteSession(sid);
  res.json({ success: true });
});

export default router;
