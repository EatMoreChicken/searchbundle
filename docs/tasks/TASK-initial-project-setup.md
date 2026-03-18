---
name: initial-project-setup
description: Full initial setup of the SearchBundle project — landing page, monorepo scaffolding, database schema, and developer documentation.
status: completed
---

# Initial Project Setup

## Description

This task covers the full initialization of the SearchBundle project from scratch: creating the GitHub Copilot instructions file from the product North Star document, building and refining the static landing page, scaffolding the full monorepo (Next.js frontend, Fastify API, Drizzle ORM package), standing up a local PostgreSQL database in Docker, applying the initial schema migration, and documenting the setup in the README.

---

## Motivation

The project needed a clean foundation before any feature work could begin. This included:
- A product context file so Copilot has consistent knowledge of what SearchBundle is across all sessions.
- A static landing page to establish the brand and product story.
- A working monorepo structure matching the chosen tech stack.
- A live local database with the initial schema applied.
- Clear documentation so the developer can get back up and running after any reboot without needing to remember steps.

---

## Critical Decisions

- **No bank linking, ever.** Manual-entry by design — this is a core product philosophy, not a technical limitation.
- **Monorepo with npm workspaces.** `apps/web` (Next.js), `apps/api` (Fastify), `packages/db` (Drizzle) are separate packages sharing one `node_modules` via the root `package.json`.
- **Fastify is a separate server (not Next.js API routes).** Runs on port 3001. Next.js proxies `/api/*` to it in development via a rewrite in `next.config.ts`. This keeps the API independently deployable.
- **Drizzle over Prisma.** Lighter weight, closer to raw SQL, better TypeScript inference.
- **Auth.js (NextAuth v5).** Self-hosted, no third-party auth vendor needed.
- **PostgreSQL in Docker for local dev.** The container (`searchbundle-db`) persists across reboots — developers just need to `docker start searchbundle-db` daily, not re-create it.
- **`drizzle.config.ts` must load root `.env` explicitly.** The drizzle-kit CLI CWD is `packages/db`, so a relative dotenv load would miss the root-level `.env`. Fixed with `dotenv.config({ path: resolve(__dirname, "../../.env") })`.
- **Static landing page lives in `landing/` with no build step.** Keeps it simple and independently deployable.

---

## What Was Implemented

### Phase 1: GitHub Copilot Instructions

**File:** `.github/copilot-instructions.md`

Created from the existing `docs/NORTHSTAR.md` product document. Contains:
- What SearchBundle is and is not
- Cooper AI companion description
- Key features list
- Pricing model
- Coding practices (TypeScript strict, clean readable code)
- Full SaaS tech stack decisions (Next.js, Fastify, Auth.js, PostgreSQL, Drizzle, Docker/Nginx/Coolify)
- Deferred tools table (Stripe, Redis, BullMQ, Sentry, PostHog)
- Complete styling guide (fonts, colors, spacing, components, animations, iconography)

### Phase 2: `.gitignore`

Created at root. Covers:
- `node_modules/` and all build outputs (`/.next`, `/dist`, etc.)
- All `.env.*` variants (with a note that `.env.example` is intentionally committed)
- TypeScript build info, test coverage, OS/editor files

### Phase 3: Landing Page (`landing/slim.html`)

Modifications made:
- **Removed pricing section** and its nav link; replaced nav link with "Privacy"
- **Added Privacy section** — two-column layout with three pillars (No Bank Linking, Zero Third-Party Sharing, You Own Your Data) and a promise card
- **Fixed desktop width** — sections use `max-width: 1200px; margin: auto` with `clamp(20px, 5vw, 80px)` horizontal padding
- **Added mobile breakpoints** — `900px` (tablet stack) and `640px` (full mobile)
- **Replaced CSS bar chart** in the hero net worth card with an inline SVG line chart + gradient fill that renders immediately (the CSS animation approach was unreliable and showed blank on load)

### Phase 4: Monorepo Scaffolding

**Root `package.json`** — npm workspaces config with `apps/*` and `packages/*`, plus scripts:
- `dev` — runs both servers concurrently via `concurrently`
- `build` — builds both apps
- `db:generate` — runs drizzle-kit generate
- `db:migrate` — runs the Drizzle migration

**`apps/web/`** (Next.js 15 + React 19 + TypeScript + Tailwind):
- `package.json`, `tsconfig.json`, `next.config.ts`
- `tailwind.config.js` — full custom design token config (colors, fonts matching brand)
- `src/styles/globals.css` — Tailwind directives + Google Fonts import
- `src/app/layout.tsx` — root layout with metadata
- `src/app/page.tsx` — placeholder home page
- `src/app/(app)/layout.tsx` — authenticated app layout shell with sidebar placeholder
- Shell pages: `dashboard`, `accounts`, `debts`, `check-in`, `projections`, `cooper`
- Auth shells: `(auth)/sign-in`, `(auth)/sign-up`
- `src/types/index.ts` — `User`, `Account`, `Debt` TypeScript interfaces
- `src/lib/api-client.ts` — typed fetch wrapper (`get`, `post`, `put`, `delete`)

**`apps/api/`** (Fastify 5 + TypeScript):
- `src/server.ts` — registers CORS, routes, starts on port 3001
- Route stubs: `accounts.ts`, `debts.ts`, `check-ins.ts` (GET/POST/PUT/DELETE returning empty responses)

**`packages/db/`** (Drizzle ORM):
- `src/schema.ts` — 5 tables: `users`, `accounts` (with `account_type` enum), `debts` (with `debt_type` enum), `check_ins`, `balance_history`
- `src/index.ts` — exports `db` client and all schema
- `drizzle.config.ts` — loads root `.env` explicitly, dialect postgresql
- `migrations/0000_naive_arachne.sql` — initial migration (applied ✅)

**`.env.example`** — template with `DATABASE_URL`, `AUTH_SECRET`, `WEB_URL`, `NEXT_PUBLIC_API_URL`

### Phase 5: Database Setup

Local PostgreSQL container created and started:
```bash
docker run --name searchbundle-db \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=searchbundle \
  -p 5432:5432 \
  -d postgres:16
```

Migration applied:
```bash
npm run db:generate
npm run db:migrate
```

All 5 tables confirmed present via `docker exec searchbundle-db psql -U user -d searchbundle -c "\dt"`.

### Phase 6: README Documentation

`README.md` updated to include:
- Project structure diagram
- Tech stack table
- **First-Time Setup** (5 steps with full Docker command)
- **Daily Dev Workflow** (3-step daily routine + stop instructions)
- **Schema Changes** section (when to re-run generate/migrate, note to commit migration files)

---

## Problems Encountered & Resolutions

### Problem 1: `url: undefined` in drizzle-kit

- **Symptom:** `Error: Please provide required params for Postgres driver: url: undefined`
- **Root cause:** `drizzle-kit` CLI executes `drizzle.config.ts` from the `packages/db` directory; `import "dotenv/config"` looks for `.env` relative to that CWD, not the project root
- **Fix:** Changed `drizzle.config.ts` to: `import { config } from "dotenv"; config({ path: resolve(__dirname, "../../.env") })`

### Problem 2: `ECONNREFUSED 127.0.0.1:5432`

- **Symptom:** Connection refused after fixing the env issue
- **Root cause:** No PostgreSQL instance running
- **Fix:** Opened Docker Desktop and ran the `docker run` command above

### Problem 3: Hero net worth card appeared blank

- **Symptom:** The hero card showed a balance number but the chart area was empty
- **Root cause:** The CSS bar chart used `height: 0 !important` + CSS animation with a delay — bars never rendered in static/screenshot contexts
- **Fix:** Replaced with an inline SVG line chart using a `<path>` + gradient `<linearGradient>` that renders immediately with no animation dependency

---

## Test Steps

1. Run `npm install` at the project root — should complete with no errors
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL` and `AUTH_SECRET`
3. Start Docker Desktop, then run `docker start searchbundle-db`
4. Run `npm run db:generate` — should produce/confirm a migration file in `packages/db/migrations/`
5. Run `npm run db:migrate` — should report all migrations applied successfully
6. Run `npm run dev` — both servers should start; visit http://localhost:3000 (web) and http://localhost:3001 (api)
7. Open `landing/slim.html` directly in a browser — the landing page should render with a visible net worth chart in the hero, a privacy section, and no pricing section

---

## What's Not Yet Done

The following are out of scope for this task but are the natural next steps:

- Auth.js integration (sign-in/sign-up flows wired to the database)
- Real page implementations (dashboard, accounts, debts, check-in flow, Cooper chat)
- API route logic (all routes are currently stubs)
- Docker Compose for easier local setup
- Deployment configuration (Nginx config, Coolify setup)
