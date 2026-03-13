# Tech-Ops by Martin PMO

## Overview

Full-stack autonomous technology operations platform powered by the **Apphia Engine**. Built as a pnpm workspace monorepo with TypeScript, Express 5, React + Vite, PostgreSQL + Drizzle ORM, Stripe billing, and OpenAI integration.

**Brand**: "Tech-Ops by Martin PMO" — Apphia is the knowledge system/engine, never called "AI", "assistant", or "bot".
**Design**: Soft blues, warm neutrals, gentle gradients, light mode only.

## New Backend Modules (March 2026)

### App & Web Hosting (`/api/hosting/`)
- `GET/POST /api/hosting/projects` — CRUD for hosted app/web/API/static projects
- `GET/PATCH/DELETE /api/hosting/projects/:id` — Single project management
- `GET/POST /api/hosting/domains` — Domain registration with auto-generated DNS records
- `POST /api/hosting/domains/:id/verify` — Domain verification + auto SSL issuance
- `DELETE /api/hosting/domains/:id` — Domain removal
- DB tables: `hosted_projects`, `hosted_domains`

### Encrypted Screenshare Sessions (`/api/remote/screenshare/`)
- `POST /api/remote/screenshare` — Create AES-256-GCM encrypted screenshare session
- `POST /api/remote/screenshare/:id/action` — Submit encrypted action (login, navigate, fill_form, etc.)
- `POST /api/remote/screenshare/:id/decrypt-log` — Decrypt full action log (requires session key)
- `GET /api/remote/screenshare/:id` — Session status/metadata (no plaintext action data)
- `POST /api/remote/screenshare/:id/close` — Close session
- All credentials/passwords encrypted at rest; session key shown only once at creation

### Company Vault (`/api/company-vault/`)
- `GET /api/company-vault/documents` — List docs (supports ?category, ?tag, ?search filters)
- `GET /api/company-vault/documents/:id` — Doc metadata (no content without passphrase)
- `POST /api/company-vault/documents/:id/unlock` — Decrypt and retrieve content
- `POST /api/company-vault/documents` — Store encrypted company document
- `PATCH /api/company-vault/documents/:id` — Update doc (re-encrypts if new content provided)
- `DELETE /api/company-vault/documents/:id` — Permanently delete
- `GET /api/company-vault/categories` — List categories (legal, financial, hr, credentials, policy, contracts, compliance, technical, general)
- DB table: `company_vault_documents`; AES-256-GCM with scrypt key derivation

### Recommendation Engine (`/api/apphia/recommend/`)
- `POST /api/apphia/recommend` — Structured recommendation with certainty scoring (high/medium/low/uncertain)
- Returns: recommendation, confidence %, alternatives, caveats, follow-up questions
- When uncertain: returns "I don't know" response with suggested next steps (no guessing)
- `GET /api/apphia/recommend/domains` — Available knowledge domains

### Security Hardening (`artifacts/api-server/src/middleware/security.ts`)
- Per-route rate limiting (e.g. auth: 20/min, hosting: 60/min, default: 200/min)
- Security headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy, CSP
- X-Powered-By removed
- Input sanitizer: strips XSS vectors from all request body fields (deep, recursive)
- Request size guard: rejects payloads > 10 MB before parsing
- Global error handler: never leaks stack traces in production

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui + Framer Motion
- **Database**: PostgreSQL + Drizzle ORM
- **Payments**: Stripe (4 tiers: Foundation $149, Professional $349, Compliance $749, Enterprise Custom)
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
│   │   └── src/schema/     # auth.ts, cases.ts, conversations.ts, messages.ts, batches.ts, knowledge.ts
│   └── integrations/       # OpenAI integration
├── scripts/
│   └── src/seed-products.ts # Stripe product seeding script
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

## Key Features

1. **Apphia Knowledge Graph**: PostgreSQL-backed knowledge layer with pgvector + pg_trgm. 15 seeded nodes across 7 domains with 1536-dim local embeddings. Primary search via pgvector cosine distance (`<=>`) with trigram+FTS fallback. CRUD API with RBAC (owner/admin for mutations). `/api/kb/search?q=...` and `/api/kb/lookup` for UDI decision objects.
2. **12-Stage Apphia Diagnostic Pipeline**: Stage 1: Classification & Typed Signal Extraction → Stage 2: Quick-Fix Confidence Gate (≥92% triggers early skip) → Stage 3: KB Semantic RAG Retrieval (pgvector evidence correlation) → Stage 4: UDO Graph Traversal & Environment Modeling → Stage 5: Probabilistic Root Cause Ranking (confidence gate ≥90%) → Stage 6: Hypothesis Validation & Evidence Scoring → Stage 7: Guardrails & Safety Validation → Stage 8: Cost Estimation & Approval Gate → Stage 9: Autonomous Action Planning → Stage 10: Resolution Synthesis → Stage 11: Self-Assessment & Failure Prediction → Stage 12: Dual-Output Translation (executive + engineering). All stages stream via SSE. Myers-Briggs profile injected into all stages.
2. **Batch Diagnostics**: Persistent batch entities with tier-based concurrency limits (starter=1, professional=5, business=20, enterprise=unlimited), per-case pause/cancel, cross-case pattern detection
3. **Stripe Subscription Billing**: 4 tiers (Foundation $149, Professional $349, Compliance $749, Enterprise Custom) with Checkout + Customer Portal, webhook sync
4. **Tier Gating + RBAC**: Tier aliases (foundation→starter, proactive→professional, compliance→business) normalized in tierGating.ts; owner/admin/viewer roles
5. **Replit Auth**: OpenID Connect PKCE authentication
6. **Apphia Knowledge Engine Chat**: Conversational interface with SSE streaming; Myers-Briggs preferences injected into system prompt
7. **Voice Companion**: Push-to-talk voice interface for hands-free diagnostic guidance
8. **Preferences Quiz**: Myers-Briggs-style calibration (MBTI-inspired); profile stored in preferencesQuizTable and injected into all Apphia prompts
9. **Connector Health Monitoring**: Real HTTP/DNS/DB health checks (not simulated); live polling of email, cloud, database, network, security, monitoring integrations
10. **Automation Engine**: Background rule evaluator (5-min interval) — triggers: connector_degraded, new_case_critical, case_unresolved_24h; actions: create_alert, escalate_case
11. **Email Notifications**: nodemailer sends branded HTML emails on critical/high case submission (requires SMTP env vars)
12. **Onboarding Modal**: 3-step first-login flow (Welcome → Submit First Case → Done), persisted via localStorage
13. **SLA Tracking**: Deadline auto-set on case creation (critical=4h, high=8h, medium=24h, low=72h); status shown in case metadata panel
14. **File Attachments**: Drag-and-drop upload on case submit (up to 5 files, 10MB each); stored as base64 JSONB; displayed in case detail with type icons
15. **System Alerts**: Severity-based alerts with acknowledgment workflow
16. **Secure Share Vault**: AES-256 encrypted shared access vault
17. **Settings**: Profile, security/access control, notification preferences, team management
18. **Analytics Dashboard**: Full Recharts dashboard with 5 tabs (Overview, Cases, Pipeline, Errors, Connectors). Overview: case volume trend + SLA compliance donut + pipeline bar. Cases: stacked bar by severity, status/priority pie charts, resolution time by priority. Pipeline: per-stage duration + token usage bars, KPI cards. Errors: domain distribution + top patterns. Connectors: uptime/latency cards + latency bar chart. Routes: `/api/analytics/kpi`, `/api/analytics/case-metrics`, `/api/analytics/pipeline-performance`, `/api/analytics/error-trends`, `/api/analytics/case-volume`, `/api/analytics/resolution-times`, `/api/analytics/sla-compliance`, `/api/analytics/connector-health`. Auth fix: ProtectedRoute now uses `<Redirect>` instead of `setLocation()` during render.
19. **Environment Context Layer**: Capture system snapshots with service topology, connector statuses, and environment metadata. Routes: `POST /api/environment/snapshot`, `GET /api/environment/topology`, `GET /api/environment/snapshots`
20. **Remote Control Backend**: Permission-scoped sandboxed session framework with read/write/admin scopes, command safety guardrails (blocked patterns + allowlist for read scope), full audit log. Routes: `POST /api/remote/session`, `POST /api/remote/session/:id/execute`, `GET /api/remote/session/:id/log`, `POST /api/remote/session/:id/close`

## Database Schema

- `users` - Auth + subscription + role (owner/admin/viewer) + preferences
- `sessions` - Replit Auth sessions
- `cases` - Diagnostic cases with tier/severity/status tracking; `attachments` JSONB, `slaDeadline` timestamp, `slaStatus` text, `escalated` boolean
- `conversations` - Apphia chat sessions (user-scoped)
- `messages` - Chat messages (user/assistant roles)
- `batches` - Batch diagnostic jobs with concurrency limits
- `batch_cases` - Individual cases within a batch
- `diagnostic_attempts` - Per-tier diagnostic attempt records with signals, UDO graph, root causes
- `knowledge_nodes` - Knowledge graph nodes with domain, symptoms, resolution steps, search_text (pg_trgm), embedding (pgvector 1536-dim), confidence_score, historical_success
- `knowledge_edges` - Relationships between knowledge nodes (domain_related, etc.) with weight
- `environment_snapshots` - System state captures with topology, services, connector statuses, cloud metadata
- `analytics_events` - Pipeline stage telemetry (eventType, stage, durationMs, tokenCount, confidenceScore)
- `error_patterns` - Recurring error pattern tracking by domain with occurrence counts and KB linkage
- `playbooks` - Resolution playbook library with steps, risk levels, and permission requirements
- `escalation_history` - Audit trail of all escalations with tier, confidence, and pipeline stage
- `remote_sessions` - Sandboxed remote control sessions with scope, token, command log
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
- `GET /api/kb/search?q=...` - Semantic search across knowledge nodes (pg_trgm + FTS)
- `GET /api/kb/entries` - List knowledge nodes (supports domain + search filters)
- `GET /api/kb/entries/:id` - Get knowledge node with edges and related nodes
- `POST /api/kb/entries` - Create knowledge node (owner/admin only)
- `PATCH /api/kb/entries/:id` - Update knowledge node (owner/admin only)
- `DELETE /api/kb/entries/:id` - Delete knowledge node (owner/admin only)
- `POST /api/kb/lookup` - Vector lookup returning UDI + decision tree (DB-backed)
- `POST /api/kb/feedback` - Submit feedback to adjust node confidence scores
- `POST /api/openai/conversations` - Create chat conversation
- `GET /api/openai/conversations` - List conversations
- `POST /api/openai/conversations/:id/messages` - Send message (SSE)
- `GET /api/openai/conversations/:id/messages` - Get messages

## Tier Gating

| Feature | Starter (Free) | Foundation $149 | Professional $349 | Compliance $749 | Enterprise |
|---------|---------------|-----------------|-------------------|-----------------|-----------|
| Max Cases | 3 | 10 | 50 | 200 | Unlimited |
| Batch Concurrency | 1 | 1 | 5 | 20 | Unlimited |
| Diagnostics | Basic | Basic | Advanced | Full | Full |
| Connectors | - | Single | Multi | Monitoring | Custom |
| Automation | - | - | - | Yes | Yes |

**Tier aliases**: `foundation→starter`, `proactive→professional`, `compliance→business`, `individual→starter` (normalized in `tierGating.ts`)

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection (auto-provided by Replit)
- `STRIPE_SECRET_KEY` - Stripe API key (from connector)
- `OPENAI_API_KEY` - OpenAI API key (from integration)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Optional: enables email notifications for critical/high cases (nodemailer)

## Running

- API Server: `pnpm --filter @workspace/api-server run dev`
- Frontend: `pnpm --filter @workspace/techops run dev`
- Seed Stripe products: `pnpm --filter @workspace/api-server exec tsx scripts/src/seed-products.ts`
- Push DB schema: `pnpm --filter @workspace/db run push`
- Run codegen: `pnpm --filter @workspace/api-spec run codegen`
