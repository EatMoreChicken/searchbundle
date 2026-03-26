---
name: sidebar-and-dashboard-polish
description: Persist sidebar collapse state, remove Projections page, remove on-track pill from dashboard hero, fix chart control pill sizing.
status: completed
---

# Sidebar & Dashboard Polish

## Changes

### 1. Persist sidebar collapsed state (localStorage)
- Key: `sb-sidebar-collapsed`
- On mount: read value from localStorage; fall back to `window.innerWidth < 1024` only if no value stored
- On toggle: write new state to localStorage immediately

### 2. Remove Projections nav item and page
- Remove `{ href: "/projections", ... }` from `navItems` in `Sidebar.tsx`
- Delete `apps/web/src/app/(app)/projections/page.tsx`

### 3. Remove on-track pill from dashboard hero
- Remove `{savedSummary && <OnTrackBadge info={onTrackInfo} />}` from the hero header JSX
- Keep the `OnTrackBadge` component and `calculateOnTrackStatus` logic in place (used by the chart tooltip)

### 4. Fix chart control pill sizing
- Both pill groups (Summary/Detailed and Focused/Years/Full Plan) use `p-0.5` container with `px-3 py-1` buttons
- The split "Years" button uses `pl-3 pr-1` + `pr-2` which creates uneven visual weight; normalize to `py-1.5` on all buttons so heights match, and give the years label `px-3` while the chevron stays `px-1`
- Ensure both pill groups use consistent `gap-0.5` so items butt up cleanly inside the container
