# TASK: Household Multi-Tenancy

## Description

Migrate SearchBundle from single-user data ownership to a **household-based multi-tenancy** model. All financial data (assets, liabilities, scenarios, net worth tracking, check-ins) moves from being user-scoped to household-scoped. Users become access/auth principals; households become the data-owning entity.

## Motivation

Currently every table uses `userId` as the data-scoping foreign key. This means:
- A user cannot invite a partner to see or contribute to shared financial data
- There's no concept of shared ownership or collaboration
- Future features like "household net worth" or "partner check-ins" are impossible

The user wants a system where:
- New users automatically get their own household on sign-up
- A user can invite others to their household (partner, financial advisor, etc.)
- Users can belong to multiple households and switch between them
- Financial data is scoped to the household, not the individual
- Assets/liabilities can optionally be tagged with individual ownership for filtering
- The person who created the household is the owner/admin
- Invited users must reset their password on first login

## Naming Decision

**"Household"** is the user-facing name. For solo users, the UI shows "Your Household" which feels natural. For couples/families it's self-explanatory. The DB table is `households`.

## Critical Design Decisions

1. **Data ownership moves to household.** All tables that had `userId` get a `householdId` column instead. The `userId` column on data tables becomes `ownerId` (nullable) — it represents optional individual ownership tagging, not access scoping.
2. **Session carries active household.** The JWT stores `activeHouseholdId`. API routes filter by this instead of `userId`.
3. **Household switching.** Users with multiple memberships can switch via a dropdown in the sidebar or settings. Switching updates the JWT/cookie.
4. **Roles.** `owner` (full control + can delete household), `admin` (can invite/remove members, edit all data), `member` (can view and edit data, cannot manage members).
5. **Invite flow.** Owner/admin creates a user account with a temporary password. That user gets `mustResetPassword: true`. On login, they're redirected to a forced password reset page before accessing the app.
6. **Breaking changes are OK.** No production instance exists. We will wipe the local DB and re-seed with the new schema.
7. **User profile fields stay on users.** `dateOfBirth`, `timezone`, `preferredCurrency`, `retirementAge` stay user-level. `financialGoalNote` moves to household since it's about shared financial goals.

## Edge Cases

- **User already has a household, gets invited to another.** They now belong to two households. The sidebar shows a household switcher. Their `activeHouseholdId` in the JWT is the last one they selected.
- **Owner deletes their household.** Cascade deletes all household data. Members lose that membership but keep their own households.
- **Owner removes a member.** Membership row is deleted. The member can no longer access that household's data. If it was their active household, they're switched to their own.
- **Last member leaves.** The household still exists (owned by the owner). Only the owner can delete.
- **Invited user signs up independently.** During invite, we check if the email already has an account. If yes, we just create a membership link (no new user/password). If no, we create the user + membership.
- **User's active household is deleted.** Middleware/auth detects the membership is gone and resets to their oldest household.
- **Solo user.** The household switcher only shows if the user has 2+ memberships. Otherwise it's hidden. The sidebar shows the household name instead of the user name (or both).

## Implementation Plan

### Phase 1: Database Schema

**New tables:**

```sql
-- Households
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'My Household',
  financial_goal_note TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Membership join table
CREATE TABLE household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',  -- 'owner', 'admin', 'member'
  joined_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(household_id, user_id)
);
```

**Modified tables** (swap `user_id` → `household_id`, add optional `owner_id`):

```sql
-- accounts, debts, scenarios, check_ins, net_worth_categories:
ALTER TABLE accounts ADD COLUMN household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE;
ALTER TABLE accounts ADD COLUMN owner_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE accounts DROP COLUMN user_id;  -- (or rename)

-- Same pattern for debts, scenarios, check_ins, net_worth_categories
```

**Modified users table:**
- Remove `financial_goal_note` (moves to households)
- Add `active_household_id UUID REFERENCES households(id) ON DELETE SET NULL`
- Add `must_reset_password BOOLEAN NOT NULL DEFAULT false`

**New enum:**
```sql
CREATE TYPE household_role AS ENUM ('owner', 'admin', 'member');
```

**Drizzle schema changes:**

```typescript
export const householdRoleEnum = pgEnum("household_role", ["owner", "admin", "member"]);

export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().default("My Household"),
  financialGoalNote: text("financial_goal_note"),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const householdMembers = pgTable("household_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: householdRoleEnum("role").notNull().default("member"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (table) => [
  unique("household_members_household_user").on(table.householdId, table.userId),
]);

// accounts: remove userId, add householdId + ownerId
// debts: remove userId, add householdId + ownerId
// scenarios: remove userId, add householdId
// checkIns: remove userId, add householdId (keep userId as "who did the check-in")
// netWorthCategories: remove userId, add householdId
```

For `checkIns`, keep `userId` since it represents who performed the check-in, but scope the data to the household.

### Phase 2: Auth & Session Changes

**JWT token additions:**
```typescript
// auth.config.ts callbacks
jwt({ token, user, trigger, session }) {
  if (user) {
    token.sub = user.id;
    token.activeHouseholdId = user.activeHouseholdId;
    token.mustResetPassword = user.mustResetPassword;
  }
  // Support household switching via session update
  if (trigger === "update" && session?.activeHouseholdId) {
    token.activeHouseholdId = session.activeHouseholdId;
  }
  return token;
}

session({ session, token }) {
  session.user.id = token.sub;
  session.activeHouseholdId = token.activeHouseholdId;
  session.mustResetPassword = token.mustResetPassword;
  return session;
}
```

**Session type extension:**
```typescript
declare module "next-auth" {
  interface Session {
    user: { id: string; name?: string | null; email?: string | null; image?: string | null; };
    activeHouseholdId: string;
    mustResetPassword: boolean;
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    activeHouseholdId?: string;
    mustResetPassword?: boolean;
  }
}
```

**Authorize callback changes:**
After validating credentials, look up the user's `activeHouseholdId`. If null, find their oldest membership and set it.

**Middleware changes:**
If `mustResetPassword` is true, redirect all non-auth routes to `/reset-password`.

**Sign-up flow changes:**
After creating the user in `POST /api/users`, also:
1. Create a household named "My Household"
2. Create a membership (role: owner)
3. Set user's `activeHouseholdId` to the new household

### Phase 3: API Route Migration

Every route that currently does:
```typescript
where(eq(table.userId, session.user.id))
```

Changes to:
```typescript
where(eq(table.householdId, session.activeHouseholdId))
```

**Specific routes:**

| Route | Current Scoping | New Scoping |
|-------|----------------|-------------|
| `GET/POST /api/assets` | `accounts.userId` | `accounts.householdId` |
| `GET/PUT/DELETE /api/assets/[id]` | `accounts.userId` | `accounts.householdId` |
| `GET/POST /api/assets/[id]/scenarios` | `scenarios.userId` | `scenarios.householdId` |
| `GET/POST /api/liabilities` | `debts.userId` | `debts.householdId` |
| `GET/PUT/DELETE /api/liabilities/[id]` | `debts.userId` | `debts.householdId` |
| `GET/POST /api/liabilities/[id]/scenarios` | `scenarios.userId` | `scenarios.householdId` |
| `GET /api/dashboard?year=` | `netWorthCategories.userId` | `netWorthCategories.householdId` |
| `POST/PUT/DELETE /api/dashboard/categories` | `netWorthCategories.userId` | `netWorthCategories.householdId` |
| `PUT /api/dashboard/entries` | ownership via category join | ownership via category join (no change needed) |

**New routes:**

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/households` | `GET` | List user's households (from memberships) |
| `/api/households` | `POST` | Create a new household |
| `/api/households/[id]` | `GET` | Get household details + members |
| `/api/households/[id]` | `PATCH` | Update household name/goal |
| `/api/households/[id]` | `DELETE` | Delete household (owner only) |
| `/api/households/[id]/members` | `POST` | Invite a member (create user if needed + membership) |
| `/api/households/[id]/members/[memberId]` | `PATCH` | Change member role |
| `/api/households/[id]/members/[memberId]` | `DELETE` | Remove member |
| `/api/households/switch` | `POST` | Switch active household (updates session) |
| `/api/users/me/reset-password` | `POST` | Forced password reset (for invited users) |

**Create operations:** When creating an asset/liability/etc., include `householdId: session.activeHouseholdId` and optionally `ownerId`.

**Helper function:** Create a reusable `getActiveHouseholdId(session)` helper that validates the session has an active household and returns 401/403 if not.

### Phase 4: Frontend Changes

**Sidebar:**
- Replace user name display with household name + user name
- If user has 2+ memberships: show a household switcher dropdown
- Switching calls `POST /api/households/switch` and refreshes the page

**Settings page additions:**
Add a 4th section: "Household Management"
- Show household name (editable by owner/admin)
- Show financial goal (editable by owner/admin)
- Show members list with roles
- "Invite Member" button (owner/admin only): form with name, email, temporary password
- Remove member button (owner/admin only, can't remove self if owner)
- Role change dropdown (owner only)

**Asset/Liability create/edit forms:**
- Add "Ownership" field: dropdown with "Shared" (default, ownerId=null) or list of household members
- This is just for filtering/labeling — does not affect access

**Forced password reset page:**
- New page at `/reset-password` (in `(auth)` route group)
- Shows password change form (new password + confirm)
- After submission, sets `mustResetPassword: false` and redirects to dashboard

**TypeScript types updates:**
```typescript
interface Household {
  id: string;
  name: string;
  financialGoalNote: string | null;
  createdBy: string;
  createdAt: Date;
}

interface HouseholdMember {
  id: string;
  householdId: string;
  userId: string;
  role: "owner" | "admin" | "member";
  joinedAt: Date;
  user?: { id: string; name: string | null; email: string };
}

// Update Asset, Debt, Scenario, etc.:
// - Remove userId
// - Add householdId: string
// - Add ownerId: string | null

// Update User:
// - Add activeHouseholdId: string | null
// - Add mustResetPassword: boolean
// - Remove financialGoalNote (moved to Household)
```

### Phase 5: Seed Data & DB Reset

Since this is a breaking change, the migration strategy is:
1. **Fresh migration file** (`0007_household_multi_tenancy.sql`) that drops and recreates all affected tables
2. Actually simpler: since we're OK with wiping the DB, we can just update the seed to create the full new structure

**New seed script creates:**
- Dev user (same credentials: `dev@searchbundle.io` / `password123`)
- A household ("Dev Household") owned by dev user
- Membership linking dev user as owner
- A second test user (`partner@searchbundle.io` / `password123`) as a member of the same household
- Sample assets (some shared, some individually owned)
- Sample liabilities
- Sample net worth categories and entries

### Phase 6: Documentation

Update `copilot-instructions.md` with:
- New household/multi-tenancy architecture
- New DB tables and modified columns
- New API routes
- Session structure changes
- Seed data changes

---

## Test Steps

1. **Fresh setup:** Run `npm run db:migrate && npm run db:seed`, then `npm run dev`
2. **Sign-up creates household:** Register a new account → verify household + owner membership created
3. **Sign-in sees data:** Log in as `dev@searchbundle.io` → dashboard shows household-scoped data
4. **Assets scoped to household:** Create an asset → verify it appears for the second test user too
5. **Ownership tagging:** Edit an asset → set owner to specific member → verify ownership label displays
6. **Invite member (settings):** Go to Settings → Household → Invite → enter name/email/password → verify user created with `mustResetPassword: true`
7. **Forced password reset:** Log in as invited user → verify redirect to `/reset-password` → change password → verify normal access
8. **Household switching:** Log in as a user in 2+ households → verify switcher appears → switch → verify data changes
9. **Remove member:** Owner removes a member in settings → verify they lose access
10. **Delete household:** Owner deletes a non-primary household → verify data cascade deleted
