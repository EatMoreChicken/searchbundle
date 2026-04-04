---
name: design-system-overhaul-v2
description: Complete migration to new flat design language (DESIGN.md v2) - colors, icons, navigation, components
status: completed
---

# Design System Overhaul v2

## Description
Complete migration of SearchBundle's visual identity from Material Design 3-inspired tokens to the new flat, minimal design language defined in `docs/DESIGN.md`. This affects every visual layer: color tokens, icon system, typography scale, navigation architecture, component patterns, and motion design.

## Motivation
The product's visual identity has been completely reworked. The new design system is minimal, neutral, and professional (inspired by Privacy.com and Apple). Key changes: new color palette, Font Awesome 6 icons, top horizontal navigation, refined component patterns.

## Phased Implementation

### Phase 1: Core Design Tokens + Global CSS ✅
- [x] Replace @theme color tokens with new flat palette
- [x] Update body styles and utilities
- [x] Switch icon CDN from Material Symbols to Font Awesome 6
- [x] Update font loading (Manrope 400-800)

### Phase 2: Icon System Migration ✅
- [x] Replace all 168 Material Symbols usages with Font Awesome 6 equivalents
- [x] Remove .material-symbols-outlined CSS

### Phase 3: Navigation Architecture ✅
- [x] Create Navbar.tsx (horizontal top nav)
- [x] Update (app)/layout.tsx
- [x] Remove Sidebar.tsx

### Phase 4: Component Token Migration ✅
- [x] Migrate all color token classes in all components

### Phase 5: Page-Level Updates ✅  
- [x] Dashboard, Assets, Liabilities, Settings, Tracker, Auth, Onboarding

### Phase 6: Logo + Branding ✅
- [x] Copy logo.png to public
- [x] Use in Navbar

### Phase 7: Motion + Animation ✅
- [x] Transitions match DESIGN.md specs

### Phase 8: Update copilot-instructions.md ✅
- [x] Update design references

## Test Steps
1. Start dev server, sign in, verify top navbar with correct items
2. Verify logo appears in navbar
3. Verify all icons are Font Awesome (no broken Material Symbols)
4. Verify color palette: canvas background (#f5f7fa), white cards, teal accent (#0d9488)
5. Navigate each page, verify no broken layouts
6. Test auth + onboarding flows
7. Test responsive behavior
