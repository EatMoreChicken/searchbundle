---
name: accounts-feature
description: Full end-to-end accounts feature — seed script for fixture user, Drizzle-backed API routes (GET/POST/PUT/DELETE), and polished accounts page UI with card list, add/edit modal, and delete confirmation.
status: completed
---

# Accounts Feature

## Description

Implement the full accounts feature: API route logic (Drizzle queries), a seed script for a fixture user (since auth is not yet wired), and a polished accounts page UI (card list + add/edit/delete form).

---

## Motivation

Accounts are the core data model of SearchBundle. Users need to be able to add, view, update, and delete their financial accounts (savings, investments, property, other) and see their current balances. This is the first fully end-to-end feature.

---

## Critical Decisions

- **Fixture user for now.** Auth is not yet implemented. A seed script will insert a known test user into the DB, and the API routes will hardcode that `userId`. This will be replaced by session-based user ID once Auth.js is wired.
- **`notes` field omitted from `Account` type.** The schema has `notes` but the `Account` interface in `types/index.ts` omits it. Add `notes: string | null` to the interface since the add/edit form will include a notes field.
- **Balance stored as string from DB.** Drizzle returns `numeric` columns as strings. The API layer will parse them to numbers before sending JSON. The frontend type uses `number`.
- **No optimistic updates.** After mutations (add/edit/delete) the page will re-fetch the list. This keeps the implementation simple and correct.
- **Modal for add/edit form.** A slide-up panel keeps the list page clean. Same form component handles both add and edit.
- **CORS already configured.** `@fastify/cors` is registered in `server.ts`, so no changes needed there.

---

## Implementation Plan

### Phase 1 — Update Account type

Add `notes: string | null` to the `Account` interface in `apps/web/src/types/index.ts`.

### Phase 2 — Seed script

Create `packages/db/src/seed.ts`:
- Insert a fixture user with a known UUID and email `dev@searchbundle.io` using `ON CONFLICT DO NOTHING` so re-running is safe.

Add a `db:seed` script to both `packages/db/package.json` and the root `package.json`.

### Phase 3 — API route logic (`apps/api/src/routes/accounts.ts`)

```
GET /api/accounts
  → db.select().from(accounts).where(eq(accounts.userId, FIXTURE_USER_ID))
  → map: parse balance string → number
  → return array

POST /api/accounts
  body: { name, type, balance, currency?, notes? }
  → validate required fields (name, type, balance)
  → db.insert(accounts).values({ ...body, userId: FIXTURE_USER_ID })
  → return inserted row

PUT /api/accounts/:id
  body: { name?, type?, balance?, notes? }
  → db.update(accounts).set({ ...body, updatedAt: new Date() }).where(and(eq(accounts.id, id), eq(accounts.userId, FIXTURE_USER_ID)))
  → return updated row

DELETE /api/accounts/:id
  → db.delete(accounts).where(and(eq(accounts.id, id), eq(accounts.userId, FIXTURE_USER_ID)))
  → 204 No Content
```

### Phase 4 — Accounts page UI

`apps/web/src/app/(app)/accounts/page.tsx` — client component:

```
State:
  accounts: Account[]
  loading: boolean
  modalOpen: boolean
  editingAccount: Account | null  (null = adding new)

On mount: fetch GET /api/accounts → set accounts

Layout:
  Page header (overline "Finances" + title "Accounts" + "Add Account" button)
  
  If no accounts:
    Empty state (DM Serif Display heading + description + Add button)
  
  If accounts:
    Grid of AccountCard components
    
AccountCard:
  type badge (pill) | name (Syne bold) | balance (Syne large)
  Edit icon button | Delete icon button (with confirm)

AccountFormModal:
  Fields: name (text), type (select), balance (number), currency (text, default USD), notes (textarea)
  Submit → POST or PUT → refetch → close modal
  
  On delete confirm → DELETE → refetch
```

---

## Potential Considerations

- **`userId` security.** The hardcoded fixture UUID means any request can read/write that user's data. This is acceptable pre-auth; the auth implementation will replace it with `session.user.id`.
- **Balance display.** Format as USD currency with `Intl.NumberFormat`. Negative balances should never appear on accounts (only debts), but handle gracefully.
- **Type label display.** `investment` → "Investment", `savings` → "Savings", `property` → "Property", `other` → "Other".
- **Drizzle `returning()`.** Use `.returning()` on insert/update to get the row back in one query.

---

## Test Steps

1. Run `npm run db:seed` — should complete with no errors.
2. Start `npm run dev`, visit http://localhost:3000/accounts.
3. Empty state should display with "Add Account" button.
4. Click "Add Account" — modal opens with form fields.
5. Fill in name "Savings Account", type "Savings", balance "5000" — click Save.
6. Card appears in the list showing name, type badge, and formatted balance ($5,000.00).
7. Click the edit button on the card — modal opens pre-filled with existing values.
8. Change the balance to "5500" — click Save. Card updates.
9. Click the delete button — confirm dialog — card is removed.
