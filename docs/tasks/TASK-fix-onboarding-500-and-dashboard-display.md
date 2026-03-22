---
name: fix-onboarding-500-and-dashboard-display
description: Fix 500 error on onboarding wizard submit (stale household ID in JWT) and replace strategy name tile with savings trajectory chart on dashboard
status: completed
---

# Fix Onboarding 500 Error and Dashboard Post-Onboarding Display

## Description

Two issues to fix:
1. **500 error on onboarding wizard submit**: `PUT /api/retirement-target` fails with a foreign key violation because the JWT session carries a stale `activeHouseholdId` that doesn't exist in the database.
2. **Dashboard post-onboarding display**: After completing the onboarding wizard, the dashboard should show the savings plan chart and stats, not the strategy name.

## Motivation

The user completes a 4-step onboarding wizard to set up their financial plan. On submit, `PATCH /api/users/me` succeeds but `PUT /api/retirement-target` fails with:
```
insert or update on table "retirement_targets" violates foreign key constraint
Key (household_id)=(00000000-0000-0000-0000-000000000010) is not present in table "households".
```

After fixing the submission, the dashboard should display meaningful stats and a savings trajectory chart rather than the strategy name (e.g. "Coast FIRE").

## Root Cause Analysis

### 500 Error
1. Two seed files use **different household UUIDs**:
   - `seed.ts` (`npm run db:seed`): `HOUSEHOLD_ID = "00000000-0000-0000-0000-000000000010"`
   - `seed-dev.ts` (`npm run db:seed:dev`): `HOUSEHOLD_ID = "00000000-0000-0000-0001-000000000001"`
2. `npm run db:reset` drops the DB and runs `seed-dev.ts`, creating household `0001..001`.
3. But the JWT cookie from a previous session persists with `activeHouseholdId = 000..010` (from `seed.ts`).
4. `getHouseholdSession()` trusts the JWT blindly and returns the stale household ID without checking whether the household actually exists.
5. `PUT /api/retirement-target` tries to INSERT with the non-existent household ID, causing the FK violation.

### Dashboard Display
- Currently shows 4 tiles: Target, Target Age, Monthly Savings, Strategy Name.
- User wants: remove strategy name tile, add a savings plan chart showing the trajectory over time.

## Implementation Plan

### Phase 1: Fix `getHouseholdSession()` validation
- Add DB verification that the household exists and the user is a member
- If the household doesn't exist, fall back to the user's first valid household membership
- Update the user's `activeHouseholdId` in DB if it needed recovery

### Phase 2: Consolidate seed files
- Update `seed.ts` to use the same household IDs as `seed-dev.ts` so they're consistent

### Phase 3: Dashboard savings plan display
- Replace the "Strategy" tile with an "Annual Savings" tile
- Add a savings plan trajectory chart using `getScheduleWithOverride()` from `retirement-strategies.ts`
- Reuse the `ComposedChart` pattern from `StrategyConfigurator.tsx` in a simplified form

## Test Steps

1. Run `npm run db:reset` to reset the database
2. Sign in with `dev@searchbundle.io` / `password123`
3. Complete the onboarding wizard (all 4 steps)
4. Click the submit button on step 4 - should succeed without 500 error
5. Dashboard should display: Target amount, Target Age, Monthly savings, Annual savings
6. Dashboard should show a savings plan trajectory chart
7. Chart should show portfolio value over time with the chosen strategy
