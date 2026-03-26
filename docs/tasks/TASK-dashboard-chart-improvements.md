---
name: dashboard-chart-improvements
description: Improve dashboard savings trajectory chart with aggregated/detailed view toggle, flexible year range dropdown, inflation removal, liability line fix, better legend, and visual design improvements.
status: completed
---

# TASK: Dashboard Chart & Visual Improvements

## Description

Improve the dashboard savings trajectory chart for clarity, usability, and visual appeal. Address chart clutter, legend readability, liability line behavior, time window controls, inflation removal, and overall dashboard design.

## Motivation

The current dashboard chart is functional but cluttered. Too many overlapping lines confuse users, the legend is hard to read (black on dark background), liabilities continue as a flat line after payoff, and the time window controls need more flexibility. The dashboard also feels monotonous and needs visual variety to break up repetitive card layouts.

## Key Decisions

1. **Aggregated default view**: Default chart shows only Net Worth line + Plan area. Users toggle to "Detailed" to see split asset/liability lines. Tooltip always shows breakdown.
2. **Flexible time ranges**: Replace the static "15 Years" button with a dropdown offering 5/10/15/20/25 year options.
3. **Liability line stops at zero**: Once all debts are projected to be paid off, the liability line should stop rendering (no flat red line at $0).
4. **Remove inflation**: Remove the 3% inflation adjustment from all dashboard calculations for now. Show raw nominal dollars.
5. **Better legend**: Use colored dots (not thin lines) with clearer contrast. The "Net Worth" indicator should have a visible colored dot, not a black line that blends with text.
6. **Chart header clipping**: Increase top margin so "Today" and "Retire XX" labels are not cut off.
7. **Dashboard visual variety**: Add gradient hero section, visual icon decorations to section headers, and subtle graphic touches to break monotony.

## Implementation Plan

### Phase 1: Remove Inflation Adjustments
- Remove `INFLATION_RATE` constant usage from savedSummary computation
- Pass raw `target.targetAmount` instead of `inflAdjTarget` to `getExtendedSchedule`
- Update monthly savings calculation to use raw target
- Remove inflation disclaimer from chart legend
- Keep INFLATION_RATE constant and edit-mode inflation calculations for future re-enablement

### Phase 2: Time Window Dropdown
- Replace `TIME_WINDOWS` array with: Focused, dropdown (5/10/15/20/25 years), Full Plan
- Change TimeWindow type to support numeric year values
- Update visibleChartData filtering for custom year range
- Style dropdown to match pill selector design

### Phase 3: Chart Visual Fixes
- Increase top margin to prevent label clipping (top: 10 -> 30)
- Stop liability line at $0: set `liabilityTotal` to `null` once all debts are zero
- Improve legend: use dots instead of thin lines, use a visible accent color for Net Worth indicator
- Style chart lines: make plan line solid and thicker, make net worth line use primary color instead of black, use dashed for projection lines

### Phase 4: Aggregated vs Detailed View Toggle
- Add `chartMode` state: "summary" (default) and "detailed"
- Summary mode: only renders Plan area + Net Worth line
- Detailed mode: renders all 4 series (plan, assets, liabilities, net worth)
- Tooltip always shows full breakdown regardless of mode
- Toggle button next to time window controls

### Phase 5: Dashboard Visual Improvements
- Add a gradient banner/hero accent to the header area
- Add decorative elements to section headers
- Improve visual hierarchy with subtle background treatments

## Test Steps

1. Load dashboard with dev user (dev@searchbundle.io / password123)
2. Verify chart default view shows only Plan + Net Worth (summary mode)
3. Toggle to "Detailed" view and verify assets, liabilities, net worth, and plan all appear
4. Hover chart: tooltip should show breakdown in both modes
5. Check liability line stops rendering when debts reach $0
6. Verify "Today" and "Retire XX" labels are NOT clipped
7. Test time range dropdown: select 5, 10, 15, 20, 25 year options
8. Verify Full Plan view extends to projectionEndAge
9. Confirm no inflation text in legend, numbers are nominal
10. Check legend uses colored dots and Net Worth is clearly visible
11. Verify dashboard has visual variety (gradients, decorative elements)
