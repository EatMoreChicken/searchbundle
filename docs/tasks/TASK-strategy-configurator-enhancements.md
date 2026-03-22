---
name: strategy-configurator-enhancements
status: completed
---

# Strategy Configurator Enhancements

## Description

A set of UX improvements and bug fixes for the onboarding wizard's "Customize Your Plan" (Step 4) and "Choose Your Savings Path" (Step 3) pages.

## Motivation

After completing the initial savings strategies feature, several UX gaps were identified:
- The configurator has no back button (inconsistent with all other wizard steps)
- Mini charts on strategy selection cards have no hover data
- The projection chart stops at retirement age, giving no visibility into post-retirement growth
- The plan summary lacks purchasing power context (inflation-adjusted values, annual/monthly spending)
- Users cannot adjust retirement age directly from the chart
- Saving the wizard produces a 500 error because `emitConfig` is defined but never called, so strategy config is always `null`

## Critical Decisions

- The chart will extend to age 100, with a vertical retirement-age marker that is draggable
- Post-retirement data uses 0 contributions and continues compound growth at the same return rate
- Purchasing power details are in a collapsible section to avoid overwhelming new users
- The draggable retirement age changes the `retirementAge` prop via a new `onRetirementAgeChange` callback
- The back button on Step 4 goes to Step 2 (strategy selection), same as "Change Strategy"

## Implementation Plan

### Phase 1: Bug fix (500 error on save)

**Root cause:** `emitConfig` in StrategyConfigurator is defined but never called. The parent's `strategyConfig` state stays `null`, so `handleComplete` sends null values for all strategy fields.

**Fix:** Call `emitConfig()` inside a `useEffect` that fires whenever the strategy config values change. This keeps the parent in sync at all times.

```tsx
// In StrategyConfigurator, after the emitConfig definition:
useEffect(() => {
  emitConfig();
}, [emitConfig]);
```

Also propagate `localAnnualReturn` and `localInflationRate` back to the parent so the save uses the user-adjusted values. Add two new optional callbacks: `onAnnualReturnChange` and `onInflationRateChange`.

### Phase 2: Back button on Step 4

Change the back button condition from `step > 0 && step < 3` to `step > 0`. This shows the back button on all steps except Step 0.

### Phase 3: Chart hover tooltips on strategy selection cards (Step 3)

The mini charts use `MiniChartDual` (two overlapping AreaChart/LineChart) with no Tooltip. Since these are normalized stylized data (not real values), the tooltip should show the strategy's characteristic behavior qualitatively, using the `getStrategySummary` data for real monthly amounts at the selected point.

Replace `MiniChartDual` with a `ComposedChart` approach that supports Recharts `Tooltip`. Show normalized percentage through time and the real contribution value at that point.

### Phase 4: Extend chart to age 100 with retirement marker

**Changes to retirement-strategies.ts:**
- Add a new exported function `getExtendedSchedule()` that generates data from current age to 100, where post-retirement years have $0 contributions and portfolio grows at compound interest only.

**Changes to StrategyConfigurator.tsx:**
- Use `getExtendedSchedule()` instead of `getScheduleWithOverride()`
- Add a Recharts `ReferenceLine` at the retirement age with a label

### Phase 5: Purchasing power details (collapsible section)

Add a collapsible "Purchasing Power Details" section below the Plan Summary tiles. Contents:
- Projected total at retirement (nominal)
- Today's dollars equivalent (deflated by inflation)
- Annual withdrawal amount (nominal and today's dollars)
- Monthly withdrawal amount (nominal and today's dollars)
- Uses withdrawal rate from the parent props

### Phase 6: Draggable retirement age on chart

Use Recharts `ReferenceLine` as the visual marker plus mouse event handlers on the chart container:
- `onMouseDown` on the reference line starts a drag
- `onMouseMove` computes the new age from the mouse X position relative to the chart
- `onMouseUp` commits the new retirement age
- Visual feedback: the line changes color/thickness during drag, cursor changes to `ew-resize`
- A new callback `onRetirementAgeChange` propagates the change to the parent (OnboardingWizard), which updates `retirementAge` state and recalculates `years`

### Phase 7: Wire retirement age changes back to parent

Add `onRetirementAgeChange` prop to StrategyConfigurator. In OnboardingWizard, update `retirementAge` state and derived `yearsRemaining` when this fires.

## Edge Cases

- Dragging retirement age below current age + 2: clamp to minimum
- Dragging retirement age above 99: clamp to 99
- If retirement age changes, strategy params and auto monthly need to recalculate
- Post-retirement portfolio can theoretically decline if withdrawal rate exceeds return rate (not modeled here since we only show growth)
- Inflation-adjusted values should never show negative purchasing power

## Test Steps

1. **Back button**: On Step 4 (Customize), verify a "Back" button appears in the bottom navigation. Click it and confirm it goes to Step 3 (Strategy Selection).
2. **Chart hover (Step 3)**: Hover over any mini chart on a strategy card. Verify a tooltip appears showing portfolio and contribution data.
3. **Extended chart**: On Step 4, confirm the chart X-axis extends to age 100. Verify a vertical line marks the retirement age.
4. **Purchasing power**: On Step 4 in Plan Summary, click "See purchasing power details". Verify it expands to show inflation-adjusted values, annual/monthly withdrawal in both nominal and today's dollars.
5. **Draggable retirement age**: On the chart, hover over the retirement age line and confirm the cursor changes to `ew-resize`. Click and drag left/right. Verify the retirement age updates, the chart recalculates, and the Plan Summary refreshes.
6. **Save (no 500 error)**: Complete the wizard and click "Get Started". Verify it saves successfully with no errors and redirects to the dashboard.
7. **Verify saved data**: After saving, refresh the page. Confirm the dashboard shows the correct strategy, contribution amounts, and retirement target.
