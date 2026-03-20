---
name: net-worth-dashboard
description: Spreadsheet-style Net Worth Tracker dashboard with monthly grid for assets, liabilities, and calculated net worth.
status: completed
---

# Net Worth Dashboard (Tracker Grid)

## Description

Build a new dashboard page that displays a spreadsheet-style Net Worth Tracker, replacing the current placeholder dashboard. The tracker shows a monthly grid of all user assets and liabilities with calculated totals and net worth, similar to an Excel sheet view.

## Motivation

The existing assets and liabilities pages were built independently and don't convey a cohesive picture. Working backwards from the dashboard — the primary view users will interact with — lets us define what data structure makes sense, then later connect the detailed asset/liability pages to it.

## User Ask

- Spreadsheet-style grid: rows are categories (assets/liabilities), columns are months
- Users can add asset rows and liability rows
- Users manually enter balance values per month (no projections yet)
- Auto-calculated TOTAL ASSETS, TOTAL LIABILITIES, and NET WORTH rows
- Current month is highlighted (amber/gold)
- Horizontal scroll to see past and future months
- Year selector to switch between years
- Extensible for future features (projections, auto-fill, linked accounts)

## Critical Decisions

1. **New standalone tables** — `net_worth_categories` and `net_worth_entries` — rather than reusing existing `accounts`/`debts` tables. This keeps the dashboard self-contained while allowing future linking.
2. **No projections yet** — future months show dashes (empty). Projections will be layered in later.
3. **All past months and current month are editable** — users manually fill in historical data.
4. **Next.js route handlers** for all API endpoints (consistent with existing pattern).

## Implementation Plan

### Phase 1: Database Schema

Add two new tables to `packages/db/src/schema.ts`:

**`net_worth_categories`**
- `id` UUID PK
- `userId` UUID FK → users.id (CASCADE delete)
- `name` VARCHAR(255)
- `type` enum ('asset', 'liability')
- `sortOrder` INTEGER default 0
- `createdAt`, `updatedAt` timestamps

**`net_worth_entries`**
- `id` UUID PK
- `categoryId` UUID FK → net_worth_categories.id (CASCADE delete)
- `year` INTEGER
- `month` INTEGER (1-12)
- `value` NUMERIC(15,2) default 0
- `createdAt`, `updatedAt` timestamps
- UNIQUE constraint on (categoryId, year, month)

Create migration file `0005_net_worth_tracker.sql`.

### Phase 2: TypeScript Types

Add to `apps/web/src/types/index.ts`:

```typescript
interface NetWorthCategory {
  id: string;
  userId: string;
  name: string;
  type: 'asset' | 'liability';
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface NetWorthEntry {
  id: string;
  categoryId: string;
  year: number;
  month: number;
  value: number;
  createdAt: string;
  updatedAt: string;
}

interface DashboardData {
  categories: NetWorthCategory[];
  entries: NetWorthEntry[];
}
```

### Phase 3: API Routes

All routes under `/api/dashboard/`:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/dashboard?year=2025` | Get categories + entries for user for a year |
| POST | `/api/dashboard/categories` | Create a new category row |
| PUT | `/api/dashboard/categories/[id]` | Rename a category |
| DELETE | `/api/dashboard/categories/[id]` | Delete category + its entries |
| PUT | `/api/dashboard/entries` | Upsert a single monthly value |

### Phase 4: Dashboard UI

**Component: `NetWorthTracker`** (client component)

Layout structure:
```
┌─────────────────────────────────────────────────┐
│  Net Worth Tracker          [Year: 2025 ▾]      │
│  Legend: ■ Actual  ■ Current  □ Projected  - No data │
├──────────┬──────┬──────┬──────┬──────┬──────────┤
│ Category │ Jan  │ Feb  │ Mar  │ ...  │ Dec      │
├──────────┼──────┼──────┼──────┼──────┼──────────┤
│ □ ASSETS │      │      │      │      │          │
│  Checking│ 4200 │ 4320 │ ...  │      │          │
│  Savings │18500 │19000 │ ...  │      │          │
│  + Add   │      │      │      │      │          │
│ TOTAL    │22700 │23320 │ ...  │      │          │
├──────────┼──────┼──────┼──────┼──────┼──────────┤
│ □ LIABILITIES│   │      │      │      │          │
│  Mortgage│298k  │297k  │ ...  │      │          │
│  + Add   │      │      │      │      │          │
│ TOTAL    │298k  │297k  │ ...  │      │          │
├──────────┼──────┼──────┼──────┼──────┼──────────┤
│ NET WORTH│-275k │-274k │ ...  │      │          │
└──────────┴──────┴──────┴──────┴──────┴──────────┘
```

Key UI behaviors:
- Category column is sticky (fixed left)
- Month columns scroll horizontally
- Current month column has amber/gold highlight
- Past months with data: dark background (actual)
- Current month: amber background with gold text
- Future months / no data: light background with dash
- Click cell → inline number input; save on blur/Enter
- Add row: opens small inline form to name the category
- Delete row: icon button with confirmation
- Year selector dropdown in top bar
- NET WORTH row: color-coded by value trend (green positive change, red negative)

### Phase 5: Finalize

- Update `copilot-instructions.md` with new dashboard info
- Test the full flow end-to-end

## Edge Cases & Considerations

- Empty dashboard (no categories): Show encouraging empty state with CTA to add first asset
- All-zero month: Show $0 for totals, not empty
- Large numbers: Use compact formatting (e.g., $385,000 not $385000)
- Negative net worth: Show in red
- Year boundary: Each year is independent; user can switch years freely
- Delete category: Cascades to all entries for that category
- Concurrent edits: Last write wins (acceptable for single-user v1)

## Test Steps

1. Navigate to Dashboard page
2. See empty state encouraging user to add their first asset
3. Click "Add Asset" → enter name "Checking Account" → confirm
4. New row appears under ASSETS section
5. Click the current month cell → type 4200 → press Enter
6. Value shows as $4,200 in the cell; TOTAL ASSETS and NET WORTH update
7. Add a liability "Mortgage" → enter 298000 for current month
8. NET WORTH should show negative value in red
9. Switch year to a different year → grid resets to show that year's data
10. Navigate back → data persists
11. Delete a category → category and all its entries removed
12. Scroll horizontally to see all 12 months
13. Current month column is visually highlighted
