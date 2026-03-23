---
name: asset-notes-timeline
description: Add standalone notes to asset detail page with unified timeline and chart markers
status: completed
---

# TASK: Asset Notes Timeline & Chart Markers

## Description
Add the ability to attach standalone notes to an asset that appear in the activity timeline alongside balance updates and as interactive markers on the balance history chart.

## Motivation
Users update their balances but have no way to annotate *why* a change happened. For example, after adding $500, a user wants to note "Got a rebate, adding to cash reserve." Notes provide context, make the history meaningful, and help users recall decisions during check-ins.

## What We're Building

### 1. New DB table: `account_notes`
- `id` (uuid, PK)
- `account_id` (uuid, FK -> accounts CASCADE)
- `household_id` (uuid, FK -> households CASCADE)
- `content` (text, NOT NULL)
- `created_at` (timestamp, default now)

### 2. New API routes: `/api/assets/[id]/notes`
- `GET`: list all notes for an asset (desc by createdAt)
- `POST`: create a new note (`{ content }`)
- `DELETE /api/assets/[id]/notes/[noteId]`: delete a single note

### 3. TypeScript type: `AccountNote`
```typescript
export interface AccountNote {
  id: string;
  accountId: string;
  householdId: string;
  content: string;
  createdAt: string;
}
```

### 4. UI Changes on Asset Detail Page

#### Quick-add note input
A simple text input area near the top of the Activity section (below the "Update Balance" button area) for fast note creation. Inline text field with a send/add button.

#### Unified Activity Timeline
Merge `BalanceUpdate[]` and `AccountNote[]` into a single timeline, sorted by `createdAt` desc. Each entry type has its own visual treatment:
- **Balance updates**: existing row layout (arrow up/down icon, prev -> new, change amount)
- **Notes**: note icon, content text, timestamp. Each note row gets an `id` attribute for scroll-to-note on chart marker click.

#### Chart Markers (ReferenceDot)
For each note, render a recharts `ReferenceDot` on the chart at the note's timestamp. The dot:
- Appears at the Y-value of the balance at (or closest to) that note's timestamp
- Uses tertiary (amber) color to distinguish from regular data dots
- Shows a custom tooltip on hover with the note content
- On click, scrolls the page down to that note's row in the timeline (using `id` + `scrollIntoView`)

### 5. Dev Seed
Add a few sample notes to the Chase Checking account to demonstrate the feature.

## Implementation Steps

### Phase 1: Database
1. Add `accountNotes` table to `packages/db/src/schema.ts`
2. Create migration `0012_account_notes.sql`
3. Export from `packages/db/src/index.ts` (already exports all via `export * from "./schema"`)

### Phase 2: Types
4. Add `AccountNote` interface to `apps/web/src/types/index.ts`

### Phase 3: API
5. Create `apps/web/src/app/api/assets/[id]/notes/route.ts` (GET + POST)
6. Create `apps/web/src/app/api/assets/[id]/notes/[noteId]/route.ts` (DELETE)

### Phase 4: UI
7. Update asset detail page:
   - Import `ReferenceDot` from recharts
   - Add `AccountNote` type import
   - Fetch notes alongside history
   - Build unified timeline (merge + sort)
   - Add quick-add note input in the Activity section
   - Render `ReferenceDot` markers on chart for each note
   - Custom tooltip for note markers
   - Click-to-scroll from chart marker to timeline row
   - Note rows with delete button

### Phase 5: Seed Data
8. Add sample notes to `seed-dev.ts`

### Phase 6: Validation
9. TypeScript check, apply migration, re-seed, manual test

## Edge Cases
- Note created at the same timestamp as a balance update: both appear in timeline, note marker overlaps dot (acceptable since note uses distinct color)
- No balance history yet: notes still appear in timeline but chart markers can't render (no Y value) — skip markers when chart has no data
- Deleting a note: timeline re-fetches, marker disappears from chart
- Very long note text: truncate in timeline row with expand, show full text in chart tooltip with max-width

## Test Steps
1. Navigate to an asset detail page (e.g., Chase Checking)
2. In the Activity section, find the note input and type "Got a $500 rebate from insurance"
3. Click Add (or press Enter) — note appears at top of timeline with a note icon
4. Scroll up to the chart — an amber dot should appear at the timestamp
5. Hover the amber dot — tooltip shows the note content
6. Click the amber dot — page scrolls down to highlight the note row in the timeline
7. Delete a note — it disappears from both timeline and chart
8. Add a note when there's no balance history — note appears in timeline, no chart marker (graceful)
