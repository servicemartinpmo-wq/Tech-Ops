# Tech-Ops by Martin PMO

## Overview

"Tech-Ops by Martin PMO" is a full-stack autonomous technology operations platform powered by the "Apphia Engine". It is designed to streamline and automate IT operations, diagnostics, and knowledge management for businesses. The platform offers capabilities for hosting, secure remote access, encrypted document storage, intelligent recommendations, and comprehensive analytics. The Apphia Engine is a knowledge system — never referred to as "AI", "assistant", or "bot".

**Tagline**: "Support, Engineered."

## User Preferences

- **Brand**: "Tech-Ops by Martin PMO" — Apphia is the knowledge system/engine, never called "AI", "assistant", or "bot".
- **Design**: Light theme — white/slate-50 backgrounds, blue/indigo accent colors, clean card shadows. No dark backgrounds anywhere.
- **No character/size limits** on any inputs.
- **No Zod `max()` constraints** anywhere.
- **No Stripe** — payment providers are UI-only: Zoho, Billsby, Chargebee, Fastspring, Square.

## System Architecture

The project is built as a pnpm workspace monorepo using Node.js 24 and TypeScript 5.9.

**Core Technologies:**
- **Backend**: Express 5, tsx (hot-reload dev)
- **Frontend**: React, Vite, Tailwind CSS, shadcn/ui, Framer Motion
- **Database**: PostgreSQL with Drizzle ORM + pgvector + pg_trgm
- **Authentication**: Custom multi-method auth (Google OAuth + Email/Password + Email Magic Link)
- **Validation**: Zod (v4), `drizzle-zod`
- **Payments**: UI-only billing page (Zoho, Billsby, Chargebee, Fastspring, Square — no Stripe)

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
| Creator Mode | `POST /api/auth/creator-login` | Key: `CREATOR_KEY` env var (default: `TechOpsPMO-Creator-2025`) |
| Logout | `POST /api/auth/logout` | Clears `sid` cookie |

**Session**: cookie `sid`, stored in `sessions` table, TTL 7 days.
**Auth UI**: `/auth` page — 3 tabs (Google / Password / Magic Link) + hidden Creator Mode (Crown icon link at bottom). Light theme with PMO-Ops logo. Registration has ToS checkbox.

**Env vars needed for full auth:**
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (Google OAuth)
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_PORT` (Magic Link email)

## Database Schema

Key columns added via `ALTER TABLE` (raw SQL):
- `users.notification_preferences` (jsonb) — email/alert/digest preferences
- `users.onboarding_completed` (boolean) — first-login wizard
- `users.cookie_consent` (boolean) — GDPR consent

DB command: `psql $DATABASE_URL -c "ALTER TABLE..."` for non-interactive additions.
Drizzle push: `pnpm --filter @workspace/db run push` (interactive; use force flag for conflicts).

## Key Pages & Routes

| Route | Auth | Description |
|-------|------|-------------|
| `/` | Public | Landing page with social proof, stats, testimonials |
| `/auth` | Public | 3-tab auth page with ToS checkbox |
| `/privacy` | Public | Privacy Policy |
| `/terms` | Public | Terms of Service |
| `/status` | Public | Live platform health status |
| `/dashboard` | Protected | Case stats, ticket queue |
| `/cases` | Protected | Support ticket list |
| `/cases/submit` | Protected | New case form |
| `/billing` | Protected | 4-tier subscription page (UI-only) |
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
| `/settings` | Protected | User settings (profile, password, notifications) |
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
15. **AlertMonitor**: Runs every 10 min — connector health degradation + SLA approaching/breach + critical-case-undiagnosed checks.
16. **AutomationEngine**: Runs every 5 min — evaluates automation rules and triggers actions.
17. **Onboarding Wizard**: 4-step modal (Welcome → Snapshot → Connect → Preferences) shown after first login.
18. **Cookie Consent**: GDPR-compliant banner with localStorage persistence.
19. **Demo Mode**: `POST /api/demo/session` creates a temporary demo user with seeded case data. Landing page has "Try Demo" button.
20. **Rate Limiting**: Auth endpoints: login=5/min, register=3/min, magic-link=3/min, demo=5/min.
21. **Error Boundary**: React error boundary wrapping all routes for graceful crash recovery.
22. **Mobile Sidebar**: Collapsible sidebar on mobile (<lg) with hamburger menu + overlay.

## External Dependencies

- **OpenAI**: Apphia Engine (GPT-4o), voice processing (via AI_INTEGRATIONS_OPENAI env vars)
- **PostgreSQL extensions**: `pgvector`, `pg_trgm`
- **Nodemailer**: Magic link emails (optional — dev mode returns link directly)
- **Google OAuth**: Social login (requires `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`)

## DB Commands

```bash
pnpm --filter @workspace/db run push        # Sync schema (interactive)
psql $DATABASE_URL -c "ALTER TABLE ..."     # Non-interactive column adds
cd lib/db && npx tsc -p tsconfig.json       # Rebuild TS types for DB package
```
