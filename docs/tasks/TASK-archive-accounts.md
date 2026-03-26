---
status: completed
---

# Archive Accounts (Assets & Liabilities)

## Overview
Add the ability to archive assets and liabilities. Archived items are excluded from dashboard calculations, projections, and totals, but their data is fully preserved. They appear in a collapsed "Archived" section on list pages and can be restored at any time.

## Requirements
1. **Soft archive**: Add `archivedAt` timestamp to `accounts` and `debts` tables. Null = active, non-null = archived.
2. **API filtering**: List endpoints (`GET /api/assets`, `GET /api/liabilities`) return only active (non-archived) items by default. Support `?includeArchived=true` query param to return all.
3. **Dashboard exclusion**: Archived accounts are excluded from dashboard projections, metrics, and chart data (handled automatically via API filtering).
4. **Contributions suspended**: Archived assets' planned contributions are not included in projections (handled automatically via API filtering since the parent asset is excluded).
5. **List page UI**: Show archived items in a collapsible "Archived" section (collapsed by default). Active items display normally above.
6. **Zero-balance indicator**: When an active asset or liability has a $0 balance, show a subtle "Archive this?" prompt on the card.
7. **Archive confirmation modal**: When archiving, show a glassmorphism modal explaining the effects (excluded from dashboard, projections paused, contributions suspended, can be restored).
8. **Unarchive**: Archived items can be restored to active from the archived section.
9. **Archive from card**: Add archive action button to card hover actions (alongside edit/delete).
10. **Archive from detail page**: Archived status shown on detail pages with option to unarchive.

## Implementation

### Phase 1: Database
- Add `archivedAt` (nullable timestamp) column to `accounts` and `debts` tables in `schema.ts`
- Create migration `0015_archive_accounts.sql`

### Phase 2: Types
- Add `archivedAt: string | null` to `Asset` and `Debt` interfaces in `types/index.ts`

### Phase 3: API
- Update `parseAsset()` and `parseDebt()` to pass through `archivedAt`
- Update `GET /api/assets` and `GET /api/liabilities` to filter `WHERE archived_at IS NULL` by default
- Support `?includeArchived=true` query param
- Update `PUT /api/assets/[id]` and `PUT /api/liabilities/[id]` to support `archivedAt` field

### Phase 4: Assets list page
- Fetch all items including archived (`?includeArchived=true`)
- Split into active and archived lists
- Show collapsed "Archived" section with count badge
- Add archive button to card hover actions
- Zero-balance archive prompt on active cards
- Archive confirmation modal
- Unarchive button in archived section

### Phase 5: Liabilities list page
- Same treatment as assets list page

### Phase 6: Dashboard
- No changes needed: dashboard fetches from `/api/assets` and `/api/liabilities` without `?includeArchived=true`, so archived items are automatically excluded

## Files Modified
- `packages/db/src/schema.ts`
- `packages/db/migrations/0015_archive_accounts.sql`
- `apps/web/src/types/index.ts`
- `apps/web/src/app/api/assets/route.ts`
- `apps/web/src/app/api/assets/[id]/route.ts`
- `apps/web/src/app/api/liabilities/route.ts`
- `apps/web/src/app/api/liabilities/[id]/route.ts`
- `apps/web/src/app/(app)/assets/page.tsx`
- `apps/web/src/app/(app)/liabilities/page.tsx`
