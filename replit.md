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
│   │   ├── src/routes/     # All API routes (cases, stripe, dashboard, connectors, automation, preferences, openai)
│   │   ├── src/storage.ts  # Data access layer (Stripe schema queries + user management)
│   │   ├── src/stripeClient.ts  # Stripe SDK initialization
│   │   └── src/stripeService.ts # Stripe business logic
│   └── techops/            # React + Vite frontend
│       ├── src/pages/      # Landing, Dashboard, Cases, Apphia Chat, Billing, Connectors, Automation, Preferences
│       ├── src/components/ # Layout, UI components (shadcn)
│       └── src/hooks/      # SSE chat, SSE diagnostics, mobile, toast hooks
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   │   └── src/schema/     # auth.ts (users+sessions), cases.ts, conversations.ts, messages.ts
│   └── integrations/       # OpenAI integration
├── scripts/
│   └── src/seed-products.ts # Stripe product seeding script
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

## Key Features

1. **Apphia Diagnostic Pipeline** (Tier 1-5): UDO traversal, signal extraction, probabilistic root cause ranking via SSE streaming
2. **Stripe Subscription Billing**: 4 tiers with Checkout + Customer Portal, webhook sync via stripe-replit-sync
3. **Replit Auth**: OpenID Connect PKCE authentication
4. **Apphia Knowledge Engine Chat**: Conversational interface with SSE streaming (OpenAI-powered)
5. **Preferences Quiz**: Myers-Briggs-style calibration for Apphia's communication style
6. **Connector Health Monitoring**: Live polling of integrated system health
7. **Automation Center**: Trigger-action rules with governance/approval workflows
8. **Batch Case Execution**: Parallel diagnostic processing

## Database Schema

- `users` - Auth + subscription info (stripe_customer_id, subscription_tier, preferences)
- `sessions` - Replit Auth sessions
- `cases` - Diagnostic cases with tier/severity/status tracking
- `conversations` - Apphia chat sessions
- `messages` - Chat messages (user/assistant roles)
- `stripe.*` - Synced Stripe data (products, prices, subscriptions, customers) via stripe-replit-sync

## API Routes (mounted at /api)

- `GET /api/health` - Health check
- `POST /api/auth/*` - Replit Auth endpoints
- `GET/POST /api/cases` - Diagnostic cases CRUD
- `POST /api/cases/:id/diagnose` - Run Apphia diagnostic (SSE)
- `POST /api/cases/batch` - Batch diagnostics
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
