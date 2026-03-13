# Tech-Ops by Martin PMO

## Overview

"Tech-Ops by Martin PMO" is a full-stack autonomous technology operations platform powered by the "Apphia Engine". It is designed to streamline and automate IT operations, diagnostics, and knowledge management for businesses. The platform offers capabilities for hosting, secure remote access, encrypted document storage, intelligent recommendations, and comprehensive analytics. It aims to provide a robust, scalable solution for managing complex technical environments, enhancing operational efficiency, and ensuring compliance. The Apphia Engine, central to the platform, is a knowledge system designed to provide intelligent, contextualized insights without being referred to as an "AI," "assistant," or "bot."

## User Preferences

- **Brand**: "Tech-Ops by Martin PMO" — Apphia is the knowledge system/engine, never called "AI", "assistant", or "bot".
- **Design**: Soft blues, warm neutrals, gentle gradients, light mode only.

## System Architecture

The project is built as a pnpm workspace monorepo using Node.js 24 and TypeScript 5.9.

**Core Technologies:**
- **Backend**: Express 5
- **Frontend**: React, Vite, Tailwind CSS, shadcn/ui, Framer Motion
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth (OpenID Connect with PKCE)
- **Validation**: Zod (v4), `drizzle-zod`
- **API Codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (API), Vite (frontend)

**Monorepo Structure:**
- `artifacts/api-server/`: Express API server (port 8080) containing routes, middleware (including `tierGating.ts` for RBAC and feature gating), data access, and Stripe client.
- `artifacts/techops/`: React + Vite frontend with pages, components (using shadcn/ui), and hooks.
- `lib/`: Contains shared resources such as OpenAPI specification for `api-spec`, generated React Query hooks for `api-client-react`, generated Zod schemas for `api-zod`, Drizzle ORM schema for `db`, and OpenAI integration for `integrations`.

**Key Features and Architectural Decisions:**

1.  **Apphia Knowledge Graph**: A PostgreSQL-backed knowledge layer utilizing `pgvector` for 1536-dimensional local embeddings and `pg_trgm` for search. It supports CRUD operations with RBAC and offers semantic search and decision object lookups.
2.  **Apphia Diagnostic Pipeline**: A 12-stage pipeline for diagnostics, including classification, signal extraction, RAG retrieval, environment modeling, root cause ranking, hypothesis validation, guardrails, cost estimation, action planning, resolution synthesis, self-assessment, and dual-output translation. All stages stream via Server-Sent Events (SSE).
3.  **Batch Diagnostics**: Persistent batch entities with tier-based concurrency limits and features like pause/cancel and cross-case pattern detection.
4.  **Tier Gating + RBAC**: Implemented with `tierGating.ts` to manage feature access and concurrency based on subscription tiers and user roles (owner/admin/viewer).
5.  **Secure Hosting**: Provides CRUD for hosted projects, domain registration with auto-generated DNS records, verification, and SSL issuance.
6.  **Encrypted Screenshare Sessions**: Implements AES-256-GCM encrypted screenshare sessions with secure action submission, decryption logging, and at-rest encryption of credentials.
7.  **Company Vault**: Encrypted storage for company documents using AES-256-GCM with scrypt key derivation, supporting categorized document management with passphrase-based content retrieval.
8.  **Recommendation Engine**: Structured recommendations with certainty scoring, providing confidence percentages, alternatives, caveats, and follow-up questions. It avoids guessing and suggests next steps when uncertain.
9.  **Security Hardening**: Includes per-route rate limiting, comprehensive security headers, XSS input sanitization, request size guarding, and a global error handler that prevents stack trace leakage in production.
10. **UI/UX**: Utilizes Tailwind CSS and shadcn/ui for consistent design, with Framer Motion for animations. The aesthetic leans towards soft blues, warm neutrals, and gentle gradients, strictly adhering to a light mode interface.
11. **Remote Control Backend**: A permission-scoped sandboxed session framework with read/write/admin scopes, command safety guardrails (blocked patterns + allowlist), and a full audit log.
12. **Analytics Dashboard**: A comprehensive Recharts dashboard with multiple tabs for overview, cases, pipeline performance, errors, and connector health metrics, using dedicated API routes for data retrieval.
13. **Environment Context Layer**: Captures system snapshots including service topology, connector statuses, and environment metadata for comprehensive diagnostics.

## External Dependencies

-   **Stripe**: For subscription billing, checkout, and customer portal management.
-   **OpenAI**: For integrating with the Apphia Knowledge Engine and conversational AI features.
-   **PostgreSQL extensions**: `pgvector` for vector embeddings and `pg_trgm` for trigram-based search in the knowledge graph.
-   **Nodemailer**: (Optional) For sending branded HTML email notifications.