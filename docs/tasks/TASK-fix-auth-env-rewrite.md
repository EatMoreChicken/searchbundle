---
name: fix-auth-env-rewrite-bugs
description: Fix three blocking auth bugs — env vars not loaded in Next.js, afterFiles rewrite intercepting auth routes, and missing AUTH_SECRET.
status: completed
---

# Fix Auth Environment & Rewrite Bugs

## Description

Three distinct bugs preventing authentication from working after the user-auth feature was implemented.

## Root Cause Analysis

### Bug 1: `DATABASE_URL environment variable is not set`
**Cause:** The `.env` file lives at the monorepo root (`searchbundle/.env`). When Next.js runs via `npm run dev --workspace=apps/web`, the CWD is `apps/web`. Next.js loads `.env` from its project root (where `next.config.ts` is), which is `apps/web/` — NOT the monorepo root. So `DATABASE_URL` and `AUTH_SECRET` are never loaded into the Next.js process.

**Fix:** Load dotenv explicitly in `next.config.ts` pointing to `../../.env` (the monorepo root).

### Bug 2: `MissingSecret: Please define a 'secret'`
**Cause:** Same root cause as Bug 1 — `AUTH_SECRET` from `.env` isn't loaded. Auth.js requires this env var.

**Fix:** Same fix as Bug 1 (dotenv in `next.config.ts`).

### Bug 3: `Route GET:/api/auth/session not found` / `Route GET:/api/auth/error not found`
**Cause:** The `afterFiles` rewrite in `next.config.ts` proxies ALL `/api/*` requests to Fastify. The Next.js docs state that `afterFiles` rewrites run after pages/public files but BEFORE dynamic routes. Since `[...nextauth]` is a catch-all dynamic route, the `afterFiles` rewrite intercepts `/api/auth/*` requests before the route handler can match — sending them to Fastify, which doesn't have those routes.

**Fix:** Change from `afterFiles` to `fallback` rewrites. Fallback only triggers if no Next.js filesystem route (including dynamic/catch-all routes) matches. This means `/api/auth/*`, `/api/accounts`, `/api/users` will hit the Next.js route handlers first, and only unmatched `/api/*` paths (like `/api/health`, `/api/debts`, `/api/check-ins`) fall through to Fastify.

## Implementation

### Phase 1: Fix env loading in next.config.ts
Add `dotenv` dependency to `apps/web` and load root `.env` at the top of `next.config.ts`.

### Phase 2: Switch rewrite from afterFiles to fallback
Change `next.config.ts` to use `fallback` instead of `afterFiles`.

### Phase 3: Install dotenv
Add `dotenv` as a dependency to `apps/web/package.json`.

## Test Steps
1. `npm run dev` — no build errors
2. Visit `http://localhost:3000` — redirects to `/sign-in` (not a Fastify 404)
3. Enter wrong credentials → error "Invalid email or password" stays on sign-in page (not Fastify 404)
4. Sign up with new account → creates account → auto-signs-in → `/dashboard`
5. Sign in with `dev@searchbundle.io` / `password123` → succeeds → `/dashboard`
6. Sidebar shows user name/email
7. Sign out → returns to `/sign-in`
