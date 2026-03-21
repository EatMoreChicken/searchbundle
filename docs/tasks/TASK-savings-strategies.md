---
name: savings-strategies
description: Added multiple savings strategy options to onboarding wizard
status: completed
---

# TASK: Savings Strategy Options for Onboarding

## Description

Add multiple investment savings strategies to the onboarding wizard, replacing the current flat "save X per month forever" approach. Users choose from five strategies ordered from most to least optimal, each with a description, preview chart, and example monthly savings. After choosing, they enter a full-page configurator with strategy-specific sliders, a dual-axis chart (portfolio growth + monthly contribution), live summary numbers, and reset functionality.

## Motivation

The current onboarding calculates a single flat monthly savings amount using the PMT formula. Overwhelmingly, people try to front-load their savings because early compounding does most of the work. By offering multiple strategies (Front-Loaded, Coast FIRE, Barista FIRE, Traditional, Back-Loaded), users can pick the approach that fits their situation and see exactly how their contribution schedule and portfolio growth will look.

## Critical Decisions

1. **Five strategies** ordered best-to-worst: Front-Loaded, Coast FIRE, Barista FIRE, Traditional, Back-Loaded
2. **Wizard expands from 3 steps to 4**: Age, Income Target, Strategy Selection, Strategy Configurator
3. **Strategy selection** (Step 3) shows large cards with mini charts and example numbers
4. **Strategy configurator** (Step 4) is the same page layout for all strategies but renders different sliders/inputs and different chart starting states
5. **All calculations are live**: chart and summary numbers update instantly as sliders move
6. **Target amount is adjustable** on the configurator step (carried from Step 2)
7. **Reset functionality**: global reset button plus individual section resets
8. **Back button** from configurator returns to strategy selection; re-selecting a strategy resets to that strategy's defaults
9. **Strategy parameters stored in DB** as nullable columns on `retirement_targets`
10. **Calculation engine** uses month-by-month simulation with binary search to solve for starting contributions

## Strategy Definitions

### 1. Front-Loaded (Recommended)
- **Concept**: Higher contributions early, tapering down each year
- **Parameters**: Starting monthly amount (auto-solved), annual decrease rate (default 5%)
- **Math**: Year y contribution = starting * (1 - decrease_rate)^y. Binary search for starting amount so total portfolio reaches target.
- **Chart**: Declining step contribution line, steep exponential portfolio growth

### 2. Coast FIRE
- **Concept**: Save aggressively for a set period, then stop entirely. Let compound growth reach the target.
- **Parameters**: Phase 1 duration (default min(10, years/2)), phase 1 monthly (auto-solved)
- **Math**: Coast number = target / (1 + return)^remaining_years_after_phase1. Solve for monthly to reach coast number in phase 1 duration.
- **Chart**: Flat high contributions for phase 1, drops to $0, portfolio continues growing

### 3. Barista FIRE
- **Concept**: Save aggressively initially, then switch to smaller contributions (e.g., part-time work income)
- **Parameters**: Phase 1 duration (default min(10, years/2)), phase 1 monthly (auto-solved), phase 2 monthly (default 25% of traditional PMT)
- **Math**: Phase 2 FV calculated from reduced contributions. Phase 1 target = (total_target - phase2_FV) / (1+r)^phase2_years. Solve for phase 1 monthly.
- **Chart**: High contributions then step down to lower contributions

### 4. Traditional
- **Concept**: Same flat amount every month (current behavior)
- **Parameters**: Monthly amount (PMT formula)
- **Math**: PMT = target * r / ((1+r)^n - 1)
- **Chart**: Flat contribution line, exponential portfolio growth

### 5. Back-Loaded
- **Concept**: Start with smaller amounts, increase each year. For early-career or income-constrained savers.
- **Parameters**: Starting monthly (auto-solved), annual increase rate (default 5%)
- **Math**: Year y contribution = starting * (1 + increase_rate)^y. Binary search for starting amount.
- **Chart**: Rising step contribution line, slower initial growth

## Implementation Steps

### Phase 1: Calculation Engine
Create `apps/web/src/lib/retirement-strategies.ts` with pure functions:
- `simulateGrowth()`: month-by-month portfolio simulation given a contribution function
- `solveStartingContribution()`: binary search for starting amount given strategy + target
- `generateSchedule()`: returns year-by-year data for chart (portfolio value + monthly contribution)
- Default parameter calculators for each strategy
- Strategy metadata (name, description, icon, etc.)

### Phase 2: DB Schema Changes
- Add `savings_strategy` enum: `traditional`, `front_loaded`, `coast_fire`, `barista_fire`, `back_loaded`
- Add columns to `retirement_targets`:
  - `savings_strategy` (enum, default 'traditional')
  - `strategy_phase1_monthly` (numeric 14,2, nullable)
  - `strategy_phase1_years` (integer, nullable)
  - `strategy_phase2_monthly` (numeric 14,2, nullable)
  - `strategy_annual_change_rate` (numeric 5,4, nullable)
- Create migration `0009_savings_strategies.sql`

### Phase 3: Types + API
- Add `SavingsStrategy` type to `types/index.ts`
- Update `RetirementTarget` interface with new fields
- Update `PUT /api/retirement-target` to accept and validate new fields
- Update `GET` to return new fields

### Phase 4: Strategy Selection (Step 3)
Create `apps/web/src/components/StrategySelection.tsx`:
- 5 large strategy cards arranged vertically (best to worst)
- Each card: icon, title, subtitle, 1-2 sentence description, "Best for" tag
- Mini sparkline chart showing contribution pattern + portfolio growth shape
- Example first-year monthly savings amount
- Note at top: "This is just a starting point. You'll customize everything on the next page."

### Phase 5: Strategy Configurator (Step 4)
Create `apps/web/src/components/StrategyConfigurator.tsx`:
- Left panel: Strategy-specific sliders and inputs
  - Target amount (adjustable, from Step 2)
  - Strategy-specific controls (see Strategy Definitions above)
  - Expected return slider
  - Inflation rate slider
- Right panel: Dual-axis recharts ComposedChart
  - Area: portfolio value over time (primary color)
  - Line/Step: monthly contribution over time (tertiary color)
  - Tooltip with detailed numbers
- Bottom: Live summary panel (portfolio target, years remaining, first-year monthly, last-year monthly)
- Reset to defaults button (global)
- Individual reset buttons on slider sections

### Phase 6: Wire Up Onboarding Wizard
- Update OnboardingWizard.tsx:
  - Add Step 3 (StrategySelection) and Step 4 (StrategyConfigurator)
  - StepIndicator now shows 4 steps
  - State management for strategy selection + parameters
  - Save includes strategy data
  - Back from Step 4 resets to strategy defaults when re-selecting
- Update step 3 summary to become step 4 configurator (summary merged into configurator)

### Phase 7: Update Dashboard
- Show savings strategy name in the static summary card
- Edit mode can trigger strategy change (link back to selection or inline)

## Test Steps

1. **Fresh user onboarding**: Sign in as a new user (no DOB/retirement age). Verify wizard shows 4 steps.
2. **Step 1 & 2**: Complete age and income target as before.
3. **Strategy selection (Step 3)**: Verify 5 strategy cards display with mini charts, descriptions, and example numbers. Verify cards are ordered: Front-Loaded, Coast FIRE, Barista FIRE, Traditional, Back-Loaded.
4. **Select a strategy**: Click "Front-Loaded" card, verify proceed to configurator.
5. **Configurator (Step 4)**: Verify strategy-specific sliders appear. Verify chart shows dual-axis (portfolio + contributions). Verify summary numbers update live as sliders are adjusted.
6. **Reset**: Click "Reset to defaults". Verify all sliders and inputs return to calculated defaults.
7. **Back navigation**: Click Back. Verify returned to strategy selection. Select a different strategy. Verify configurator resets to new strategy defaults.
8. **Save**: Complete wizard by clicking "Get Started". Verify data saved to DB including strategy fields.
9. **Dashboard**: After onboarding, verify dashboard shows strategy info in summary card.
10. **Existing users**: Existing users with retirement targets should see "Traditional" strategy by default (backward compatible).
