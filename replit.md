# Tech-Ops by Martin PMO

## Overview

"Tech-Ops by Martin PMO" is a full-stack autonomous technology operations platform powered by the "Apphia Engine". It is designed to streamline and automate IT operations, diagnostics, and knowledge management for businesses. The platform offers capabilities for hosting, secure remote access, encrypted document storage, intelligent recommendations, and comprehensive analytics. The Apphia Engine is a knowledge system — never referred to as "AI", "assistant", or "bot".

**Tagline**: "Support, Engineered."

## User Preferences

- **Brand**: "Tech-Ops by Martin PMO" — Apphia is the knowledge system/engine, never called "AI", "assistant", or "bot".
- **Design**: Dark theme — deep navy/black backgrounds, violet/sky accent colors, glassmorphism cards.
- **No character/size limits** on any inputs.
- **No Zod `max()` constraints** anywhere.

## System Architecture

The project is built as a pnpm workspace monorepo using Node.js 24 and TypeScript 5.9.

**Core Technologies:**
- **Backend**: Express 5, tsx (hot-reload dev)
- **Frontend**: React, Vite, Tailwind CSS, shadcn/ui, Framer Motion
- **Database**: PostgreSQL with Drizzle ORM + pgvector + pg_trgm
- **Authentication**: Custom multi-method auth (Google OAuth + Email/Password + Email Magic Link)
- **Validation**: Zod (v4), `drizzle-zod`
- **API Codegen**: Orval (from OpenAPI spec)
- **Payments**: Stripe (stripe-replit-sync integration)

**Monorepo Structure:**
- `artifacts/api-server/` — Express API server (port 8080)
- `artifacts/techops/` — React + Vite frontend
- `lib/db/` — Drizzle ORM schema and migrations
- `lib/api-zod/` — Generated Zod schemas (exports from source, no build step)
- `lib/api-client-react/` — Generated React Query hooks
- `lib/replit-auth-web/` — useAuth hook (exports from source, no build step)

## Authentication

**Replaced Replit OIDC** with custom 3-method auth:

| Method | Endpoint | Notes |
|--------|----------|-------|
| Google OAuth | `GET /api/auth/google` | Requires `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` |
| Email + Password | `POST /api/auth/register`, `POST /api/auth/login` | bcryptjs hashing |
| Magic Link | `POST /api/auth/magic-link/request`, `GET /api/auth/magic-link/verify` | Nodemailer; returns `devLink` in dev mode |
| Session user | `GET /api/auth/user` | Returns `{ user }` or `{ user: null }` |
| Logout | `POST /api/auth/logout` | Clears `sid` cookie |

**Session**: cookie `sid`, stored in `sessions` table, TTL 7 days.
**Auth UI**: `/auth` page — 3 tabs (Google / Password / Magic Link).

**Env vars needed for full auth:**
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (Google OAuth)
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_PORT` (Magic Link email)

## Stripe Billing

4 live Stripe products (created via bootstrap, synced to stripe schema):
| Tier | Monthly | Price ID |
|------|---------|----------|
| Starter | $49 | price_1TAbA7CwnP0L8Awz3LsbJKuq |
| Professional | $149 | price_1TAbA7CwnP0L8AwzLI1N2aqs |
| Business | $399 | price_1TAbA8CwnP0L8Awzruw4ILlg |
| Enterprise | $999 | price_1TAbA8CwnP0L8AwzbLJ99R7b |

Billing page deduplicates products by tier name (keeps highest price variant).

**Tier feature gating:**
- `starter` — base features
- `professional` — analytics, advanced_diagnostics
- `business` — analytics, advanced_diagnostics, full_diagnostics
- `enterprise` — all_features

## Key Pages & Routes

| Route | Auth | Description |
|-------|------|-------------|
| `/` | Public | Landing page |
| `/auth` | Public | 3-tab auth page |
| `/dashboard` | Protected | Case stats, ticket queue |
| `/cases` | Protected | Support ticket list |
| `/cases/submit` | Protected | New case form |
| `/billing` | Protected | 4-tier subscription page |
| `/hosting` | Protected | App/web project hosting |
| `/admin` | Admin only | User mgmt, platform stats, KB admin |
| `/security` | Protected | Security dashboard |
| `/pmo-ops` | Protected | PMO efficiency dashboard |
| `/stack-intelligence` | Protected | Stack analysis + recommendations |
| `/voice` | Protected | Voice companion (Apphia) |
| `/analytics` | Pro+ | Analytics dashboard |
| `/connectors` | Protected | Connector health |
| `/automation` | Protected | Automation Center |
| `/batches` | Protected | Batch diagnostics |
| `/alerts` | Protected | System alerts |
| `/kb` | Protected | Knowledge base |
| `/secure-vault` | Protected | Encrypted document vault |
| `/remote-assistance` | Protected | Remote control sessions |
| `/settings` | Protected | User settings |
| `/apphia/chat` | Protected | Apphia chat interface |

## Key Features

1. **Apphia Knowledge Graph**: pgvector (1536-dim) + pg_trgm semantic search KB.
2. **12-Stage Diagnostic Pipeline**: Streams via SSE. RAG retrieval, root cause ranking, resolution synthesis.
3. **Batch Diagnostics**: Tier-based concurrency, pause/cancel, cross-case pattern detection.
4. **Tier Gating + RBAC**: `tierGating.ts` middleware, roles: owner/admin/viewer.
5. **Secure Hosting**: Project CRUD, domain management, SSL status.
6. **Encrypted Screenshare**: AES-256-GCM sessions with audit log.
7. **Company Vault**: scrypt key derivation, AES-256-GCM document storage.
8. **PMO Dashboard**: Resolution rate, SLA compliance, batch savings from real cases data.
9. **Security Dashboard**: Score from audit log, alert severity, SLA breach rate, connector health.
10. **Stack Intelligence**: Environment snapshots + connector health → Apphia recommendations.
11. **Voice Companion**: Push-to-talk → Apphia text response → browser TTS.
12. **Admin Panel**: User list + tier/role mgmt, platform stats, KB admin.
13. **Analytics Dashboard**: Recharts multi-tab dashboard (overview, cases, pipeline, errors).
14. **Remote Control**: Permission-scoped sandbox with command guardrails and audit log.

## External Dependencies

- **Stripe**: Subscription billing, checkout, customer portal (`stripe-replit-sync`)
- **OpenAI**: Apphia Engine (GPT-4o), voice processing
- **PostgreSQL extensions**: `pgvector`, `pg_trgm`
- **Nodemailer**: Magic link emails (optional — dev mode returns link directly)
- **Google OAuth**: Social login (requires `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`)

## DB Commands

```bash
pnpm --filter @workspace/db run push        # Sync schema
pnpm --filter @workspace/db exec tsc --build  # Rebuild TS types
```
