---
name: sidebar-navigation
description: Built the persistent left sidebar navigation component for the authenticated app shell with active-state routing, Font Awesome icons, and Cooper AI footer section.
status: completed
---

# Sidebar Navigation

## Description

Build the persistent left sidebar navigation for the authenticated app shell. The sidebar replaces the placeholder `<aside>` in `(app)/layout.tsx` with a fully styled, active-state-aware navigation component.

---

## Motivation

All authenticated app pages share a common layout. The sidebar is the primary way users move between sections of the app. It needs to be built before any page-level work can begin.

---

## Critical Decisions

- **Client Component.** The sidebar needs `usePathname()` to highlight the active route, which requires `"use client"`. The parent `(app)/layout.tsx` stays a Server Component — only the Sidebar itself is a client component.
- **Font Awesome via CDN.** Rather than adding the full `@fortawesome/react-fontawesome` package chain, Font Awesome 6 is loaded as a stylesheet link in the root layout. This keeps the dependency count low and is straightforward for development.
- **Cooper AI is separated from the main nav.** Per the design system, indigo is reserved exclusively for Cooper. It lives in a pinned footer section below the main nav to reinforce its special status, not as a regular nav item.
- **`sticky top-0 h-screen`** on the aside so the sidebar stays fixed while the main content scrolls independently.
- **Sidebar background is `bg-bg` (off-white), active items use `bg-surface`** — this gives subtle contrast since the overall sidebar sits on the page background, and active items step slightly "into" the surface layer.

---

## Implementation Plan

### Phase 1 — Font Awesome

Add the Font Awesome 6 CDN stylesheet link to the root `layout.tsx` `<head>`.

### Phase 2 — Sidebar component

Create `apps/web/src/components/Sidebar.tsx`:

```
<aside sticky h-screen flex-col bg-bg border-r>
  Brand header (SB monogram + "SearchBundle" wordmark)
  ---
  <nav flex-1 overflow-y-auto>
    Section: OVERVIEW
      Dashboard  (fa-house)
    Section: FINANCES
      Accounts   (fa-building-columns)
      Debts      (fa-credit-card)
      Projections (fa-chart-line)
    Section: TOOLS
      Check-In   (fa-circle-check)
  </nav>
  ---
  Cooper AI footer (indigo, fa-wand-magic-sparkles)
</aside>
```

Active state logic:
- `pathname === href || pathname.startsWith(href + "/")`
- Active: `bg-surface text-text`
- Inactive: `text-text-secondary hover:bg-surface hover:text-text`
- Cooper active: `bg-indigo-light text-indigo`
- Cooper inactive: `text-indigo hover:bg-indigo-light`

### Phase 3 — Wire into app layout

Update `(app)/layout.tsx` to import and render `<Sidebar />` in place of the placeholder `<aside>`.

---

## Test Steps

1. Visit http://localhost:3000/dashboard — sidebar should be visible on the left.
2. Click each nav link — active item should highlight with `bg-surface`.
3. Navigate to /cooper — Cooper AI item should highlight with indigo background.
4. Resize to a narrow window — note: mobile layout is not in scope for this task.
5. Scroll the main content area — sidebar should stay fixed.
