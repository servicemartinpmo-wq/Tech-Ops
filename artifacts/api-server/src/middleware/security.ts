import type { Request, Response, NextFunction, ErrorRequestHandler } from "express";

const RATE_LIMIT_WINDOWS = new Map<string, { count: number; resetAt: number }>();

const ROUTE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  "/api/auth/login":             { max: 5,   windowMs: 60_000 },
  "/api/auth/register":          { max: 3,   windowMs: 60_000 },
  "/api/auth/magic-link/request":{ max: 3,   windowMs: 60_000 },
  "/api/auth/google":            { max: 10,  windowMs: 60_000 },
  "/api/auth":                   { max: 20,  windowMs: 60_000 },
  "/api/demo":                   { max: 5,   windowMs: 60_000 },
  "/api/vault":                  { max: 30,  windowMs: 60_000 },
  "/api/company-vault":          { max: 30,  windowMs: 60_000 },
  "/api/remote":                 { max: 20,  windowMs: 60_000 },
  "/api/hosting":                { max: 60,  windowMs: 60_000 },
  "/api/apphia":                 { max: 40,  windowMs: 60_000 },
  "/api/cases":                  { max: 100, windowMs: 60_000 },
  default:                       { max: 200, windowMs: 60_000 },
};

function getLimitForPath(path: string) {
  for (const [prefix, limit] of Object.entries(ROUTE_LIMITS)) {
    if (prefix !== "default" && path.startsWith(prefix)) return limit;
  }
  return ROUTE_LIMITS.default;
}

function getUserId(req: Request): string {
  const auth = (req as Request & { user?: { id?: string } }).user;
  return auth?.id || req.ip || "anon";
}

export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const userId = getUserId(req);
  const limit  = getLimitForPath(req.path);
  const key    = `${userId}:${req.path.split("/").slice(0, 4).join("/")}`;
  const now    = Date.now();

  let entry = RATE_LIMIT_WINDOWS.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + limit.windowMs };
    RATE_LIMIT_WINDOWS.set(key, entry);
  }

  entry.count++;

  res.setHeader("X-RateLimit-Limit",     String(limit.max));
  res.setHeader("X-RateLimit-Remaining", String(Math.max(0, limit.max - entry.count)));
  res.setHeader("X-RateLimit-Reset",     String(Math.ceil(entry.resetAt / 1000)));

  if (entry.count > limit.max) {
    res.status(429).json({
      error: "Too many requests. Please slow down.",
      retryAfterMs: entry.resetAt - now,
    });
    return;
  }

  next();
}

export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("X-Content-Type-Options",    "nosniff");
  res.setHeader("X-Frame-Options",           "DENY");
  res.setHeader("X-XSS-Protection",          "1; mode=block");
  res.setHeader("Referrer-Policy",           "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy",        "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none';"
  );
  res.removeHeader("X-Powered-By");
  next();
}

export function sanitizeBody(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === "object") {
    req.body = deepSanitize(req.body);
  }
  next();
}

function deepSanitize(obj: unknown, depth = 0): unknown {
  if (depth > 10) return "[too deep]";
  if (typeof obj === "string") {
    return obj
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+\s*=/gi, "");
  }
  if (Array.isArray(obj)) {
    return obj.slice(0, 500).map(v => deepSanitize(v, depth + 1));
  }
  if (obj !== null && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (Object.keys(out).length >= 100) break;
      const safeKey = String(k).slice(0, 100);
      out[safeKey] = deepSanitize(v, depth + 1);
    }
    return out;
  }
  return obj;
}

export function requestSizeGuard(req: Request, res: Response, next: NextFunction): void {
  const MAX_BYTES = 10 * 1024 * 1024;
  const contentLength = parseInt(req.headers["content-length"] || "0", 10);
  if (contentLength > MAX_BYTES) {
    res.status(413).json({ error: "Request payload too large (max 10 MB)" });
    return;
  }
  next();
}

export const globalErrorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const isProd = process.env.NODE_ENV === "production";

  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: "Invalid JSON in request body" });
    return;
  }

  if (err instanceof Error) {
    const code = (err as Error & { status?: number; statusCode?: number }).status
      || (err as Error & { status?: number; statusCode?: number }).statusCode
      || 500;

    console.error(`[API Error] ${err.message}`, isProd ? "" : err.stack);

    res.status(typeof code === "number" ? code : 500).json({
      error: isProd ? "An internal error occurred. Our team has been notified." : err.message,
      ...(isProd ? {} : { stack: err.stack }),
    });
    return;
  }

  console.error("[API Unknown Error]", err);
  res.status(500).json({ error: "An unexpected error occurred." });
};

export function asyncHandler<T extends Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req as T, res, next).catch(next);
  };
}
