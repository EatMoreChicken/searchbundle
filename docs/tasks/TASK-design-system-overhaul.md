# TASK: Design System Overhaul — "The Financial Sanctuary"

**Status: Completed**

## Description
Migrate the entire SearchBundle UI from the old design system (DM Serif Display / Syne / Plus Jakarta Sans / JetBrains Mono, warm creams, Font Awesome icons, 1px borders) to the new "Financial Sanctuary" design system (Manrope, teal/mint/amber palette, Material Symbols Outlined, surface layering, no-border rule).

## Motivation
A designer provided updated references (docs/DESIGN.md, docs/code.html, docs/screen.png) establishing a cleaner, more sophisticated aesthetic. The old system used four font families, warm cream backgrounds, and traditional card borders. The new system uses a single font (Manrope), a cool teal-anchored palette, surface-layer depth (no borders), and Material Symbols Outlined icons.

## Critical Decisions
- **Single font**: Manrope replaces all four previous fonts.
- **Material Symbols Outlined** replaces Font Awesome 6 everywhere.
- **No-border rule**: Cards/sections use background color shifts for depth, not `border: 1px solid`.
- **Surface hierarchy**: `surface` (#f7faf8) → `surface-container-low` (#f1f4f2) → `surface-container-lowest` (#ffffff).
- **Primary color**: Teal (#006761) replaces the old teal (#2A7C8E) and the old near-black primary buttons.
- **Cooper AI**: Uses primary teal, not the old indigo.

## Implementation Phases

### Phase 1: globals.css — Replace design tokens
- Swap Google Fonts import: remove DM Serif Display, Syne, Plus Jakarta Sans, JetBrains Mono; add Manrope + Material Symbols Outlined.
- Replace all `@theme` color variables with the new palette.
- Replace font family variables (single `--font-headline`/`--font-body`/`--font-label` all pointing to Manrope).
- Add `.material-symbols-outlined` base styles.
- Add `.glass-panel` utility.

### Phase 2: Root layout — Swap icon CDN
- Remove Font Awesome CDN link from `apps/web/src/app/layout.tsx`.
- Font Awesome is no longer needed.

### Phase 3: App layout + Sidebar
- Sidebar: `surface-container-low` background, `rounded-r-[32px]`, Material Symbols icons, teal active state with white pill, `hover:translate-x-1`, gradient "Simulate Future" button.
- App layout: adjust main content margin/padding.

### Phase 4: NetWorthTracker (Dashboard)
- Replace all old color classes with new surface/on-surface classes.
- Remove card borders, use surface layering.
- Update fonts to Manrope weight system.
- Replace Font Awesome icons with Material Symbols.

### Phase 5: Assets & Liabilities pages (list + detail)
- Update card backgrounds, remove borders, switch to surface layering.
- Replace all FA icons with Material Symbols equivalents.
- Update color classes for text, status indicators, buttons.

### Phase 6: Auth pages (sign-in, sign-up)
- Update card/input styling to new surface system.
- Replace fonts and colors.

### Phase 7: Remaining components (ComingSoonPage, charts)
- Update ComingSoonPage template.
- Update chart components to use new palette CSS variables.

## Test Steps
1. Run `npm run dev` and navigate to every page.
2. Verify no Font Awesome squares (missing icons) appear — all should be Material Symbols.
3. Verify no warm cream (#F5F3EF, #FAFAF8 old) backgrounds — should see cool mint-teal tones.
4. Verify no 1px card borders — depth from surface stacking only.
5. Verify Manrope is the only font displayed (check DevTools > Computed > font-family).
6. Verify teal (#006761) is the primary interactive color on buttons, active nav, links.
7. Dashboard: categories, entries display correctly with new palette.
8. Assets/Liabilities: cards render without borders, correct colors.
9. Auth: sign-in/sign-up pages use new input/button styles.
