# SearchBundle – GitHub Copilot Instructions

> For full product context, vision, and background, see [docs/NORTHSTAR.md](../docs/NORTHSTAR.md).

---

## What This App Is

**SearchBundle** (searchbundle.io) is a periodic financial check-in platform — not a budgeting app, not a bank aggregator. It helps users build wealth, pay off debt, and stay on course toward financial freedom through calm, guided, infrequent check-ins (monthly/quarterly/annual).

It is **manual-entry by design** (no account linking), **forward-looking** (projections and plans, not transaction history), and **AI-native** (the AI companion is central, not bolted on).

---

## Core Philosophy

1. **Check-in, don't check constantly.** Periodic review tool, not a daily habit.
2. **Forward-looking.** Projections and plans over past transactions.
3. **Guided, not overwhelming.** TurboTax-style walkthroughs — the app tells the user what to do next.
4. **Manual by design.** No bank credentials, no account linking. Builds awareness and keeps data private.
5. **AI-native.** The AI companion (named **Cooper**) is the primary way users interact with their data.

---

## AI Companion

The AI companion is named **Cooper** (a reference to Interstellar — Cooper has been to the future and knows what the past self should do). Cooper can answer questions about user data, run projections, explain financial concepts, suggest strategies, and guide users through check-ins.

---

## Key Features

- **Dashboard ("Your Position")** — Net worth with trend line, assets panel, debts panel, on-track indicators, next check-in reminder.
- **Accounts & Assets** — Balance cards with history, contribution plans, growth assumptions, projection charts, on-track status, and notes.
- **Debts & Liabilities** — Balance cards with loan terms, payoff projections, amortization view, and interest saved calculators.
- **Check-In Flow** — Step-by-step guided update (one account at a time), change detection, goal review, summary, and AI debrief.
- **Plans & Projections** — Contribution schedules, growth rate assumptions, target amounts/dates, "what if" sliders, compound interest calculator.
- **Cooper (AI Companion)** — Available app-wide for Q&A, scenario modeling, suggestions, guided actions, and financial education.
- **Notes & Journal** — Per-account and global notes timeline, searchable, AI-referenceable.
- **Debt Payoff Tools** — Snowball vs. avalanche comparison, payoff timelines, interest savings display, mortgage-specific tools.
- **Property Tracking** — Estimated value, linked debt, equity calculator, equity growth chart.
- **Reports & Insights** — Net worth over time, asset allocation, goal progress, year-in-review, PDF export.

---

## Pricing Model

- **Free tier:** Up to 3 accounts, basic projections, limited Cooper interactions.
- **Pro tier (~$7–10/mo or $69–89/yr):** Unlimited accounts, full projections, unlimited Cooper, reports, collaboration, data export.
- No aggressive in-app upselling. Annual pricing should offer 30%+ savings over monthly.

---

## What This App Is NOT

- Not a budgeting app (no transaction categorization)
- Not a bank aggregator (no account linking or credentials)
- Not a robo-advisor (no investment management)
- Not a daily-use app (periodic check-ins by design)

## Coding Practices

- **Clean, readable code.** Prioritize clarity over cleverness. Use descriptive names, consistent formatting, and modular structure.
- Don't add comments unless the logic is complex and requires that we don't want to fill up the codebase with a bunch of comments. 
- **TypeScript with strict typing.** Use interfaces and types to ensure type safety and self-documenting code.

## SaaS Stack Decisions

### Core Framework
- **Next.js 16** + **React 19** + **TypeScript 5.9** — full-stack framework, handles both frontend and API routes
- Turbopack is the default dev bundler in Next.js 16

### Styling
- **Tailwind CSS v4** — utility-first, CSS-first configuration (no `tailwind.config.js`)
- All design tokens are defined in `apps/web/src/styles/globals.css` via `@theme {}`
- PostCSS plugin is `@tailwindcss/postcss` (not `tailwindcss`). `autoprefixer` is not needed — it is built into Tailwind v4.

### API
- **Fastify 5** — Node.js HTTP server on port 3001 for internal operations and health checks
- **Next.js Route Handlers** handle all user-facing API endpoints (`/api/accounts`, `/api/users`, `/api/auth/*`) — they use Auth.js session directly and call the DB via `@searchbundle/db`
- Next.js proxies remaining `/api/*` paths to Fastify using `afterFiles` rewrites (so Next.js route handlers always take priority)

### Auth
- **Auth.js v5** (`next-auth@beta`) — Credentials provider (email + password), JWT sessions
- Config at `apps/web/src/auth.ts` — exports `{ handlers, auth, signIn, signOut }`
- Auth.js route handler at `apps/web/src/app/api/auth/[...nextauth]/route.ts`
- Route protection via `apps/web/src/middleware.ts` using `auth` as middleware wrapper
- `SessionProvider` wrapped in `apps/web/src/components/SessionProviderWrapper.tsx`, added to root layout
- Sign-in page: `/sign-in`, Sign-up page: `/sign-up` — both in `(auth)` route group (no sidebar)
- `apps/web` depends on `@searchbundle/db` directly for auth + route handler DB access
- Passwords hashed with **bcryptjs** (12 rounds)
- Dev fixture user: `dev@searchbundle.io` / `password123` (re-run `npm run db:seed` to set hash)

### Database
- **PostgreSQL 17** (Docker image: `postgres:17-bookworm`) — primary database
- **Drizzle ORM 0.45** — lightweight, type-safe, closer to raw SQL than Prisma
- **drizzle-kit 0.31** — migration tool; config at `packages/db/drizzle.config.ts`
- Schema lives in `packages/db/src/schema.ts`; migrations in `packages/db/migrations/`

### Deployment (self-hosted)
- **Docker** — containerize the app
- **Nginx** — reverse proxy
- **Coolify** — self-hosted deployment UI (Heroku/Vercel-like management layer)

---

### Deferred (add when needed)
| Tool | Purpose |
|------|---------|
| Stripe | Payments and billing |
| Redis | Caching, session storage |
| BullMQ | Background job queues (requires Redis) |
| Sentry | Error monitoring |
| PostHog | Product analytics |

---

# SearchBundle - Styling Guide

## Fonts (Google Fonts)

Load all four:
```
DM Serif Display (display/headlines)
Syne (headings, balances, brand elements)
Plus Jakarta Sans (body, UI, buttons, labels)
JetBrains Mono (monospace: data labels, overlines, financial figures in tables)
```

### Usage Rules
- **DM Serif Display**: Hero text, large page titles, welcome messages, empty states. Never below 24px.
- **Syne**: Section headings, account names, monetary values (balances, net worth), card titles. Weights 600-800. Use letter-spacing: -0.5px to -1px on larger sizes.
- **Plus Jakarta Sans**: Everything else. Body copy, buttons, form labels, navigation, descriptions. Default weight 400, medium 500 for UI labels, 600-700 for buttons and emphasis.
- **JetBrains Mono**: Overline labels (e.g., "NET WORTH", "STEP 3 OF 5"), percentage changes, dates, metadata, projection parameters. Always 12-14px. Use with uppercase + letter-spacing: 1-2px for overlines.

### Font Sizes
- Page titles: 48-56px (DM Serif Display)
- Section titles: 26-32px (DM Serif Display)
- Card titles / account names: 18-20px (Syne, weight 700)
- Large monetary values: 36-42px (Syne, weight 700-800, letter-spacing: -1px)
- Medium monetary values: 20-24px (Syne, weight 700)
- Body text: 14-15px (Plus Jakarta Sans)
- Small labels / meta: 12-13px (Plus Jakarta Sans, weight 500-600)
- Monospace labels: 11-12px (JetBrains Mono, uppercase, letter-spacing: 1.2px)

## Colors

```css
/* Backgrounds */
--bg: #FAFAF8;              /* Page background, warm off-white */
--surface: #F5F3EF;          /* Cards, sidebars, input backgrounds */
--surface-elevated: #FFFFFF;  /* Modals, popovers, elevated cards */

/* Text */
--text: #1A1A1A;             /* Primary text, headings */
--text-secondary: #6B6B6B;   /* Descriptions, secondary info */
--text-tertiary: #9A9A9A;    /* Placeholders, disabled, timestamps */

/* Semantic */
--green: #4A7C59;            /* Positive trends, on-track, success */
--green-light: #E8F0EA;      /* Green badges, backgrounds */
--amber: #C4842D;            /* Caution, warnings, needs attention */
--amber-light: #FDF3E7;      /* Amber badges, backgrounds */
--red: #B54A4A;              /* Alerts, off-track, negative trends */
--red-light: #FDEAEA;        /* Red badges, backgrounds */

/* Brand */
--teal: #2A7C8E;             /* Primary accent, interactive elements, links, charts */
--teal-light: #E6F3F5;       /* Teal badges, hover states, chart fills */
--indigo: #5B6ABF;           /* Cooper AI, AI-related elements */
--indigo-light: #EEEDF7;     /* Cooper chat bubbles, AI badges */

/* Borders & Dividers */
--border: #E8E5DF;           /* Card borders, dividers, input borders */
```

### Color Usage Rules
- Backgrounds are always warm (off-white/cream), never pure white or cool gray.
- Status indicators: green = on track, amber = needs attention, red = off track. Use the light variant as background with the full color as text/icon.
- Teal is the primary interactive color: buttons, links, active states, chart lines, focus rings.
- Indigo is reserved exclusively for Cooper AI: avatar, chat bubbles, AI badges, AI-related CTAs.
- Primary buttons use --text (near-black) background with --bg text. Not teal.
- Never use pure black (#000000). Always --text (#1A1A1A).
- Change indicators: positive values get --green, negative get --red. Display inside a pill with the light variant background (e.g., green text on green-light background, border-radius: 100px, padding: 3px 10px).

## Spacing & Layout

- **Page padding**: 48px horizontal on desktop, 24px on mobile.
- **Section spacing**: 120-160px vertical padding between major sections.
- **Card padding**: 24-36px internal padding. Never less than 18px.
- **Card border-radius**: 12-16px for cards, 8-10px for buttons/inputs, 100px for pills/badges.
- **Card borders**: 1px solid var(--border). Elevated cards get box-shadow instead: `0 1px 3px rgba(0,0,0,0.04), 0 24px 68px rgba(0,0,0,0.06)`.
- **Grid gaps**: 14-24px between sibling cards. 28-32px between major content blocks.
- **Generous whitespace is non-negotiable.** When in doubt, add more space, not less.

## Components

### Buttons
- **Primary**: background --text, color --bg, padding 14-16px 28-36px, border-radius 10px, font-weight 600, font-size 14-15px. Hover: translateY(-1px) + subtle shadow.
- **Secondary**: transparent background, 1.5px solid --border, same padding/radius. Hover: background --surface, border-color --text-secondary.
- **Small/inline**: Same patterns but padding 10px 20px, font-size 13px.

### Inputs
- Border: 1.5px solid --border, border-radius 10px, padding 14-16px 18-20px.
- Background: var(--bg).
- Focus: border-color var(--teal). No outline, no glow.
- Font: Plus Jakarta Sans for most inputs. Syne weight 700 for large monetary inputs.

### Cards
- Background: var(--surface) for inline cards (inside a page), var(--surface-elevated) for standalone/modal cards.
- Border: 1px solid var(--border).
- Border-radius: 12-16px.
- Hover (if interactive): translateY(-4px), box-shadow: 0 12px 40px rgba(0,0,0,0.06).

### Status Pills
- Border-radius: 100px. Padding: 3px 10px. Font-size: 12-13px, weight 600.
- Green: color --green, background --green-light.
- Amber: color --amber, background --amber-light.
- Red: color --red, background --red-light.

### Sidebar Navigation
- Active item: background --surface, color --text, border-radius 8px.
- Inactive: no background, color --text-secondary.
- Icons: Font Awesome. 14px, fixed 18px width for alignment.
- Section labels: 10px uppercase, letter-spacing 1.2px, color --text-tertiary, margin-bottom 16px.

### Charts & Data Visualization
- Primary line/bar color: --teal.
- Fill/area: --teal-light at 50% opacity.
- Grid lines: --border at 0.5px, dashed.
- Axis labels: JetBrains Mono, 10-11px, color --text-tertiary.
- Current/active data point: solid --teal dot with a larger semi-transparent ring behind it.
- Secondary/conservative lines: --border, dashed.

## Micro-Animations

- **Scroll reveals**: Elements fade in and translate up 20-30px. Duration 0.5-0.7s, ease timing. Stagger siblings by 100ms.
- **Hover on cards**: translateY(-4px) over 0.3s.
- **Hover on buttons**: translateY(-1px) to -2px, add shadow.
- **Chart lines (SVG)**: Animate stroke-dashoffset for a draw-on effect, 1.5-2s ease.
- **Bar charts**: Animate height from 0 to target, 0.6-1s ease, stagger each bar by 50ms.
- **Status dot pulse**: Opacity 1 to 0.4, 2s infinite (used for Cooper "online" indicator).
- **Page transitions**: Prefer slide (translateX) over fade for step-by-step flows like check-ins.
- **No bounce, no overshoot.** Keep everything calm and smooth. Ease or ease-out only.

## Iconography

- Use **Font Awesome 6** throughout.
- Prefer solid style (fa-solid) for navigation and status. Regular style (fa-regular) for secondary/inactive states.
- Icon size in nav/sidebar: 14px. In feature cards: 20px. In buttons: match font-size or slightly smaller.
- Icons inside colored boxes: Use the light color variant as background with the full color for the icon. Box: 48px square, border-radius 12px.

## General Rules

1. One purpose per screen. Don't pack multiple unrelated sections together.
2. Progressive disclosure. Show summaries first, details on click/expand.
3. No pure decorative elements. Every visual element should communicate something.
4. All monetary values use Syne with negative letter-spacing for a tight, confident look.
5. Overline pattern for section context: JetBrains Mono, 12px, uppercase, letter-spacing 2px, color --teal. Appears above section titles.
6. Empty states should use DM Serif Display for the heading and feel warm/encouraging, not clinical.
7. Cooper AI elements always use --indigo. If Cooper is speaking or referenced, indigo is present.
8. Dark mode: invert --bg to #1A1A1A, --surface to #242420, --surface-elevated to #2E2E28, --text to #FAFAF8, --border to #3A3A34. Keep semantic colors (green, amber, red, teal, indigo) the same but bump lightness slightly for contrast.