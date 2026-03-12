# Tech-Ops by Martin PMO

## Overview

Full-stack autonomous technology operations platform powered by the **Apphia Engine**. Built as a pnpm workspace monorepo with TypeScript, Express 5, React + Vite, PostgreSQL + Drizzle ORM, Stripe billing, and OpenAI integration.

**Brand**: "Tech-Ops by Martin PMO" — Apphia is the knowledge system/engine, never called "AI", "assistant", or "bot".
**Design**: Soft blues, warm neutrals, gentle gradients, light mode only.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui + Framer Motion
- **Database**: PostgreSQL + Drizzle ORM
- **Payments**: Stripe (4 tiers: Individual $9, Professional $29, Business $79, Enterprise $199/mo)
- **Auth**: Replit Auth (OpenID Connect with PKCE)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle for API), Vite (frontend)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (port 8080)
│   │   ├── src/routes/     # cases, stripe, dashboard, connectors, automation, preferences, openai, batches, alerts
│   │   ├── src/middleware/  # tierGating.ts (RBAC + feature gating by subscription tier)
│   │   ├── src/storage.ts  # Data access layer
│   │   ├── src/stripeClient.ts  # Stripe SDK initialization
│   │   └── src/types.ts    # AuthenticatedRequest interface
│   └── techops/            # React + Vite frontend
│       ├── src/pages/      # 13 pages: Landing, Dashboard, Submit Issue, Cases, Resolved Cases, Batch Diagnostics, Apphia Chat, Voice Companion, Connectors, Automation, Alerts, Preferences, Settings, Billing
│       ├── src/components/ # Layout, UI components (shadcn)
│       └── src/hooks/      # SSE chat, SSE diagnostics, mobile, toast hooks
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   │   └── src/schema/     # auth.ts, cases.ts, conversations.ts, messages.ts, batches.ts
│   └── integrations/       # OpenAI integration
├── scripts/
│   └── src/seed-products.ts # Stripe product seeding script
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

## Key Features

1. **Apphia Diagnostic Pipeline** (7-stage): Classification, typed signal extraction, UDO graph traversal, probabilistic root cause ranking, confidence gating, guardrails/cost gate, resolution synthesis with self-assessment — all via SSE streaming
2. **Batch Diagnostics**: Persistent batch entities with tier-based concurrency limits (free=1, pro=5, business=20, enterprise=unlimited), per-case pause/cancel, cross-case pattern detection
3. **Stripe Subscription Billing**: 4 tiers with Checkout + Customer Portal, webhook sync via stripe-replit-sync
4. **Role-Based Access Control**: owner/admin/viewer roles with feature gating per subscription tier
5. **Replit Auth**: OpenID Connect PKCE authentication
6. **Apphia Knowledge Engine Chat**: Conversational interface with SSE streaming (OpenAI-powered)
7. **Voice Companion**: Push-to-talk voice interface for hands-free diagnostic guidance
8. **Preferences Quiz**: Myers-Briggs-style calibration for Apphia's communication style
9. **Connector Health Monitoring**: Live polling of integrated system health
10. **Automation Center**: Trigger-action rules with governance/approval workflows
11. **System Alerts**: Severity-based alerts with acknowledgment workflow
12. **Settings**: Profile, security/access control, notification preferences, team management

## Database Schema

- `users` - Auth + subscription + role (owner/admin/viewer) + preferences
- `sessions` - Replit Auth sessions
- `cases` - Diagnostic cases with tier/severity/status tracking
- `conversations` - Apphia chat sessions (user-scoped)
- `messages` - Chat messages (user/assistant roles)
- `batches` - Batch diagnostic jobs with concurrency limits
- `batch_cases` - Individual cases within a batch
- `diagnostic_attempts` - Per-tier diagnostic attempt records with signals, UDO graph, root causes
- `system_alerts` - System notifications with severity and acknowledgment
- `audit_log` - Audit trail of user actions
- `stripe.*` - Synced Stripe data (products, prices, subscriptions, customers)

## API Routes (mounted at /api)

- `GET /api/health` - Health check
- `POST /api/auth/*` - Replit Auth endpoints
- `GET/POST /api/cases` - Diagnostic cases CRUD
- `PATCH /api/cases/:id` - Update case
- `POST /api/cases/:id/diagnose` - Run Apphia diagnostic (SSE, 7-stage pipeline)
- `POST /api/cases/batch` - Quick batch diagnostics (SSE)
- `GET/POST /api/batches` - Batch CRUD with tier-based concurrency
- `GET /api/batches/:id` - Batch detail with per-case status
- `POST /api/batches/:id/cancel` - Cancel running batch
- `GET /api/alerts` - List system alerts
- `POST /api/alerts/:id/acknowledge` - Acknowledge alert
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/activity` - Recent activity feed
- `GET/POST /api/connectors` - Connector health management
- `POST /api/connectors/:name/poll` - Poll connector health
- `GET/POST/DELETE /api/automation` - Automation rules CRUD
- `GET /api/preferences/quiz` - Get quiz questions
- `POST /api/preferences/quiz` - Submit quiz answers
- `GET /api/preferences/profile` - Get user's style profile
- `GET /api/stripe/products` - List subscription tiers
- `GET /api/stripe/subscription` - Get user's subscription
- `POST /api/stripe/checkout` - Create checkout session
- `POST /api/stripe/portal` - Create billing portal session
- `POST /api/openai/conversations` - Create chat conversation
- `GET /api/openai/conversations` - List conversations
- `POST /api/openai/conversations/:id/messages` - Send message (SSE)
- `GET /api/openai/conversations/:id/messages` - Get messages

## Tier Gating

| Feature | Free | Individual | Professional | Business | Enterprise |
|---------|------|-----------|-------------|----------|-----------|
| Max Cases | 3 | 10 | 50 | 200 | Unlimited |
| Batch Concurrency | 1 | 1 | 5 | 20 | Unlimited |
| Diagnostics | Basic | Basic | Advanced | Full | Full |
| Connectors | - | Single | Multi | Monitoring | Custom |
| Automation | - | - | - | Yes | Yes |

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection (auto-provided by Replit)
- `STRIPE_SECRET_KEY` - Stripe API key (from connector)
- `OPENAI_API_KEY` - OpenAI API key (from integration)

## Running

- API Server: `pnpm --filter @workspace/api-server run dev`
- Frontend: `pnpm --filter @workspace/techops run dev`
- Seed Stripe products: `pnpm --filter @workspace/api-server exec tsx scripts/src/seed-products.ts`
- Push DB schema: `pnpm --filter @workspace/db run push`
- Run codegen: `pnpm --filter @workspace/api-spec run codegen`
