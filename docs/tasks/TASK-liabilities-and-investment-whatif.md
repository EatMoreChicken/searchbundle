# TASK: Liabilities Feature + Investment What-If Tools

**Status: Complete**

## Description

Implement the full liabilities feature (mortgage and car loan types) and enhance the existing investment asset detail page with what-if scenario tools.

## Motivation

Users need to track their debts (mortgages, car loans) with the same polish as assets. They should see amortization schedules, payoff projections, and be able to play with scenarios (extra monthly payments, extra yearly payments, lump sums) to see how they affect payoff time and total interest. They should be able to save scenarios for later review. The same what-if tooling should extend to investment assets.

## Critical Decisions

- **Liabilities** use the existing `debts` DB table. We add new columns for mortgage/car-specific fields (escrow, remaining months).
- Mortgage-specific fields: `escrowAmount` (taxes+insurance), `remainingMonths`
- Car loan uses the same base fields (balance, interest rate, monthly payment, remaining months)
- What-if scenarios are stored in a new `scenarios` DB table linked to either a debt or an account
- Scenarios store: extra monthly payment, extra yearly payment, lump sum amount, and a name
- Uses same styling/aesthetics as the assets pages (teal accent, same card patterns, same fonts)
- Amortization chart uses recharts (already installed, same as investment projection chart)

## Implementation Plan

### Phase 1: Database & API

1. **Update DB schema** (`packages/db/src/schema.ts`)
   - Add `escrowAmount`, `remainingMonths` columns to `debts` table
   - Add `scenarios` table: id, userId, debtId (nullable), accountId (nullable), name, extraMonthlyPayment, extraYearlyPayment, lumpSumPayment, savedAt
   
2. **Create migration** for new columns

3. **Create API routes**
   - `POST/GET /api/liabilities` — CRUD for debts
   - `GET/PUT/DELETE /api/liabilities/[id]` — individual debt
   - `POST/GET /api/liabilities/[id]/scenarios` — scenarios for a debt
   - `DELETE /api/liabilities/[id]/scenarios/[scenarioId]` — delete scenario
   - `POST/GET /api/assets/[id]/scenarios` — scenarios for an asset
   - `DELETE /api/assets/[id]/scenarios/[scenarioId]` — delete scenario

### Phase 2: Types & Client

4. **Update TypeScript types** (`apps/web/src/types/index.ts`)
   - Update `Debt` interface with new fields
   - Add `Scenario` interface

### Phase 3: UI Components

5. **Amortization chart component** — shows principal vs interest over loan life
6. **What-if scenario panel** — inputs for extra monthly, extra yearly, lump sum with live calculation
7. **Scenario save/discard controls** — save named scenario, list saved, discard to normal

### Phase 4: Liabilities Pages

8. **Liabilities list page** — grid of liability cards (mirrors assets page)
9. **Liability detail page** — full detail with amortization chart, metrics, what-if tools, saved scenarios
10. **Type-specific rendering** — mortgage shows escrow, car loan shows similar fields

### Phase 5: Investment Enhancement

11. **Investment detail what-if** — add extra one-off contribution, scenario save/discard

## Test Steps

1. Navigate to /liabilities — should show empty state with "Add Liability" button
2. Click "Add Liability" — modal opens with type selector (Mortgage, Auto)
3. Create a mortgage with: name "Home Mortgage", balance $250,000, rate 6.5%, payment $1,580, escrow $450, 348 months remaining
4. Should see the mortgage card on the list page with balance and key info
5. Click into the mortgage — should see amortization chart, key metrics, payoff date
6. Use what-if tools: add $200/month extra payment — chart should update, show months saved and interest saved
7. Add $1,000/year extra payment — should compound with monthly extra
8. Add $5,000 lump sum — should also show impact
9. Save the scenario with a name — should persist
10. Discard scenario — should return to normal payment schedule
11. Load saved scenario — should restore the what-if inputs
12. Create a car loan — similar flow but without escrow
13. Navigate to an investment asset detail page — should have new what-if tools
14. Add one-off extra contribution — chart should update
15. Save/discard investment scenario — should work the same
