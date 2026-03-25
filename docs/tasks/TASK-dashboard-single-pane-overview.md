# TASK: Dashboard Single-Pane Overview

**Status:** Completed

## Description

Overhaul the main dashboard to serve as a "single pane of glass" for the user's entire financial picture. The chart becomes the hero element, showing the savings plan trajectory alongside actual asset progress (simple + investment accounts). Key metrics are surfaced directly on the dashboard. The old "Financial Independence Target" section header/card wrapper is removed: the dashboard itself is the overview.

## Motivation

The current dashboard is narrow (`max-w-3xl`), wastes screen space, and buries key information behind the "Financial Independence Target" header. The chart is zoomed out to show decades and doesn't help users see their immediate progress. Users need to see at a glance whether their actual assets are tracking against their plan.

## Key Decisions

1. **Full-width layout**: Remove `max-w-3xl` constraint. Dashboard uses the full content area.
2. **Chart is the hero**: The savings trajectory chart takes up a large area (~400px height, full width). It becomes the centerpiece.
3. **Zoomed-in view by default**: Instead of showing current age to 100, show a window: 5 years behind + 10 years ahead of current age. Add navigation controls to pan/zoom.
4. **Asset overlay on chart**: Plot actual asset balances (from balance history) on the same chart as the plan line. This lets users see if they're on track.
   - **Simple accounts**: Plot historical balances + linear projection (using planned contributions, no growth).
   - **Investment accounts**: Plot historical balances + compound growth projection (using return rate + contributions).
   - Combined "Actual Total" line that sums all assets.
5. **Key metrics strip**: Extract the 4 summary tiles (Target, Target Age, Monthly, Annual) into a compact strip at the top or directly above/below the chart, removing the "Financial Independence Target" wrapper section.
6. **On-track indicator**: A clear visual signal showing whether the user's actual total is ahead or behind their plan.
7. **Edit target**: Move the edit capability to a settings/pencil icon instead of a dedicated section.
8. **No liabilities for now**: Only assets (simple + investment) are plotted against the plan.

## Implementation Plan

### Phase 1: Data Layer (fetch assets + history + contributions)

The dashboard needs to fetch:
- User profile (existing)
- Retirement target (existing)
- All assets: `GET /api/assets`
- For each asset: balance history `GET /api/assets/[id]/history` and contributions `GET /api/assets/[id]/contributions`

We'll create a single composite fetch that gathers everything needed.

### Phase 2: Asset Projection Logic

Create a utility function in a new file `apps/web/src/lib/asset-projections.ts`:

```typescript
interface AssetTimelinePoint {
  date: Date;
  year: number;
  age: number;
  value: number;
}

interface AssetProjection {
  assetId: string;
  assetName: string;
  assetType: "simple" | "investment";
  historical: AssetTimelinePoint[];  // from balance history
  projected: AssetTimelinePoint[];   // from today forward
}

// For simple accounts: linear projection using monthly contribution sum
// For investment: compound growth using returnRate + contributions
// Returns yearly data points from earliest history to projectionEndAge
```

Logic:
- **Simple account projection**: `balance + monthlyContributions * months` (no growth)
- **Investment projection**: Month-by-month: `balance = balance * (1 + returnRate/12) + monthlyContributions`
- Annualize contributions using the existing FREQ_MULTIPLIER pattern
- Historical data: map balance_updates to timeline points (use createdAt dates)
- Current balance is the "today" anchor point

### Phase 3: Chart Data Merge

Merge the savings plan data (from `getExtendedSchedule`) with asset projections into a unified chart dataset:

```typescript
interface DashboardChartPoint {
  year: number;
  age: number;
  // Plan line (from retirement strategy)
  planValue: number;
  planMonthlyContribution: number;
  // Actual totals
  actualTotal: number | null;        // sum of all asset values (null for future)
  projectedTotal: number | null;     // sum of all projected values (null for past)
  // Per-asset (for tooltips/legend)
  assets: Record<string, number>;
}
```

The chart will show:
- **Plan line**: The savings strategy trajectory (solid teal area, as now)
- **Actual line**: Historical actual total (distinct color, e.g., secondary/mint)
- **Projected line**: From today forward, dashed continuation of actual based on real assets
- **Today marker**: Vertical ReferenceLine at current year

### Phase 4: Dashboard UI Rebuild

Layout:
```
[Greeting + On-Track Badge]  [Key Metrics Strip]   [Edit Icon]
[====================== Hero Chart =======================]
[Chart controls: zoom/pan, legend, time window selector]
[Asset breakdown cards (compact grid)]
```

**Greeting**: Keep "Hey {firstName}" but make it smaller.

**Key Metrics Strip**: Horizontal row of 4 compact metric tiles:
- Portfolio Target | Target Age | Monthly Needed | Annual Needed

**Hero Chart** (~400px, full width):
- Plan trajectory (teal area fill)
- Actual total (secondary mint solid line with dots)
- Projected total from today (secondary mint dashed line)
- "Today" ReferenceLine
- Retirement age ReferenceLine
- Default view: 5 years back, 10 years ahead (with controls)

**Chart Controls**:
- Time window buttons: "5Y" / "15Y" / "All" to adjust zoom
- Legend showing Plan vs Actual vs Projected

**Asset Cards** (below chart):
- Compact card per asset showing name, balance, type icon, and a small trend indicator
- Total assets sum

### Phase 5: On-Track Indicator

Compare actual total assets against the plan value at the current age:
- `ratio = actualTotal / planValueAtCurrentAge`
- If ratio >= 0.95: "On Track" (green)
- If ratio >= 0.80: "Slightly Behind" (amber)
- If ratio < 0.80: "Behind" (red)
- If ratio >= 1.10: "Ahead" (green, different label)
- If no assets: "No data yet" (gray)

### Edge Cases

1. **No assets**: Show plan line only, with a friendly prompt to add assets
2. **No retirement target**: Show prompt to set up a target (link to getting-started or inline)
3. **No balance history**: Use only current balance as single data point for each asset
4. **Assets created at different times**: Each asset starts at its creation date in the historical view
5. **Simple accounts with no contributions**: Flat projection line from current balance
6. **Investment accounts with 0% return rate**: Behaves like simple account
7. **User hasn't completed onboarding**: Redirect to getting-started (existing behavior)
8. **Zero total assets**: Plan line shows alone, gentle CTA to add first asset
9. **Chart zoom**: When zoomed in, plan line should still render correctly for the visible range

## Test Steps

1. Sign in as `dev@searchbundle.io` / `password123`
2. Dashboard should load full-width with the hero chart as the centerpiece
3. Key metrics (Target, Target Age, Monthly, Annual) should be visible in a strip above/below chart
4. Chart should show:
   - Plan trajectory line (teal)
   - Actual asset total line (mint/green) with historical data points
   - Projected continuation (dashed) from today based on asset data
   - "Today" vertical marker
   - Retirement age vertical marker
5. Default zoom should show ~5 years behind and ~10 years ahead of current age
6. Time window controls (5Y/15Y/All) should adjust the visible range
7. On-track indicator should show correct status based on actual vs plan comparison
8. Hovering on chart should show tooltip with plan value, actual value, and per-asset breakdown
9. Asset summary cards below chart should list each asset with balance and type
10. Edit target should open the existing configurator (via icon/button)
11. Works correctly with no assets (shows plan only + CTA)
12. Works correctly with only simple accounts (no investment projections)
13. Works correctly with only investment accounts
