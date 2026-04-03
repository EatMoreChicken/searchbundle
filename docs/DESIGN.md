# SearchBundle Design System

**Version:** 1.0
**Last Updated:** April 3, 2026

---

## Overview

This document defines every visual and interaction decision for SearchBundle. It is the single source of truth for all UI work. There is no room for interpretation. If a decision is not covered here, it should be added before implementation begins.

---

## Design Philosophy

SearchBundle is minimal and neutral. It draws inspiration from Privacy.com and Apple. The interface is calm, professional, and functional. Nothing is decorative without purpose. The app should feel like a tool you trust with serious financial data, not a lifestyle brand.

Core principles:

- **No borders.** Sections and cards are separated by background color shifts, never by border lines.
- **No shadows.** Cards are flat. Depth comes from layered background colors, not drop shadows.
- **Moderate density.** Not a trading terminal, not a marketing page. Balanced.
- **Rich motion.** Micro-interactions, hover states, animated charts, and smooth transitions everywhere. The app should feel alive.

---

## Color System

### Base Palette

| Token | Hex | Usage |
|---|---|---|
| `--canvas` | `#f5f7fa` | Page background, the base layer |
| `--surface` | `#ffffff` | Cards, elevated containers, inputs |
| `--surface-alt` | `#ebeef2` | Nested elements inside cards, secondary backgrounds |
| `--text-primary` | `#111111` | Headings, primary body text |
| `--text-secondary` | `#666666` | Supporting text, descriptions |
| `--text-tertiary` | `#999999` | Placeholders, timestamps, meta labels |
| `--text-disabled` | `#cccccc` | Disabled states |

### Brand / Accent

| Token | Hex | Usage |
|---|---|---|
| `--accent` | `#0d9488` | Primary interactive color: links, active nav, focus rings, progress bars, buttons |
| `--accent-hover` | `#0f766e` | Hover state for accent elements |
| `--accent-light` | `#f0fdfa` | Light accent background for pills, tags, subtle highlights |
| `--accent-border` | `#99f6e4` | Accent-colored borders when needed |

### Semantic Colors

| Token | Hex | Usage |
|---|---|---|
| `--success` | `#16a34a` | Positive values, growth, gains, on-track status |
| `--success-light` | `#f0fdf4` | Success background for pills and tags |
| `--error` | `#dc2626` | Negative values, losses, off-track status, destructive actions |
| `--error-light` | `#fef2f2` | Error background for pills and tags |
| `--warning` | `#d97706` | Caution states, behind-schedule, needs attention |
| `--warning-light` | `#fffbeb` | Warning background for pills and tags |
| `--info` | `#2563eb` | Informational highlights, tips, notes |
| `--info-light` | `#eff6ff` | Info background for pills and tags |

### Dark Mode (Future)

Dark mode is planned but not the current priority. When implemented, all tokens above will have dark equivalents. The canvas will invert to a dark neutral, surfaces to a slightly lighter dark, and text colors will flip. Accent and semantic colors will be adjusted for contrast on dark backgrounds.

---

## Typography

### Font

**Manrope** (Google Fonts). Geometric sans-serif. Weights 400 through 800.

Load via: `https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap`

### Scale

| Role | Size | Weight | Letter Spacing | Transform |
|---|---|---|---|---|
| Page title | 24px | 700 | -0.02em | None |
| Section heading | 16px | 700 | -0.01em | None |
| Card label | 9-10px | 600-700 | 0.08em | Uppercase |
| Section label | 11-12px | 600 | 0.06em | Uppercase |
| Body text | 14px | 400-500 | Normal | None |
| Small / meta | 12px | 400-500 | Normal | None |
| Tiny / caption | 10-11px | 500 | Normal | None |
| Large monetary value | 22-28px | 800 | -0.02em | None |
| Stat card value | 22px | 800 | -0.02em | None |
| Navigation item | 13px | 500 (inactive), 700 (active) | Normal | None |
| Button text | 13px | 600 | 0.01em | None |

### Rules

- All labels (NET WORTH, TOTAL DEBT, ASSETS, etc.) are uppercase, small, with wide letter-spacing.
- Monetary values are always displayed with Manrope weight 800.
- No other fonts are used anywhere in the application.

---

## Spacing

### Base Unit: 4px

All spacing values are multiples of 4.

| Token | Value | Common Usage |
|---|---|---|
| `--space-1` | 4px | Tight gaps between related inline elements |
| `--space-2` | 8px | Gap between list items, inner card padding adjustments |
| `--space-3` | 12px | Standard gap between cards in a grid, input padding |
| `--space-4` | 16px | Page-level section padding, card internal padding |
| `--space-5` | 20px | Card padding for larger cards |
| `--space-6` | 24px | Section margins, gap between major content blocks |
| `--space-8` | 32px | Page-level top/bottom padding |

### Application

- Card internal padding: 12-16px
- Gap between cards in a grid: 8px
- Gap between list items: 4-6px
- Section-to-section spacing: 16-24px
- Page padding (left/right): 16-24px
- Nav bar internal padding: 12-16px

---

## Layout

### Content Width

Full width, edge to edge. No max-width container. Content fills the available viewport width with consistent page padding applied to the left and right edges.

### Navigation

Top horizontal navigation bar. Sticky to the top of the viewport. Contains:

- Logo/wordmark on the left ("SearchBundle", Manrope weight 800, 14-15px)
- Nav items horizontally to the right of the logo (Dashboard, Accounts, Debts, Projections, Cooper, Settings)
- Active nav item uses `--accent` color with a 2px bottom border in `--accent`
- Inactive nav items use `--text-tertiary`

### Grid System

Use CSS Grid or Flexbox. Stat cards at the top of the dashboard use a 3-column grid. Account/debt lists are single-column full-width rows. Responsive breakpoints:

- Desktop (1024px+): Full layout, 3-column stat grid
- Tablet (768-1023px): 2-column stat grid, stacked sections
- Mobile (below 768px): Single column everything

---

## Components

### Cards

- Background: `--surface` (#ffffff)
- Border radius: 8-10px
- No border, no shadow
- Padding: 12-16px
- Sits on `--canvas` (#f5f7fa) background for contrast

### Stat Cards (Dashboard)

Visual style with progress bars. Each stat card contains:

1. **Label** (uppercase, 9px, weight 600, `--text-tertiary`)
2. **Value** (22px, weight 800, `--text-primary`)
3. **Change indicator** (11px, weight 600, colored with `--success` or `--error`)
4. **Progress bar** (full width, 5-6px tall, `--surface-alt` background, colored fill)
5. **Progress label** (9-10px, `--text-tertiary`, e.g., "57% to $250K goal")

Progress bar fill colors:
- On track / healthy: `--success`
- Behind / needs attention: `--warning`
- Off track: `--error`
- No goal set: `--accent`

### Buttons

**Primary:** Outlined/ghost style. 1.5px border in `--accent`, text in `--accent`, transparent background. On hover: light accent background (`--accent-light`). Border radius: 8px. Padding: 10px 24px. Font: 13px weight 600.

**Secondary:** 1.5px border in `#ddd`, text in `--text-secondary`. On hover: border darkens. Same sizing as primary.

**Destructive:** 1.5px border in `--error`, text in `--error`. On hover: light error background (`--error-light`).

**Disabled:** Border and text in `--text-disabled`. No hover effect. Cursor: not-allowed.

All buttons use border-radius 8px. No solid fill buttons in the default state.

### Status Indicators (Pill Badges)

Pill-shaped badges with colored background fill and rounded corners (border-radius: 99px).

| State | Background | Text Color | Label |
|---|---|---|---|
| On Track | `--success-light` | `--success` | "On Track" |
| Behind | `--warning-light` | `--warning` | "Behind" |
| Off Track | `--error-light` | `--error` | "Off Track" |
| No Plan | `#f0f0f0` | `#666666` | "No Plan" |

Size: 9-10px, weight 600, padding 3px 10px.

### Inputs

**Standard text inputs:** White background, 1.5px border in `#ddd`, border-radius 6-8px, padding 8-12px. On focus: border color changes to `--accent`, 3px box-shadow ring in `rgba(13, 148, 136, 0.12)`.

**Inline editing:** Click a value to convert it to an editable input in place. The value text style stays consistent, but a subtle underline or background shift indicates editability. Used for quick balance updates during check-ins.

**Dropdowns/selects:** Same styling as text inputs. Custom dropdown panel if needed, styled with `--surface` background and `--canvas` for the overlay.

### Lists (Account/Debt Rows)

Each row is a card-like element:
- Background: `--surface`
- Border-radius: 6-8px
- Padding: 8-12px horizontal, 8-12px vertical
- Margin between rows: 4-6px
- Left side: icon (Font Awesome, `--text-disabled` color, 11-12px) + account name (13-14px, weight 500, `--text-primary`)
- Right side: value (13-14px, weight 700, `--text-primary`) + status pill badge

Rows with sparklines: sparkline chart (100px wide, 40px tall) positioned to the right of the value or replacing the pill badge depending on context.

---

## Icons

**Font Awesome 6** (Solid + Regular). Loaded via CDN.

Usage:
- Navigation icons are not used (text-only nav bar)
- List item icons: `fa-solid` style, 11-12px, colored `--text-disabled` (#cccccc)
- Action icons (add, edit, delete): 13px, colored `--text-secondary`
- Icon-only buttons: 16px icon inside a 32px touch target

Common icon mappings:

| Context | Icon |
|---|---|
| Brokerage/Investments | `fa-chart-line` |
| Bank/401k | `fa-building-columns` |
| Savings | `fa-piggy-bank` |
| Credit card | `fa-credit-card` |
| Auto loan | `fa-car` |
| Mortgage/Home | `fa-house` |
| Student loans | `fa-graduation-cap` |
| Add | `fa-plus` |
| Edit | `fa-pen` |
| Delete | `fa-trash` |
| Export | `fa-download` |
| Settings | `fa-gear` |
| Cooper AI | `fa-robot` |
| Check-in | `fa-clipboard-check` |
| Trending up | `fa-arrow-trend-up` |
| Trending down | `fa-arrow-trend-down` |

---

## Charts & Data Visualization

### Area Charts (Detail/Projection Views)

Used for net worth over time, account balance history, and projection charts.

- Line color: `--success` for positive trends, `--error` for negative
- Area fill: linear gradient from line color at 20% opacity at the top to near-transparent at the bottom
- Line weight: 2px, round line join and cap
- Grid lines: horizontal only, `#f0f0f0`, 1px
- Axis labels: 9px, `--text-disabled`, weight 500
- End dot: solid circle, 3px radius, same color as line
- For projection charts: solid line for actual data, dashed line for projected data

### Sparklines (Compact List Views)

Used inline next to account values in list rows.

- Width: ~100px, Height: ~40px
- Line weight: 1.5px, round join and cap
- Color: `--success` for positive trend, `--warning` for flat/slow, `--error` for negative
- No axes, no labels, no grid. Just the line.

### Projection Charts

Area chart base with additional elements:
- Optimistic/conservative scenarios shown as lighter, semi-transparent area bands
- Milestone markers as vertical dashed lines with labels
- "What if" slider changes animate the chart smoothly

---

## Cooper AI Panel

Floating panel that slides in from the right edge of the viewport.

- Width: 400px (desktop), full width (mobile)
- Background: `--surface`
- No border, separated from main content by the canvas color showing through
- Header: "Cooper" label + close button
- Chat messages: user messages right-aligned with `--accent-light` background, Cooper messages left-aligned with `--surface-alt` background
- Input bar pinned to bottom: text input + send button
- Panel appears with a smooth slide-in animation (200-300ms ease-out)
- Overlay dims the main content slightly when panel is open on mobile

---

## Motion & Animation

Rich animations throughout. Every interactive element should feel responsive.

### Transitions

| Element | Property | Duration | Easing |
|---|---|---|---|
| Buttons (hover) | background, border-color | 150ms | ease |
| Nav items (hover) | color | 150ms | ease |
| Cards (hover) | transform (subtle lift) | 200ms | ease-out |
| Focus rings | box-shadow | 150ms | ease |
| Page transitions | opacity, transform | 250ms | ease-out |
| Cooper panel (open) | transform (translateX) | 250ms | ease-out |
| Cooper panel (close) | transform (translateX) | 200ms | ease-in |

### Chart Animations

- Area charts animate in by drawing the line from left to right (300-500ms) then fading in the gradient fill (200ms)
- Sparklines animate in with a quick left-to-right draw (200ms)
- Progress bars animate from 0 to their target width (400ms, ease-out) on load
- When values update, numbers count up/down to the new value (300ms)

### Page Load

- Stat cards stagger in with a subtle fade + upward slide (each card delayed by 50ms)
- List items stagger similarly (30ms delay per item)
- Charts animate in after cards are visible

### Micro-interactions

- Buttons scale down slightly on press (transform: scale(0.98))
- Checkboxes and toggles have a spring-like animation
- Tooltips fade in with a slight upward motion (150ms)
- Inline edit mode transitions smoothly from display text to input field

---

## Responsive Behavior

| Breakpoint | Layout Changes |
|---|---|
| 1024px+ | Full layout, 3-column stat grid, Cooper panel is side panel |
| 768-1023px | 2-column stat grid, content stacks more vertically |
| Below 768px | Single column, Cooper panel goes full width, simplified nav (hamburger menu) |

Mobile navigation: hamburger icon on the right, opens a full-height slide-in menu from the right.

---

## Do Not

- Do not use borders to separate sections or cards. Ever.
- Do not use drop shadows on any element.
- Do not use any font other than Manrope.
- Do not use solid-fill buttons for standard actions.
- Do not use colors outside the defined palette without adding them to this document first.
- Do not use icons from any set other than Font Awesome 6.
- Do not use rounded corners larger than 12px (except pill badges at 99px).
- Do not use less than 4px spacing between any two elements.
- Do not create elements without hover and focus states.
- Do not skip animations. Every state change should transition smoothly.