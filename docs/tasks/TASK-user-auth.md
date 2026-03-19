---
name: user-auth
description: Email/password registration and authentication with Auth.js v5, route protection, and session-aware UI.
status: completed
---

# User Authentication

## Description

Implement full email/password authentication so users can register and sign in. All app pages (dashboard, accounts, debts, etc.) must be inaccessible without an active session. Email verification is intentionally deferred.

## Motivation

The application currently hardcodes a fixture user ID in all API routes. To move toward a real multi-user app, we need:
1. A registration flow (email + password → creates user record)
2. A sign-in flow (credentials → session cookie)
3. Route protection (unauthenticated → redirect to sign-in)
4. Session-aware UI (sidebar shows real user name/email, sign-out button)

## Key Decisions

- **Auth library**: Auth.js v5 (`next-auth@beta`) — already installed, integrates natively with Next.js App Router.
- **Provider**: Credentials (email + password). No OAuth for now.
- **Password hashing**: `bcryptjs` — no native bindings, cross-platform.
- **Session storage**: JWT (stateless, no DB sessions table needed yet).
- **Data API authentication**: We move accounts CRUD from Fastify route handlers to **Next.js Route Handlers**. This gives route handlers direct access to the Auth.js session via `auth()`, eliminating the "how does Fastify know the user?" problem. Fastify remains for health checks and future internal services.
- **No email verification**: Users register and are immediately active. Email verification is a separate future task.

## Architecture

```
Browser
  ├─ /sign-in, /sign-up         → (auth) route group (no sidebar, no auth required)
  ├─ /dashboard, /accounts, ... → (app) route group (sidebar, session required)
  │
  ├─ POST /api/users             → Next.js Route Handler — create user account
  ├─ GET|POST /api/auth/...      → Auth.js v5 route handler (signIn, session, etc.)
  ├─ GET|POST /api/accounts      → Next.js Route Handler (auth session + direct DB)
  ├─ PUT|DELETE /api/accounts/[id] → Next.js Route Handler
  └─ /api/* (anything else)      → Fastify proxy (afterFiles rewrite — Fastify handles
                                    only paths with no Next.js route handler)
```

## Implementation Steps

### Phase 1: DB Schema
- Add `password_hash: text("password_hash")` (nullable) to `users` table
- Generate migration: `npm run db:generate`
- Apply migration: `npm run db:migrate`

### Phase 2: Install Dependencies
- `apps/web`: `bcryptjs`, `@types/bcryptjs`
- Add `@searchbundle/db: "*"` to `apps/web/package.json` (direct DB access for auth + route handlers)
- `packages/db`: `bcryptjs`, `@types/bcryptjs` (for seed script)

### Phase 3: Auth.js Config (`apps/web/src/auth.ts`)
```ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { getDb, users } from "@searchbundle/db"
import { eq } from "drizzle-orm"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      async authorize(credentials) {
        // look up user → compare password → return { id, email, name }
      }
    })
  ],
  callbacks: {
    session({ session, token }) {
      session.user.id = token.sub!  // expose user ID in session
      return session
    }
  },
  pages: { signIn: "/sign-in" }
})
```

### Phase 4: Auth Route Handler
- `apps/web/src/app/api/auth/[...nextauth]/route.ts` — exports `{ GET, POST } = handlers`

### Phase 5: Registration Endpoint
- `apps/web/src/app/api/users/route.ts` — POST: hash password, insert user, return `{ id, email }`
- Validates: email required, password min 8 chars, duplicate email → 409

### Phase 6: Accounts Route Handlers (replaces Fastify for accounts)
- `apps/web/src/app/api/accounts/route.ts` — GET (list) + POST (create), session-gated
- `apps/web/src/app/api/accounts/[id]/route.ts` — PUT (update) + DELETE, session-gated

### Phase 7: Next.js Middleware
- `apps/web/src/middleware.ts` — uses `auth` as middleware wrapper
- Public paths: `/sign-in`, `/sign-up`, `/api/auth/*`, `/api/users`
- All other paths require active session → redirect to `/sign-in?callbackUrl=<path>`

### Phase 8: Fix Rewrite (afterFiles)
- Change `next.config.ts` rewrite to `afterFiles` so Next.js route handlers take precedence over the Fastify proxy

### Phase 9: SessionProvider
- `apps/web/src/components/SessionProviderWrapper.tsx` — thin "use client" wrapper
- Add to root layout so all pages have access to `useSession()`

### Phase 10: Auth Pages UI
- `apps/web/src/app/(auth)/layout.tsx` — centered container, no sidebar
- `apps/web/src/app/(auth)/sign-in/page.tsx` — email + password form, calls `signIn("credentials", ...)`
- `apps/web/src/app/(auth)/sign-up/page.tsx` — name (optional) + email + password form, calls `/api/users` then auto-signs-in

### Phase 11: Sidebar Update
- Show real `session.user.name ?? session.user.email` and `session.user.email`
- Add sign-out button using `useSession` + `signOut` from `next-auth/react`

### Phase 12: Update Seed
- Re-seed with `bcrypt.hash("password123", 12)` for fixture user using `onConflictDoUpdate`

## Edge Cases
- Duplicate email on register → 409 with clear message
- Wrong password on sign-in → generic "Invalid email or password" (don't reveal which)
- Session expired mid-session → middleware auto-redirects to sign-in
- `callbackUrl` on redirect → after sign-in, user lands back where they were

## Test Steps
1. Navigate to `http://localhost:3000` → redirects to `/sign-in`
2. Click "Create an account" → goes to `/sign-up`
3. Fill name (optional), email, password → click "Create Account" → auto-signs-in → redirects to `/dashboard`
4. Click sign-out → redirects to `/sign-in`
5. Sign in with the email + password used in step 3 → succeeds → `/dashboard`
6. Sign in with wrong password → shows error "Invalid email or password"
7. The fixture dev user can sign in with `dev@searchbundle.io` / `password123`
8. Accounts added by user A are not visible to user B (data isolation)
