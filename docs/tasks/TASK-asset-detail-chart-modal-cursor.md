---
status: completed
---

# Asset Detail: Combined Chart, Wider Modal, Cursor Audit

## Description

Three improvements to the assets feature:

1. **Wider Add Asset modal**: The modal is too narrow (`max-w-lg`) for investment accounts. Widen it to prevent vertical scrolling.
2. **Combined history + projection chart**: For investment accounts, merge historical balance data and future projection into a single chart. Use the user's `projectionEndAge` setting (default 100) to determine projection years. The projection portion should be visually distinct (dashed lines, lighter fill) from the solid historical data. Remove the separate standalone projection chart section.
3. **Cursor audit**: All clickable elements (buttons, links, interactive cards) must show `cursor-pointer` to indicate they are interactive.

## Motivation

- The modal with investment fields causes scrolling on smaller viewports.
- Having two separate charts (history + projection) is redundant for investment accounts. A unified chart tells a better story.
- Missing cursor feedback makes the app feel broken because users cannot tell what is clickable.

## Key Design Decisions

- The combined chart uses the existing `AreaChart` for historical data (solid fill) and appends projection data points using dashed lines and lighter fill to visually distinguish future from past.
- The projection portion starts from the last historical data point (current balance) and extends `projectionYears` into the future.
- `projectionEndAge` from user profile sets the default projection years, but the user can override via an inline control on the chart.
- The separate `InvestmentProjectionChart` section below the contributions is removed. The `InvestmentProjectionChart` component itself remains available for other uses (like the onboarding wizard), but is no longer rendered on the detail page.
- For simple accounts with contributions, keep a standalone simple projection section (it has no history to merge with in the same meaningful way).
- `cursor-pointer` is added to all `<button>` elements and clickable `<div>`s across: asset detail page, asset list page, PlannedContributions, Sidebar, and other components.

## Implementation Plan

### Phase 1: Widen Add Asset Modal

- Change `max-w-lg` to `max-w-2xl` on the add/edit modal in `assets/page.tsx`
- Also widen the edit modal in `assets/[id]/page.tsx`

### Phase 2: Combined History + Projection Chart (Investment Accounts)

- Fetch user profile (`/api/users/me`) to get `projectionEndAge`
- Build combined chart data: historical points (solid) + projection points (dashed/lighter)
- Use recharts `ComposedChart` with:
  - Solid Area for historical values
  - Dashed Line + lighter Area for projected expected values  
  - Stacked Areas for variance bands (only in projection region)
  - Dashed line for inflation-adjusted (only in projection region)
  - A vertical ReferenceLine at the "today" boundary separating history from projection
- Add projection years control (number input or small selector)
- Projection years preference: store in component state, default from user's `projectionEndAge` minus current age (or just raw years if no age info)

### Phase 3: Remove Separate Projection Chart

- Remove the standalone `{/* Projection Chart */}` section from the detail page for investment accounts
- Keep it for simple accounts (which still need a standalone projection since their history chart doesn't include projections)

### Phase 4: Cursor Audit

- Add `cursor-pointer` to all `<button>` elements and clickable elements across:
  - `assets/[id]/page.tsx`: back button, edit button, delete button, balance editor, note delete, modal buttons
  - `assets/page.tsx`: add asset, card click, edit/delete buttons, type cards, modal buttons
  - `PlannedContributions.tsx`: add button, edit/delete on contributions, submit/cancel buttons
  - Any other interactive elements missing the cursor style

## Test Steps

1. Open the Add Asset modal and select "Investment Account": verify the modal is wider and all content fits without scrolling.
2. Create or view an investment account with balance history and planned contributions: verify the chart shows both historical data (solid) and projection (dashed/lighter) in one combined view.
3. Verify the projection extends based on the user's `projectionEndAge` from settings (default 100 translates to ~70 years if user is ~30).
4. Verify the separate projection chart section is gone for investment accounts.
5. For simple accounts with contributions, verify the standalone projection chart still appears.
6. Hover over every button and interactive element on the assets page and detail page: verify the cursor changes to a pointer.
