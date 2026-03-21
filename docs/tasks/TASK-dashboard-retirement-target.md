# TASK: Dashboard — Onboarding & Retirement Target

## Description

Rebuild the `/dashboard` page from its current "Coming Soon" placeholder into the primary financial overview page. The dashboard has two main sections:

1. **Personal Onboarding Card** — A one-time setup flow prompting the user to enter their birthday and target retirement age. Once saved (via the existing `/api/users/me` PATCH endpoint), this card collapses and does not show again. Users can edit these values later from `/settings`.

2. **Financial Independence Target** — A guided configurator where the user defines their long-term savings goal. Two input modes:
   - **Fixed Amount**: "I want $X by age Y"
   - **Income Replacement**: "I want $X/year in retirement income by age Y, using a Z% safe withdrawal rate"
   The Income Replacement mode auto-calculates the required portfolio size (e.g., $100k/year at 4% SWR = $2.5M target). An optional inflation adjustment lets the user account for the time value of money.

   As the user enters values, a live summary panel shows:
   - Target portfolio size
   - Years until target age
   - Required monthly savings (assuming a configurable expected annual return)
   - Required annual savings

   Once saved, the configurator collapses into a static summary card with an Edit button.

## Motivation

The user is transitioning from mockups/prototyping to real features. The dashboard is the first screen users see after sign-in and should immediately guide them through essential setup. This replaces the "Coming Soon" placeholder.

## Critical Decisions

- **Naming**: The feature is called **"Financial Independence Target"** (not "savings target" or "retirement goal") — it's aspirational and precise.
- **Personal onboarding** reuses existing `users` table fields (`dateOfBirth`, `retirementAge`) and existing API (`PATCH /api/users/me`). No new DB columns needed for this part.
- **Financial Independence Target** data lives in a new `retirement_targets` table scoped to households (not users), since household-level financial planning is the app pattern.
- **Seed data cleanup**: Remove all accounts, debts, and their net worth categories from seed. Keep only users, households, memberships. The `Joint Savings` account stays as a lone example with minimal data.
- **Two calculation modes**:
  - Fixed: User enters total target amount and target age directly.
  - Income Replacement: User enters desired annual income, safe withdrawal rate (default 4%), and target age. Portfolio = annualIncome / withdrawalRate.
- **Inflation adjustment**: Optional toggle. When enabled, the target amount is inflation-adjusted from today to the target year using a configurable inflation rate (default 3%).
- **Live summary math**: Uses compound interest formula to calculate required monthly contribution: `PMT = FV × r / ((1 + r)^n − 1)` where r = monthly rate, n = months, FV = target amount.
- **Expected return rate**: Default 7% (historical stock market average net of inflation). User can adjust.

## DB Schema — `retirement_targets`

```sql
CREATE TABLE retirement_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'fixed',          -- 'fixed' | 'income_replacement'
  target_amount NUMERIC(15,2) NOT NULL,        -- final portfolio target (computed for income_replacement)
  target_age INTEGER NOT NULL,                 -- age at which user wants to hit the target
  annual_income NUMERIC(15,2),                 -- only for income_replacement mode
  withdrawal_rate NUMERIC(5,4) DEFAULT '0.04', -- only for income_replacement mode (e.g., 0.04 = 4%)
  expected_return NUMERIC(5,4) DEFAULT '0.07', -- expected annual return for projections
  inflation_rate NUMERIC(5,4) DEFAULT '0.03',  -- inflation rate for adjustment
  include_inflation BOOLEAN DEFAULT false,     -- whether to inflation-adjust the target
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(household_id)                         -- one target per household
);
```

## Implementation Steps

### Phase 1: Seed Data Cleanup
- Remove all sample accounts, debts, and net worth categories/entries from seed.ts
- Keep only: users (dev, partner, friend), households, memberships
- Keep the `Joint Savings` account as one example asset
- Remove associated constants for deleted assets/debts

### Phase 2: DB Schema + Migration
- Add `retirementTargets` table to `packages/db/src/schema.ts`
- Add `targetModeEnum` pgEnum with values `['fixed', 'income_replacement']`
- Export the new table from `packages/db/src/index.ts`
- Generate migration `0008_retirement_targets.sql`
- Add TypeScript type `RetirementTarget` to `apps/web/src/types/index.ts`

### Phase 3: API Routes
- `GET /api/retirement-target` — fetch household's retirement target (or null)
- `PUT /api/retirement-target` — upsert (create or update) the household's target
- Both routes use `getHouseholdSession()` for auth + household scoping

### Phase 4: Dashboard UI

#### Layout
```
/dashboard
├── Page Header ("Dashboard" overline + greeting)
├── [Onboarding Card] — shown only if user.dateOfBirth or user.retirementAge is missing
│   ├── Birthday input
│   ├── Retirement age input
│   └── Save button → PATCH /api/users/me → hide card
├── [Financial Independence Target]
│   ├── IF no target saved:
│   │   ├── Mode selector (Fixed Amount / Income Replacement)
│   │   ├── Input fields based on mode
│   │   ├── Live Summary Panel (calculated values)
│   │   └── Save button → PUT /api/retirement-target
│   └── IF target exists:
│       ├── Static summary card with key numbers
│       └── Edit button → re-opens configurator
```

#### Onboarding Card
- Soft gradient background (tertiary-fixed tones)
- Icon: `person` or `cake`
- Fields: date of birth (date input), retirement age (number input, 20-100 range)
- On save: PATCH /api/users/me, then hide the card (check fetched user data)

#### Financial Independence Target Configurator
- Section with radio/toggle for mode selection
- **Fixed Amount mode**: target amount ($), target age
- **Income Replacement mode**: desired annual income ($), safe withdrawal rate (%, default 4), target age
- Both modes: expected annual return (%, default 7), inflation toggle + rate (%, default 3)
- **Live Summary Panel** (right side or below on mobile):
  - Target portfolio: formatted currency
  - Years remaining: targetAge - currentAge
  - Monthly savings needed: using PMT formula
  - Annual savings needed: monthly × 12

#### Summary Card (after save)
- Displayed when target exists and user is not editing
- Shows: mode label, target amount, target age, monthly savings needed
- Edit button to re-enter configurator

### Phase 5: Documentation Updates
- Update copilot-instructions.md with dashboard section
- Update README if needed

## Financial Math

### Portfolio Target (Income Replacement)
```
portfolioTarget = annualIncome / withdrawalRate
```
Example: $100k/year ÷ 0.04 = $2,500,000

### Inflation Adjustment
```
inflationAdjustedTarget = portfolioTarget × (1 + inflationRate) ^ yearsUntilTarget
```
Example: $2.5M × (1.03)^30 = $6,068,392

### Required Monthly Savings (Future Value of Annuity)
```
r = expectedReturn / 12    (monthly rate)
n = yearsUntilTarget × 12  (total months)
monthlySavings = targetAmount × r / ((1 + r)^n − 1)
```
Example: $2.5M target, 7% return, 30 years:
r = 0.07/12 = 0.00583, n = 360
monthly = $2,500,000 × 0.00583 / ((1.00583)^360 − 1) = ~$2,047/mo

## Edge Cases

| Case | Handling |
|---|---|
| User already has dateOfBirth + retirementAge | Onboarding card is hidden |
| No active household | API returns 403, UI shows error state |
| Target age ≤ current age | Disable save, show inline validation |
| Withdrawal rate = 0 | Prevent division by zero, minimum 0.5% |
| Expected return = 0 | Monthly savings = target / months (no compounding) |
| Very large target amounts | Format with abbreviations ($2.5M) for summary |

## Test Steps

1. **Seed cleanup**: Run `npm run db:seed` — verify only Joint Savings account exists, no debts, no extra net worth categories
2. **Onboarding card**: Navigate to `/dashboard` with a fresh user (no dateOfBirth/retirementAge) — card should appear. Enter birthday and retirement age, save — card disappears
3. **Onboarding persistence**: Refresh page — onboarding card should not reappear
4. **Target configurator (Fixed)**: Select "Fixed Amount", enter $2,000,000 target at age 60. Verify live summary shows monthly/annual savings needed
5. **Target configurator (Income Replacement)**: Switch to "Income Replacement", enter $100,000/year at 4% SWR, age 65. Verify portfolio auto-calculates to $2,500,000
6. **Inflation toggle**: Enable inflation adjustment — verify target amount increases
7. **Save target**: Click save — configurator collapses to summary card
8. **Edit target**: Click Edit on summary card — configurator reopens with saved values
9. **Settings still work**: Verify birthday/retirement age updates in `/settings` are reflected on dashboard
