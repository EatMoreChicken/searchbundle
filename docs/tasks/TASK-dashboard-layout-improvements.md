---
name: dashboard-layout-improvements
description: Three dashboard improvements: visual separator between assets and liabilities, sticky net worth row, and fix for duplicate seed data.
status: completed
---

# Dashboard Layout Improvements

## Description

Three improvements to the Net Worth Tracker dashboard:

1. **Assets/Liabilities visual separator** — The table currently renders assets and liabilities in one continuous block with no clear visual break between them.
2. **Sticky net worth row** — With many categories the Net Worth row pushes below the fold. Users must scroll all the way down to see it.
3. **Duplicate seed data** — Running `db:seed` more than once creates duplicate categories, accounts, and debts because the seeded records lack fixed IDs and `onConflictDoNothing()` can't match them on re-run.

## Motivation

- Users with several assets and liabilities can't quickly tell where one section ends and the other begins.
- Net worth is the primary metric on this page; it should always be visible.
- Developers running `db:seed` multiple times end up with cluttered test data.

## Critical Decisions

- The sticky net worth row is implemented by giving the scroll container `overflow-y-auto` with a `max-height`, then moving the row into `<tfoot>` with `sticky bottom-0` on each cell. This avoids the need for a separate fixed/portal element and keeps horizontal scroll synchronized automatically.
- The outer `rounded-2xl overflow-hidden` wrapper is removed because `overflow: hidden` on a non-scroll ancestor breaks `position: sticky` on descendants. The rounding is moved to the scroll container itself (which has `overflow-x-auto overflow-y-auto`, so `border-radius` clips correctly).
- Fixed UUIDs are assigned to all seeded entities (accounts, debts, net worth categories) so `onConflictDoNothing()` correctly deduplicates on repeated runs.

## Implementation Steps

### 1. Section separator row — NetWorthTracker.tsx

Add a spacer `<tr>` between the "Total Assets" row and the "Liabilities" section header. The spacer uses `bg-surface-container-high` for visible contrast.

```tsx
<tr aria-hidden="true">
  <td colSpan={13} className="h-3 bg-surface-container-high py-0" />
</tr>
```

### 2. Sticky net worth row — NetWorthTracker.tsx

**Before:**
```tsx
<div className="rounded-2xl overflow-hidden bg-surface-container-lowest">
  <div ref={scrollContainerRef} className="overflow-x-auto sb-scrollbar">
    <table>
      <tbody>
        {/* ...rows... */}
        {/* Net worth row here in tbody */}
      </tbody>
    </table>
  </div>
</div>
```

**After:**
```tsx
<div ref={scrollContainerRef} className="overflow-x-auto overflow-y-auto sb-scrollbar rounded-2xl bg-surface-container-lowest max-h-[calc(100vh-200px)]">
  <table>
    <thead>...</thead>
    <tbody>
      {/* assets + separator + liabilities — NO net worth row */}
    </tbody>
    <tfoot>
      <tr>
        <td className="sticky left-0 bottom-0 z-20 bg-gradient-to-r from-primary to-primary-container px-4 py-3">...</td>
        {MONTHS.map((_, i) => renderNetWorthCell(i + 1))}
      </tr>
    </tfoot>
  </table>
</div>
```

Each `<td>` in the net worth `<tfoot>` row gets `sticky bottom-0 z-10` plus a solid background so it covers content above when stuck.

### 3. Fix seed duplicates — seed.ts

Assign stable UUIDs to all accounts, debts, and net worth categories. Use `onConflictDoNothing()` — each entity with the same ID will be skipped on re-run.

```ts
const ACCT_SAVINGS_ID     = "00000000-0000-0001-0000-000000000001";
const ACCT_401K_ID        = "00000000-0000-0001-0000-000000000002";
// ... etc
```

## Edge Cases

- `tfoot` cells with both `sticky bottom-0` and `sticky left-0` (the label cell) rely on CSS multi-axis sticky support, which is supported in all modern browsers.
- The `max-h-[calc(100vh-200px)]` cap means the table gets its own vertical scroll, so the page itself won't scroll for the table content. This is intentional — it keeps the net worth row's sticky behavior scoped to the table.
- Net worth cells need an explicit background to prevent see-through when sticky.

## Test Steps

1. Start the dev server (`npm run dev`) and sign in.
2. Navigate to the Dashboard.
3. **Separator**: Confirm there is a clear visual band between the "Total Assets" total row and the "Liabilities" section header.
4. **Sticky row**: Scroll down within the table. Confirm the Net Worth row stays pinned to the bottom of the table window as you scroll through rows.
5. **Seed dedup**: Run `npm run db:seed` twice. Refresh the app and confirm there are no duplicate category rows in the dashboard (e.g., "Savings" appears only once, not twice or three times). Also check that the Assets and Liabilities pages show no duplicated accounts or debts.
