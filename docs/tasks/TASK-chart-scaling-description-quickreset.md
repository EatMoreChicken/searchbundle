# Chart Scaling, Description Placement, Quick-Reset Seed

**Status: Completed**

## Description

Three improvements:

1. **Chart x-axis scaling fix**: The combined history+projection chart for investment accounts uses sequential integer indices for both history points and projection years. When the user has many closely-spaced history entries (e.g., 15 monthly updates over ~1 year) followed by 30 years of projection, the history portion is compressed into a tiny sliver on the left while the projection dominates. Fix: normalize history to occupy a proportional visual space, using a time-based x-axis where history dates map to actual year offsets and projection years continue from "year 0" (today).

2. **Move asset description up**: The "Description" section (asset.notes) is at the very bottom of the page, below the Activity Timeline. Move it directly below the balance amount in the header section, before the Quick Stats grid.

3. **Quick-reset seed**: The current `db:reset` wipes everything including onboarding data, forcing the user through the Getting Started wizard each time. Add a `db:reset:quick` command that seeds a pre-configured user with completed onboarding (dateOfBirth, retirementAge, retirement target with savings strategy) plus sample investment and simple accounts.

## Motivation

- The chart spike is visually misleading: users see a flat line then a steep ramp because the x-axis treats 15 historical data points and 30 projected years as equally weighted.
- The description is important context that should be visible near the top, not buried at the bottom.
- Developers testing the app waste time going through the onboarding wizard after every database reset.

## Key Design Decisions

### Chart scaling approach
Instead of sequential integer x-values, use a **time-based numeric x-axis in fractional years**:
- History points: calculate year offset from earliest data point (e.g., Jan 2025 = 0.0, Jul 2025 = 0.5, Mar 2026 = 1.17)
- Bridge point (today) gets its actual year offset
- Projection points continue from bridge year: bridge + 1, bridge + 2, etc.
- This means if the user has 1.2 years of history and 30 years of projection, the history takes up ~4% of the chart width, which is a realistic proportion
- Alternative: Compress history into a fixed proportion (e.g., 20% of chart width) regardless of actual time span. This stretches history but keeps it readable.
- **Chosen approach**: Use real time-based x-values. The history portion will be small if there's little history, but the visual transition is smooth and honest. Add tick labels showing actual years.

### Description placement
Move the `{asset.notes && ...}` block from after the Activity Timeline to right after the balance button / before Quick Stats. Style it inline with the header section rather than as a separate card.

### Quick-reset seed
- New file: `packages/db/src/seed-dev-quick.ts`
- Reuses the same fixed UUIDs as seed-dev
- Seeds: users, household, user profile fields (dateOfBirth, retirementAge, projectionEndAge), a retirement target with traditional strategy, one simple account (Chase Checking) with some history, one investment account (Vanguard 401(k)) with history and contributions
- Does NOT seed: net worth tracker data, extra accounts, extensive notes
- New npm scripts: `db:seed:quick` in packages/db, `db:seed:quick` and `db:reset:quick` in root

## Implementation Plan

### Phase 1: Chart x-axis scaling
- In `combinedChartData` computation, change x-values from sequential integers to year-based floats
- History points: x = (date - earliestDate) in fractional years
- Projection points: x = lastHistoryYear + n
- Update `bridgeIdx` to be the actual year value (float)
- Update XAxis tickFormatter: show year labels for both history and projection
- Update note marker x positions to match new scale
- Update tooltip: detect history vs projection by checking if x <= bridgeIdx

### Phase 2: Move asset description
- Remove the description section from its current position (after Activity Timeline)
- Add it right after the balance display, before Quick Stats, as a simpler inline text

### Phase 3: Quick-reset seed
- Create `packages/db/src/seed-dev-quick.ts`
- Add scripts to both package.json files
- Add `db:reset:quick` to root that drops/recreates DB, migrates, then runs seed:quick

## Test Steps

1. View an investment account with balance history: verify the chart x-axis shows smooth proportional time-based scaling, not a spike
2. Verify the investment chart still shows "Today" divider, variance bands, and correct tooltips
3. Verify the asset description now appears below the balance, above Quick Stats
4. Run `npm run db:reset:quick` and verify you land on the dashboard (not getting-started wizard)
5. Verify the quick-reset has a simple and investment account with history
