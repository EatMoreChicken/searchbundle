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

- **Dashboard ("Net Worth Tracker")** — Spreadsheet-style monthly grid showing assets, liabilities, totals, and net worth. Users add categories and manually enter monthly balances. Current month highlighted, year selector, inline cell editing.
- **Assets** — Balance cards with history, contribution plans, growth assumptions, projection charts, on-track status, and notes. Types: investment, savings, HSA, property, other.
- **Liabilities** — Balance cards with loan terms, payoff projections, amortization view, and interest saved calculators.
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
- **Next.js Route Handlers** handle all user-facing API endpoints (`/api/assets`, `/api/users`, `/api/auth/*`) — they use Auth.js session directly and call the DB via `@searchbundle/db`
- Next.js proxies remaining `/api/*` paths to Fastify using `afterFiles` rewrites (so Next.js route handlers always take priority)

### Auth
- **Auth.js v5** (`next-auth@beta`) — Credentials provider (email + password), JWT sessions
- Config at `apps/web/src/auth.ts` — exports `{ handlers, auth, signIn, signOut }`
- Auth.js route handler at `apps/web/src/app/api/auth/[...nextauth]/route.ts`
- Route protection via `apps/web/src/middleware.ts` using `auth` as middleware wrapper
- `SessionProvider` wrapped in `apps/web/src/components/SessionProviderWrapper.tsx`, added to root layout
- Sign-in page: `/sign-in`, Sign-up page: `/sign-up`, Reset password: `/reset-password` — all in `(auth)` route group (no sidebar)
- `apps/web` depends on `@searchbundle/db` directly for auth + route handler DB access
- Passwords hashed with **bcryptjs** (12 rounds)
- JWT session carries `activeHouseholdId` and `mustResetPassword` alongside standard user fields
- Middleware redirects `mustResetPassword` users to `/reset-password` (except auth/user API routes)
- Dev fixture users: `dev@searchbundle.io` / `password123` (owner), `partner@searchbundle.io` / `password123` (member). Re-run `npm run db:seed` to set.

### Household Multi-Tenancy
- **All data is scoped to households, not individual users.** Users are for auth only; data ownership is at the household level.
- DB tables: `households` (id, name, financialGoalNote, createdBy, createdAt), `household_members` (id, householdId, userId, role, joinedAt)
- DB enum `household_role` with values `owner` | `admin` | `member`
- `accounts`, `debts`, `scenarios`, `check_ins`, `net_worth_categories` all have `household_id` (NOT NULL, FK → households CASCADE)
- `accounts` and `debts` also have `owner_id` (nullable, FK → users SET NULL) for optional per-item ownership labeling (shared vs individual)
- `scenarios` have `household_id` — scenarios are household-wide, not individually owned
- On sign-up, a default household ("My Household") is auto-created with the user as owner
- `users` table has `active_household_id` (nullable uuid) tracking which household the user is currently working in
- `users` table has `must_reset_password` (boolean) for invited users who need to set their own password
- Helper function `getHouseholdSession()` at `apps/web/src/lib/auth-helpers.ts` — validates session has userId AND activeHouseholdId, used by all data API routes
- **All API routes use `householdId` for data scoping** — NOT `userId`. The pattern: `getHouseholdSession()` → use `session.householdId` in WHERE clauses and inserts
- Household API routes:
  - `GET /api/households` — list user's households
  - `POST /api/households` — create new household
  - `GET/PATCH/DELETE /api/households/[id]` — manage household (PATCH: name, financialGoalNote; requires admin/owner)
  - `GET /api/households/[id]/members` — list members
  - `POST /api/households/[id]/members` — invite member (creates user if needed with temp password + `mustResetPassword`)
  - `PATCH/DELETE /api/households/[id]/members/[memberId]` — update role / remove member
  - `POST /api/households/switch` — switch active household (updates user's `activeHouseholdId` + JWT session)

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

### Domain / Route Names
- **Assets** (not "accounts") — page `/assets`, API `/api/assets`, TypeScript type `Asset`. DB table stays `accounts` internally.
- **Liabilities** (not "debts") — page `/liabilities`. DB table stays `debts` internally.
- Asset types: `investment`, `savings`, `hsa`, `property`, `other`
- Investment assets have extra projection fields: `contributionAmount`, `contributionFrequency`, `returnRate`, `returnRateVariance`, `includeInflation`
- `recharts` is installed in `apps/web` for investment projection charts (`InvestmentProjectionChart` component)

### Net Worth Tracker (Dashboard)
- The dashboard (`/dashboard`) is a spreadsheet-style **Net Worth Tracker** showing a monthly grid of assets and liabilities with calculated totals
- Two new DB tables: `net_worth_categories` (rows: asset or liability names) and `net_worth_entries` (monthly balance values per category)
- DB enum `category_type` with values `asset` | `liability`
- `net_worth_entries` has a unique constraint on `(category_id, year, month)` — one value per category per month
- API routes under `/api/dashboard`:
  - `GET /api/dashboard?year=YYYY` — returns categories + entries for the year
  - `POST /api/dashboard/categories` — create a category (name, type)
  - `PUT /api/dashboard/categories/[id]` — rename a category
  - `DELETE /api/dashboard/categories/[id]` — delete category + all its entries (cascade)
  - `PUT /api/dashboard/entries` — upsert a monthly value (categoryId, year, month, value)
- Main UI component: `NetWorthTracker` in `apps/web/src/components/NetWorthTracker.tsx`
- Current month is highlighted with amber styling; past months show as "actual"; future months show dashes
- Users can add/remove categories, inline-edit cell values, switch years, and see auto-calculated totals & net worth
- The net worth categories are **standalone** — not yet linked to the existing `accounts`/`debts` tables. This will be connected in a future iteration.

### Account Settings
- Settings page at `/settings` — four sections: Profile, Personal & Financial, Household, Security
- DB: `users` table has extra profile columns: `date_of_birth` (date), `timezone` (text, default `America/Chicago`), `preferred_currency` (text, default `USD`), `retirement_age` (integer)
- DB: `households` table has `financial_goal_note` (text) — moved from users to households
- API routes:
  - `GET /api/users/me` — returns full user profile (excludes passwordHash, includes activeHouseholdId)
  - `PATCH /api/users/me` — update name, email, dateOfBirth, timezone, preferredCurrency, retirementAge
  - `POST /api/users/me/password` — change password; requires `{ currentPassword, newPassword }`. Also clears `mustResetPassword`.
- Household section in settings: rename household, edit financial goal, manage members, invite new members, switch between households
- Settings link is in the Sidebar footer (icon: `manage_accounts`)

---

# SearchBundle - Styling Guide ("The Financial Sanctuary")

## Design Philosophy

The UI is a "sanctuary" — soft, layered, breathable. We reject the banking-as-a-fortress aesthetic. Surfaces feel physical, like frosted glass and floating paper. Depth comes from **layered backgrounds**, not drop shadows. Boundaries come from **color shifts**, not border lines.

**Key principles:**
- **No-Line Rule**: Borders are prohibited for sectioning content. Use background color shifts between surface layers instead.
- **Zero-Shadow Lift**: Stack surface tokens (`surface-container-low` card on `surface` background) for clean depth without shadows.
- **Organic Asymmetry & Tonal Depth**: Avoid rigid grids where possible. The interface should feel fluid and breathable.
- **Glass & Gradient**: Hero sections and primary CTAs use subtle radial gradients. Floating elements use glassmorphism (80% opacity + 20px backdrop-blur).

## Font (Google Fonts)

Single font family:
```
Manrope (all weights: 200–800)
```

### Usage Rules
- **Display & Headlines**: `display-lg` (3.5rem / 56px) and `headline-lg` (2rem / 32px). Letter-spacing: -0.02em for a premium, editorial look. Weight 800 (extrabold).
- **Titles & Cards**: `title-md` (1.125rem / 18px). Used for nav items, card headings. Weight 700.
- **Body**: `body-lg` (1rem / 16px). Primary readable text. Weight 400–500.
- **Labels & Meta**: `label-sm` (0.75rem / 12px). Uppercase with `tracking-widest` for overlines and small labels. Weight 600–700.
- **Large monetary values**: 3rem–3.75rem (48–60px), weight 900 (black), tracking tight (-0.02em).
- **Medium monetary values**: 1.875rem (30px), weight 700.

## Colors

The palette is anchored in growth (Teal) and warmth (Amber). These are not mere accents — they serve as light sources within the UI.

```css
/* Surface Hierarchy (layered backgrounds) */
--surface: #f7faf8;                    /* Base canvas — the sanctuary */
--surface-container-low: #f1f4f2;      /* Primary containers, sidebar */
--surface-container: #ebefed;           /* Secondary containers */
--surface-container-high: #e6e9e7;      /* Interactive sandbox backgrounds */
--surface-container-highest: #e0e3e1;   /* Progress tracks, divider replacements */
--surface-container-lowest: #ffffff;    /* Elevated cards ("floating paper") */

/* Text */
--on-surface: #181c1b;                 /* Primary text, headings */
--on-surface-variant: #3e4947;         /* Secondary text, descriptions */
--outline-variant: #bdc9c7;            /* Ghost borders (20% opacity) for accessibility */

/* Primary (Teal) */
--primary: #006761;                    /* Primary interactive: buttons, links, active states */
--primary-container: #15827b;          /* Gradient endpoint, hover states */
--on-primary: #ffffff;                 /* Text on primary backgrounds */
--primary-fixed: #96f3e9;              /* Light teal fills */

/* Secondary (Mint) */
--secondary: #2c6956;                  /* Secondary actions */
--secondary-container: #aeedd5;        /* Secondary button backgrounds */
--on-secondary-container: #316d5b;     /* Text on secondary containers */
--secondary-fixed: #b1efd8;            /* Chart fills, list highlights */

/* Tertiary (Amber) — for curiosity-driven / "Aha!" elements */
--tertiary: #805200;                   /* Sandboxes, sliders, insight accents */
--tertiary-container: #9d6a1b;         /* Warm CTA backgrounds */
--tertiary-fixed: #ffddb5;             /* Insight card backgrounds */
--on-tertiary-fixed-variant: #643f00;  /* Text on tertiary surfaces — high-value insights */

/* Error */
--error: #ba1a1a;                      /* Alerts, off-track, negative */
--error-container: #ffdad6;            /* Error badge backgrounds */
--on-error-container: #93000a;         /* Text on error containers */

/* Cooper AI — uses --primary (teal) in the new system, not indigo */
```

### Color Usage Rules
- **Surface layering** defines depth: `surface` → `surface-container-low` → `surface-container-lowest`. Inner cards float on outer containers.
- **Primary (Teal)** is the signature color: main buttons, active navigation, chart lines, focus rings.
- **Secondary (Mint)** for secondary buttons and positive context (asset growth percentages).
- **Tertiary (Amber)** for curiosity and insight elements: sandbox sliders, "What if?" badges, projection results. Use `on-tertiary-fixed-variant` (#643f00) for high-value insight text.
- **No 1px borders for layout.** "Ghost borders" (outline-variant at 20% opacity) only when required for accessibility (e.g., input fields on focus).
- Never use pure black (#000000). Always `on-surface` (#181c1b).
- Change indicators: positive values get `secondary` (mint green), negative get `error` (red).

## Spacing & Layout

- **Page padding**: 24px (1.5rem) on all sides within the main content area.
- **Section spacing**: 48px (3rem) vertical gaps between major sections.
- **Card padding**: 32px (2rem) internal padding. Hero bento cards: 32–48px.
- **Border-radius**: `1rem` (16px) default for all cards/containers. `9999px` (full) for buttons and pills. `2rem` (32px) for large panels and sidebar.
- **No card borders.** Elevation is achieved by surface layering, not `border: 1px solid`.
- **Grid gaps**: 24px (1.5rem) between cards in a bento grid.
- **Generous whitespace is non-negotiable.** Use `spacing-6` (2rem) as the base unit when in doubt.

## Components

### Buttons
- **Primary**: Soft gradient from `primary` (#006761) to `primary-container` (#15827b). Text `on-primary` (#fff). Rounded `9999px` (full pill) or `1rem`. No shadow — use a subtle inner glow at 10% opacity.
- **Secondary**: `secondary-container` (#aeedd5) background with `on-secondary-container` (#316d5b) text. Rounded full.
- **Hover**: `translate-x-1` for nav items, `scale-105` for CTAs. Active: `scale-95`.

### Inputs
- **Never use a bottom line.** Use `surface-container-high` (#e6e9e7) fill with border-radius `1rem`.
- **On focus**: background transitions to `surface-container-lowest` (#fff) with a ghost border of `primary`.
- Font: Manrope for all inputs.

### Cards
- **Default**: `surface-container-low` (#f1f4f2) background on `surface` (#f7faf8) canvas. No border.
- **Elevated/Active**: `surface-container-lowest` (#ffffff) — floating paper effect.
- **No shadow on static cards.** Only floating elements (FABs, modals) get ambient shadows: `on-surface` (#181c1b) at 6% opacity, blur 30–40px, Y offset 8px.

### Lists
- **No divider lines / horizontal rules.** Use vertical spacing (1.4rem gap) and alternating backgrounds (`surface-container-low` / `surface-container`) for list separation.

### Sidebar Navigation
- Background: `surface-container-low` with a rounded right edge (`rounded-r-[32px]`).
- Active item: `surface-container-lowest` (#fff) background, `primary` text, rounded full pill, subtle shadow.
- Inactive items: `on-surface` text, no background. Hover: `translate-x-1` + `bg-white/50`.
- Icons: Material Symbols Outlined (not Font Awesome).

### Charts & Data Visualization
- Primary line/bar color: `primary` (#006761).
- Fill/area: `primary-fixed` (#96f3e9) at 50% opacity.
- Grid lines: `outline-variant` (#bdc9c7) at 0.5px, dashed.
- Axis labels: Manrope, 11px, `on-surface-variant`.
- Track backgrounds: `surface-container-highest` (#e0e3e1).

### The "Sandbox" Slider
- Thick track: `surface-container-highest` (#e0e3e1).
- Thumb: large circle in `tertiary` (#805200).
- Value labels: `tertiary` color for immediate feedback.

## Iconography

- Use **Material Symbols Outlined** (Google) throughout — not Font Awesome.
- Variable font settings: `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24`.
- Filled variant (`'FILL' 1`) for active/selected states and decorative hero icons.
- Icons inside colored circles: 48px circle with semantic background + contrasting icon color.

## Glassmorphism

For floating navigation, modal overlays, and projection result cards:
- Background: `surface-container-lowest` with 80% opacity.
- Backdrop filter: `blur(20px)`.
- Optional: `border border-white/20`.

## Micro-Animations

- **Hover on nav items**: `translate-x-1` over 0.3s.
- **Hover on CTAs**: `scale-105`, active: `scale-95`.
- **Abstract background elements**: `group-hover:scale-110`, duration 0.7s.
- **No bounce, no overshoot.** Calm transitions only. Ease or ease-out.

## Do's and Don'ts

### Do
- Use whitespace as a structural tool. If in doubt, add more.
- Use `tertiary` (Amber) for curiosity-driven elements ("What if you saved $100 more?").
- Use asymmetrical layouts — place a large display-size number off-center for an editorial vibe.
- Define boundaries through background color shifts, not lines.

### Don't
- Use 100% black (#000000) for text. Use `on-surface` (#181c1b).
- Use sharp corners. Everything is `1rem` radius minimum, `9999px` for pills.
- Use standard 1px borders for content separation.
- Use standard modal overlays. Use glassmorphism to keep the UI light and interconnected.
- Use Font Awesome. Use Material Symbols Outlined.