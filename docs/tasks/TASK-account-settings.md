---
name: account-settings
description: Account settings page where users can update their profile, personal/financial preferences, and password.
status: completed
---

# TASK: Account Settings Page

## Description

Implement a full account settings page at `/settings` where authenticated users can view and update their profile information, personal/financial preferences, and change their password.

## Motivation

Users need a way to manage their personal information within the app. In addition to core identity fields (name, email, password), we want to capture financial context fields (date of birth, retirement age, timezone, preferred currency, financial goal note) that will power more personalized projections and dashboard display in future features.

## Critical Decisions

- **Extend `users` table directly** rather than creating a separate `user_profiles` table — the relationship is strictly 1:1 and the fields are core to the user record.
- **Five new columns**: `date_of_birth` (date), `timezone` (text), `preferred_currency` (text), `retirement_age` (integer), `financial_goal_note` (text).
- **Separate API routes**: `GET/PATCH /api/users/me` for profile fields; `POST /api/users/me/password` for password change (requires current password verification).
- **Three distinct form sections** on the settings page: Profile, Personal & Financial, Security — each with their own save action to avoid accidentally triggering unrelated saves.
- **No account deletion** in this iteration — danger-zone operations require additional infrastructure (cascade confirmation, audit logs).

## Implementation Steps

### Phase 1 — Database

1. Add 5 columns to `users` table in `schema.ts`:
   - `dateOfBirth` (`date`, nullable)
   - `timezone` (`text`, `default('America/Chicago')`, notNull)
   - `preferredCurrency` (`text`, `default('USD')`, notNull)
   - `retirementAge` (`integer`, nullable)
   - `financialGoalNote` (`text`, nullable)
2. Write `0006_account_settings.sql` migration with `ALTER TABLE` statements.
3. Add journal entry in `meta/_journal.json`.

### Phase 2 — API Routes

1. `GET /api/users/me` — return full user profile (no password hash) using session userId.
2. `PATCH /api/users/me` — accepts partial body `{ name?, email?, dateOfBirth?, timezone?, preferredCurrency?, retirementAge?, financialGoalNote? }`. Validates email uniqueness if email is changing.
3. `POST /api/users/me/password` — accepts `{ currentPassword, newPassword }`. Verifies current password against hash, validates new password ≥ 8 chars, hashes and saves.

### Phase 3 — Frontend

1. Update `User` type in `types/index.ts` with new fields.
2. Create `apps/web/src/app/(app)/settings/page.tsx` with three sections:
   - **Profile**: Name, Email
   - **Personal & Financial**: Date of Birth, Timezone, Preferred Currency, Retirement Age, Financial Goal Note
   - **Security**: Current Password, New Password, Confirm New Password
3. Each section has its own "Save" button and independent saving/success/error state.
4. Add "Settings" nav item to `Sidebar.tsx` with `settings` Material Symbol icon.

### Phase 4 — Documentation

1. Update `copilot-instructions.md` with new user profile fields and routes.

## Edge Cases

- Email change: must check uniqueness, re-auth is not required (session stays valid since we use JWT).
- Password change: show inline error if current password is wrong; validate new ≠ confirm mismatch on client.
- `dateOfBirth` display: stored as ISO date string, formatted for display but stored as `date` type.
- `retirementAge`: integer 1-100 range validated on client.
- Timezone: free-text for now (could be a select in a future iteration); defaults to America/Chicago.

## Test Steps

1. Navigate to `/settings`.
2. **Profile**: Change your name, click Save — name should update in sidebar welcome area on next page load.
3. **Profile**: Change email to a new unique email, Save — should succeed.
4. **Profile**: Change email to one that already exists — should show error.
5. **Personal & Financial**: Fill in date of birth, retirement age, preferred currency, financial goal note, Save — should succeed and fields persist on refresh.
6. **Security**: Enter wrong current password — should show error.
7. **Security**: Enter mismatched new/confirm password — should show client-side error.
8. **Security**: Enter correct current password and valid new password — should succeed, then verify sign-in works with new password.
