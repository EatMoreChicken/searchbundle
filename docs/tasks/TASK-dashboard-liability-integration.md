---
status: completed
---

# TASK: Dashboard Liability Integration

## Description

Integrate liabilities (debts) into the dashboard's "single pane of glass" view. Users need to see how their debts affect their overall financial picture alongside assets. The dashboard should show net worth (assets minus liabilities), with clear visual separation so users can see what assets contribute vs. what liabilities drag down.

## Motivation

The dashboard currently shows only assets vs. the savings plan. A complete financial picture requires showing liabilities too: net worth = assets - liabilities. Users need visual clarity on whether their growing assets are being offset by outstanding debts.

## Key Decisions

1. **Net Worth focus**: The hero metric and chart should emphasize net worth (assets - liabilities), not just total assets.
2. **Visual separation on chart**: Use stacked/layered areas so users can visually distinguish asset contribution from liability impact. Net worth is the gap between the two.
3. **Liability projection logic**:
   - **Simple debts** (no interest, no payment schedule): Assume flat balance (user pays off manually).
   - **Debts with interest + minimumPayment**: Project payoff month by month via amortization until $0.
   - Debts don't compound upward; they decrease via payments or stay flat.
4. **Metrics strip**: Expand from 5 to 7 tiles. Add Net Worth and Total Liabilities. Keep Total Assets.
5. **On-track badge**: Compare net worth (assets - liabilities) vs. plan target, not just assets alone.
6. **Liability cards section**: Mirror asset cards with type-specific icons, balance, interest rate.

## Implementation Plan

### Phase 1: Extend asset-projections.ts for Liabilities

- Add `DebtProjectionResult` interface
- Add `projectDebt()`: simple debts stay flat; debts with `minimumPayment` + `interestRate` use amortization
- Add `mergeDebtProjections()` to sum all debts by year
- Extend `DashboardChartPoint` with `liabilityTotal` and `netWorth`
- Update `buildDashboardChartData()` to accept liability data
- Update `calculateOnTrackStatus()` to use net worth instead of assets alone

### Phase 2: Update Dashboard Data Fetching

- Fetch `GET /api/liabilities` + `GET /api/liabilities/[id]/history` per debt
- Add `DebtWithDetails` interface

### Phase 3: Update Dashboard Chart

- Keep plan area (teal gradient)
- Asset projection as green area above zero
- Liability projection as red/warm area
- Net worth as primary line (assets - liabilities)
- Enhanced tooltip: Plan, Net Worth, Assets, Liabilities
- Updated legend

### Phase 4: Update Metrics Strip + Cards

- 7-tile metrics grid: Target, Target Age, Monthly, Annual, Net Worth, Total Assets, Total Liabilities
- Liability cards section below asset cards

### Phase 5: Edge Cases

- 0 liabilities: liability line absent, works same as before
- 0 assets + liabilities: negative net worth shown
- Simple debt: flat projection
- Debt at $0 balance: skip projection
- Mortgage with homeValue: liability is the debt balance (not net equity)

## Test Steps

1. Sign in with `dev@searchbundle.io` / `password123`
2. Dashboard loads with both assets AND liabilities data
3. Metrics strip shows 7 tiles including Net Worth, Total Assets, Total Liabilities
4. Hero chart shows plan area, asset projection, liability projection, and net worth line
5. Chart tooltip shows Plan, Net Worth, Assets, Liabilities at each age
6. Liability cards section appears below asset cards (4 seeded liabilities)
7. On-track badge reflects net worth vs. plan
8. Time window controls apply to liability data
9. Full Plan view shows liabilities decreasing over time as debts pay off
10. If all liabilities deleted, dashboard reverts to asset-only behavior
