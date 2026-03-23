---
name: simple-account-asset-type
description: Implement "Simple Account" as the first supported asset type with balance tracking, history chart, and update log.
status: completed
---

# TASK: Simple Account Asset Type

## Description
Implement "Simple Account" as the first supported asset type. This is the simplest asset type, representing a bank account, cash reserve, or any other account that does not accrue interest or have investment-related properties.

## Motivation
The existing assets feature was built during brainstorming and includes many asset types (investment, savings, HSA, property, other) with investment-specific fields. We are starting fresh with a new asset type system. The first type is "Simple Account": a basic balance-only asset with manual value tracking and change history.

## Key Decisions
1. **Only one asset type for now**: "Simple Account" is the only selectable type. No investment, savings, HSA, property, or other types in the UI picker.
2. **Type picker**: Instead of a plain dropdown, use a card-based picker that shows icon, name, and short description. Only one option now but designed to easily add more.
3. **Simple Account explainer**: "A basic account with no interest or growth. Examples: checking account, cash savings, petty cash, gift cards, or any balance you want to track."
4. **Balance updates are tracked**: Every time the user updates the balance, a record is saved with the old value, new value, change amount, and timestamp to build a history table.
5. **Detail page**: Shows current value prominently (clickable/editable with math expressions like the tracker), a balance history chart (recharts), and a history table showing all updates.
6. **Seed data rework**: Only create simple account assets in dev seed. Remove all investment, HSA, property accounts and liabilities from seed.
7. **DB**: We need a new `balance_updates` table to track balance changes over time. The existing `balanceHistory` table is tied to check-ins, so we create a standalone update log.

## Implementation Plan

### Phase 1: Database Changes
1. Create `balance_updates` table in schema:
   - `id` (uuid PK)
   - `account_id` (FK to accounts, CASCADE)
   - `previous_balance` (numeric 14,2)
   - `new_balance` (numeric 14,2)
   - `change_amount` (numeric 14,2) - computed: new - previous
   - `note` (text, nullable) - optional note about why the balance changed
   - `created_at` (timestamp)
2. Create migration `0011_simple_account_asset_type.sql`
3. Update `account_type` enum: keep as-is in DB (backward compatible), but only expose "simple" in UI. Actually, we should add "simple" to the enum. The DB enum needs a new value.

### Phase 2: Type & Schema Updates
1. Add `"simple"` to `accountTypeEnum` in schema
2. Add `"simple"` to `AssetType` union type
3. Add `BalanceUpdate` interface to types
4. Export the new table from db package

### Phase 3: API Routes
1. `GET /api/assets/[id]/history` - Fetch balance update history for an asset
2. `POST /api/assets/[id]/history` - Create a balance update entry (also updates the account balance)
3. Existing asset CRUD routes stay the same

### Phase 4: Assets List Page Rewrite
1. Remove all investment-specific UI (projection period selector, return rates, contribution info)
2. Simplify the "Add Asset" modal:
   - Asset name input
   - Type picker (card-based, only "Simple Account" for now)
   - Current balance input
   - Notes textarea
3. Asset cards: show type icon, name, balance, notes preview, creation date
4. Keep empty state, loading state, delete confirmation

### Phase 5: Asset Detail Page Rewrite
1. Header: back button, asset name, type badge, edit/delete actions
2. Large clickable balance display at top (math expression support like tracker: +100, -50, etc.)
3. Balance history chart (recharts AreaChart) showing balance over time
4. Update history table showing date, previous balance, new balance, change, note
5. Notes section
6. Edit modal (name, notes only; balance updates go through the inline editor)
7. Delete confirmation

### Phase 6: Seed Data Rework
1. Remove all investment, HSA, property accounts
2. Remove all liabilities (debts) since those are separate
3. Create simple account demo assets: "Chase Checking" ($8,500), "Emergency Fund" ($24,000), "Cash Reserve" ($3,200)
4. Create balance update history entries for each demo account (several months of updates)
5. Update net worth categories to match the simplified assets

## Edge Cases
- Editing balance to the same value: should still create a history entry (balance confirmed)
- Deleting an asset cascades to its balance updates
- Math expressions in balance editor: +100, -50, *2, /4 applied against current balance
- Empty balance history: chart shows single point at current value
- Currency formatting consistency throughout

## Test Steps
1. Navigate to `/assets` page
2. Click "Add Asset" button
3. Verify type picker shows only "Simple Account" with icon and description
4. Enter name, balance, and optional notes
5. Click "Add Asset" to create
6. Verify the asset appears in the grid with correct info
7. Click into the asset detail page
8. Verify large balance display at top
9. Click the balance and update it (try math expressions like +500)
10. Verify the history table shows the update
11. Verify the chart updates with the new data point
12. Edit the asset name/notes via edit button
13. Delete the asset and verify redirect to list
14. Run `npm run db:seed:dev` and verify only simple accounts appear
