---
name: assets-feature
description: Rename accounts→assets and debts→liabilities, add HSA asset type, and implement investment accounts with contribution tracking, return rate projections, and an interactive projection chart.
status: completed
---

# Assets Feature

## Description

Rename the "accounts" concept to "assets" (and "debts" to "liabilities") throughout the app. Add an HSA account type. Build out investment accounts with rich projection capabilities: contributions, return rates, variance ranges, and an interactive chart showing portfolio value over time with optional inflation adjustment.

---

## Motivation

The user's ask:
- "Accounts" isn't the right name — the section houses any asset (savings, investments, HSA, property). Rename to "Assets".
- "Debts" becomes "Liabilities" to match the domain language.
- Investment accounts need specific fields: starting balance, contribution amount & frequency, expected return rate, return rate variance (for range visualization), and an inflation toggle.
- Each investment asset should have a detail view with a projection chart showing value over time with a shaded uncertainty range.
- The main assets list page should show a period dropdown so users can preview projected values (e.g., "in 1 year" / "in 3 years") on each card.

---

## Critical Decisions

- **DB tables stay as `accounts`/`debts` internally.** Only the UI routes and TypeScript types are renamed. The DB column/table names are internal implementation details and don't need expensive migrations to rename.
- **Investment fields are nullable on all asset types.** Only investment-type assets will populate them; the UI conditionally shows these fields.
- **Projection math runs client-side.** No API call needed — all inputs are already stored. The formula FV = PV×(1+r)^n + C×((1+r)^n−1)/r is computed in the browser.
- **Recharts for the chart.** Installed in the web app. Uses `ComposedChart` with stacked Areas (rangeLow transparent + rangeSize teal-light) plus `Line` for expected and inflation-adjusted lines.
- **Inflation rate hardcoded at 3%.** A future enhancement could let users configure this.
- **Contribution frequencies:** weekly, biweekly, monthly, quarterly, yearly.
- **`hsa` added as a new asset type** (alongside investment, savings, property, other).
- **TypeScript type renamed from `Account` → `Asset`** in `apps/web/src/types/index.ts`.

---

## DB Schema Changes

New fields added to the `accounts` table:
- `contribution_amount` — `numeric(14,2)`, nullable
- `contribution_frequency` — new enum `contribution_frequency` ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'), nullable
- `return_rate` — `numeric(6,4)`, nullable (e.g., `10.0000` = 10%)
- `return_rate_variance` — `numeric(6,4)`, nullable, default `'0'`
- `include_inflation` — `boolean`, not null, default `false`

New enum value: `hsa` added to the existing `account_type` enum.

---

## Implementation Plan

### Phase 1 — DB (schema + migration)
1. Update `packages/db/src/schema.ts`:
   - Add `hsa` to `accountTypeEnum`
   - Add `contributionFrequencyEnum`
   - Add five new nullable columns to `accounts` table
2. Create `packages/db/migrations/0002_investment_fields.sql`
3. Run `npm run db:migrate`

### Phase 2 — Types
- Rename `Account` → `Asset` in `apps/web/src/types/index.ts`
- Add `hsa` to type union
- Add new optional/nullable investment fields

### Phase 3 — Rename directories
Using PowerShell:
- `(app)/accounts/` → `(app)/assets/`  (also create `[id]/` subdirectory)
- `(app)/debts/` → `(app)/liabilities/`
- `api/accounts/` → `api/assets/`
- `routes/accounts.ts` → `routes/assets.ts`

### Phase 4 — API routes (Next.js)
Update `apps/web/src/app/api/assets/route.ts` and `[id]/route.ts`:
- Accept and persist new investment fields
- Return them as numbers (parse from DB string)

### Phase 5 — Fastify
- Rename import in `server.ts` → `assetRoutes`, prefix `/api/assets`
- Update `apps/api/src/routes/assets.ts` with new fields

### Phase 6 — Assets list page (rewrite)
`apps/web/src/app/(app)/assets/page.tsx`:
- Period dropdown: "1 Year", "3 Years", "5 Years", "10 Years"
- Investment cards: show projected value in selected period + annual contribution
- Other cards: just balance
- Clicking a card navigates to `/assets/[id]`
- Add/Edit modal with investment-specific section (shown when type = "investment")

### Phase 7 — Asset detail page
`apps/web/src/app/(app)/assets/[id]/page.tsx`:
- Fetch single asset by ID
- Key metrics panel (balance, annual contribution, return rate)
- Time horizon tabs: 1Y, 5Y, 10Y, 20Y, 30Y
- Projection chart (InvestmentProjectionChart)
- Inflation checkbox toggle
- Edit button (opens same modal as list page) — for simplicity, link back to list with edit intent, or open an inline modal

### Phase 8 — InvestmentProjectionChart component
`apps/web/src/components/InvestmentProjectionChart.tsx`:
- Props: balance, contributionAmount, contributionFrequency, returnRate, returnRateVariance, includeInflation, years
- Data generation: `generateProjectionData()` function
- Recharts ComposedChart with:
  - Stacked Areas for the uncertainty range (rangeLow transparent + rangeSize teal-light)
  - Line for expected value (teal)
  - Line for inflation-adjusted value (gray dashed, shown when includeInflation=true)
  - Tooltip with formatted currency values
  - Responsive container

### Phase 9 — Sidebar + debts→liabilities
- Update Sidebar.tsx: `/accounts` → `/assets` (label "Assets"), `/debts` → `/liabilities` (label "Liabilities")
- Update liabilities page: title "Liabilities", overline "Finances"

---

## Projection Formula

```
annualContrib = contributionAmount × frequencyMultiplier[frequency]
  // frequencyMultiplier: weekly=52, biweekly=26, monthly=12, quarterly=4, yearly=1

FV(n years, rate r as decimal):
  if r = 0:  FV = balance + annualContrib × n
  if r > 0:  FV = balance × (1+r)^n + annualContrib × ((1+r)^n − 1) / r

Range:
  rLow = max(0, returnRate − variance) / 100
  rHigh = (returnRate + variance) / 100
  rangeLow = FV(n, rLow)
  rangeHigh = FV(n, rHigh)
  rangeSize = rangeHigh − rangeLow  (stacked on top of rangeLow in chart)

Inflation-adjusted:
  INFLATION = 0.03
  inflAdjusted = FV(n, r) / (1 + INFLATION)^n
```

---

## Edge Cases

- If `returnRate` is null/0, projection is a straight contribution line (no growth curve).
- If `contributionAmount` is null, only compound growth is shown.
- If `returnRateVariance` is 0 or null, no range band is shown.
- Variance cannot exceed returnRate (rLow clamped to 0).
- All monetary values formatted as USD by default (or user's currency setting).

---

## Test Steps

1. **Sidebar rename:** Confirm "Accounts" → "Assets" and "Debts" → "Liabilities" in sidebar.
2. **Assets page loads:** Navigate to `/assets` — existing accounts still appear.
3. **Add investment account:**
   - Click "Add Asset"
   - Set type to "Investment"
   - Fill in: Name = "Fidelity Roth IRA", Balance = 25000, Contribution = 500, Frequency = Monthly, Return Rate = 8, Variance = 2
   - Save — card appears in grid
4. **Card shows projected value:** The card shows "In 1 year: $X" based on the formula.
5. **Period dropdown:** Change from "1 Year" to "5 Years" — projected values on all investment cards update.
6. **Detail view:** Click the card — navigates to `/assets/[id]`
7. **Projection chart:** Chart shows a curve from today's date through the selected horizon with a shaded range band.
8. **Inflation toggle:** Check "Show inflation-adjusted" — a dashed gray line appears on the chart.
9. **Variance range:** The shaded teal area widens as variance increases.
10. **Zero return rate:** Create an asset with no return rate — chart shows a flat contribution line.
11. **Add savings account:** Type = Savings, no investment fields shown — just name/balance/notes.
12. **Add HSA account:** Type = HSA — works the same as savings (no investment fields).
13. **Edit asset:** Edit button on list card and detail page opens pre-populated form.
14. **Delete asset:** Delete confirmation works, asset removed from grid.
15. **Liabilities page:** `/liabilities` loads with "Liabilities" title (previously "Debts").
