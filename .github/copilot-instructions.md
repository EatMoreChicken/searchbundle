# SearchBundle – GitHub Copilot Instructions

> For full product context, vision, and background, see [docs/NORTHSTAR.md](../docs/NORTHSTAR.md).

---

## What This App Is

**SearchBundle** (searchbundle.io) is a periodic financial check-in platform: not a budgeting app, not a bank aggregator. It helps users build wealth, pay off debt, and stay on course toward financial freedom through calm, guided, infrequent check-ins (monthly/quarterly/annual).

It is **manual-entry by design** (no account linking), **forward-looking** (projections and plans, not transaction history), and **AI-native** (the AI companion is central, not bolted on).

---

## Core Philosophy

1. **Check-in, don't check constantly.** Periodic review tool, not a daily habit.
2. **Forward-looking.** Projections and plans over past transactions.
3. **Guided, not overwhelming.** TurboTax-style walkthroughs: the app tells the user what to do next.
4. **Manual by design.** No bank credentials, no account linking. Builds awareness and keeps data private.
5. **AI-native.** The AI companion (named **Cooper**) is the primary way users interact with their data.
6. **Self-explanatory UI.** Every screen should be understandable to a brand-new user without external documentation. Use field-level helper text, `InfoTooltip` components on technical terms, descriptive mode cards (not just labels), natural-language labels that ask questions, and inline worked examples. The goal is zero ambiguity.
7. **Minimize clicks.** Every piece of context the user needs should be immediately visible: no extra click, expand, or hover required to understand an option. Descriptions appear next to choices, not behind them.

---

## UX Patterns

### Self-Explanatory Forms
Every form field that involves a non-obvious concept must include at least one of:
- **Helper text** (always visible below the input): plain-language explanation of what the field does and why it matters
- **Worked example**: a concrete example baked into the helper text (e.g., "At 4%, $80k/year needs $2,000,000 saved")
- **`InfoTooltip`**: for genuinely technical terms (withdrawal rate, inflation, expected return). Appears as a small `info` icon next to the label; tooltip text is shown on hover

### InfoTooltip Component
A reusable inline component for labeling financial/technical terms. Usage:
```tsx
<InfoTooltip>
  The percentage of your portfolio you withdraw each year. The widely accepted "4% rule" means savings should last 30+ years.
</InfoTooltip>
```
- Place inline after a label, inside a `flex items-center` wrapper
- Tooltip displays on hover, dark background (`bg-text-primary`), white text, 64-char width max
- Never use for basic concepts (e.g., "name", "age"): only for terms the average user might not know

### Descriptive Mode Cards
When presenting two or more mutually exclusive modes or options, use visual cards instead of plain toggle buttons or radio inputs. Each card must:
- Have an icon + short title (5 words max)
- Have a one-sentence description in plain language
- Show selection state via background color shift (e.g., `bg-accent-light` when selected)

Example: the mode selector on the dashboard shows "I know my number" vs "I know my lifestyle": no extra click needed to understand what each mode does.

### Field Labels
Write labels as questions or plain statements from the user's perspective:
- ✅ "How much do you want to have saved?"
- ✅ "At what age do you want to reach this goal?"
- ❌ "Target amount ($)"
- ❌ "Target age"

### Live Summary Panels
When a form produces calculated output, show a live summary panel that:
- Is **always visible** (not conditional on all fields being filled): display `-` for unknown values
- Updates in real-time as the user types
- Includes a one-line disclaimer about what assumptions drive the numbers
- Labels each metric with a sub-description ("What to set aside each month")

---

## AI Companion

The AI companion is named **Cooper** (inspired by Interstellar; Cooper knows what the past self should do). Cooper can answer questions about user data, run projections, explain financial concepts, suggest strategies, and guide users through check-ins.

---

## Key Features

- **Dashboard ("Net Worth Tracker")**: Spreadsheet-style monthly grid showing assets, liabilities, totals, and net worth. Users add categories and manually enter monthly balances. Current month highlighted, year selector, inline cell editing.
- **Assets**: Balance cards with manual value tracking, balance update history, and chart. Currently only supports "Simple Account" type (no interest, no growth). More asset types will be added incrementally.
- **Liabilities**: Four account types (Simple Debt, Mortgage, Auto Loan, General Loan). Type-specific dashboards with amortization, PITI breakdown, equity tracking, vehicle value comparison, what-if scenarios, balance history, and notes. Card-based type picker in the add modal.
- **Check-In Flow**: Step-by-step guided update (one account at a time), change detection, goal review, summary, and AI debrief.
- **Plans & Projections**: Contribution schedules, growth rate assumptions, target amounts/dates, "what if" sliders, compound interest calculator.
- **Cooper (AI Companion)**: Available app-wide for Q&A, scenario modeling, suggestions, guided actions, and financial education.
- **Notes & Journal**: Per-account and global notes timeline, searchable, AI-referenceable.
- **Debt Payoff Tools**: Snowball vs. avalanche comparison, payoff timelines, interest savings display, mortgage-specific tools.
- **Property Tracking**: Estimated value, linked debt, equity calculator, equity growth chart.
- **Reports & Insights**: Net worth over time, asset allocation, goal progress, year-in-review, PDF export.

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

## Git Workflow

- **Feature branch naming:** All feature branches use the `feature/` prefix, e.g. `feature/account-settings`, `feature/household-multi-tenancy`. Use lowercase kebab-case after the prefix.
- **Merging to main:** Use the `merge-feature-branch` skill for the full pre-merge checklist (type checks, latest main, cleanup). Never force-push to `main`.
- **Branch cleanup:** Delete the feature branch locally and remotely after a successful merge.

## Coding Practices

- **Clean, readable code.** Prioritize clarity over cleverness. Use descriptive names, consistent formatting, and modular structure.
- Don't add comments unless the logic is complex and requires that we don't want to fill up the codebase with a bunch of comments. 
- **TypeScript with strict typing.** Use interfaces and types to ensure type safety and self-documenting code.
- **No em dashes.** Never use em dashes (—) in any generated text, UI copy, documentation, or comments. Use a colon, comma, period, or restructure the sentence instead.

## SaaS Stack Decisions

### Core Framework
- **Next.js 16** + **React 19** + **TypeScript 5.9**: full-stack framework, handles both frontend and API routes
- Turbopack is the default dev bundler in Next.js 16

### Styling
- **Tailwind CSS v4**: utility-first, CSS-first configuration (no `tailwind.config.js`)
- All design tokens are defined in `apps/web/src/styles/globals.css` via `@theme {}`
- PostCSS plugin is `@tailwindcss/postcss` (not `tailwindcss`). `autoprefixer` is not needed: it is built into Tailwind v4.

### API
- **Fastify 5**: Node.js HTTP server on port 3001 for internal operations and health checks
- **Next.js Route Handlers** handle all user-facing API endpoints (`/api/assets`, `/api/users`, `/api/auth/*`): they use Auth.js session directly and call the DB via `@searchbundle/db`
- Next.js proxies remaining `/api/*` paths to Fastify using `afterFiles` rewrites (so Next.js route handlers always take priority)

### Auth
- **Auth.js v5** (`next-auth@beta`): Credentials provider (email + password), JWT sessions
- Config at `apps/web/src/auth.ts`: exports `{ handlers, auth, signIn, signOut }`
- Auth.js route handler at `apps/web/src/app/api/auth/[...nextauth]/route.ts`
- Route protection via `apps/web/src/middleware.ts` using `auth` as middleware wrapper
- `SessionProvider` wrapped in `apps/web/src/components/SessionProviderWrapper.tsx`, added to root layout
- Sign-in page: `/sign-in`, Sign-up page: `/sign-up`, Reset password: `/reset-password`: all in `(auth)` route group (no sidebar)
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
- `scenarios` have `household_id`: scenarios are household-wide, not individually owned
- On sign-up, a default household ("My Household") is auto-created with the user as owner
- `users` table has `active_household_id` (nullable uuid) tracking which household the user is currently working in
- `users` table has `must_reset_password` (boolean) for invited users who need to set their own password
- Helper function `getHouseholdSession()` at `apps/web/src/lib/auth-helpers.ts`: validates session has userId AND activeHouseholdId, used by all data API routes. Verifies the household exists in the DB; if the JWT carries a stale household ID (e.g. after DB reset), it falls back to the user's first valid household membership and updates `activeHouseholdId`.
- **All API routes use `householdId` for data scoping**: NOT `userId`. The pattern: `getHouseholdSession()` → use `session.householdId` in WHERE clauses and inserts
- Household API routes:
  - `GET /api/households`: list user's households
  - `POST /api/households`: create new household
  - `GET/PATCH/DELETE /api/households/[id]`: manage household (PATCH: name, financialGoalNote; requires admin/owner)
  - `GET /api/households/[id]/members`: list members
  - `POST /api/households/[id]/members`: invite member (creates user if needed with temp password + `mustResetPassword`)
  - `PATCH/DELETE /api/households/[id]/members/[memberId]`: update role / remove member
  - `POST /api/households/switch`: switch active household (updates user's `activeHouseholdId` + JWT session)

### Database
- **PostgreSQL 17** (Docker image: `postgres:17-bookworm`): primary database
- **Drizzle ORM 0.45**: lightweight, type-safe, closer to raw SQL than Prisma
- **drizzle-kit 0.31**: migration tool; config at `packages/db/drizzle.config.ts`
- Schema lives in `packages/db/src/schema.ts`; migrations in `packages/db/migrations/`

### Deployment (self-hosted)
- **Docker**: containerize the app
- **Nginx**: reverse proxy
- **Coolify**: self-hosted deployment UI (Heroku/Vercel-like management layer)

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
- **Assets** (not "accounts"): page `/assets`, API `/api/assets`, TypeScript type `Asset`. DB table stays `accounts` internally.
- **Liabilities** (not "debts"): page `/liabilities`. DB table stays `debts` internally.
- Asset types (DB enum): `investment`, `savings`, `hsa`, `property`, `other`, `simple`
- Currently "Simple Account" (`simple`) and "Investment Account" (`investment`) are exposed in the UI. Other types exist in the DB enum for future use.
- `recharts` is installed in `apps/web` for charts (balance history, investment projections)

### Asset Type System
- **Simple Account** (`simple`): A basic balance-only account with no interest or growth. Used for checking accounts, cash reserves, petty cash, gift cards, etc.
- **Investment Account** (`investment`): An account with expected return rate, variance, and growth projections. Used for 401(k), IRA, brokerage accounts, index funds. Includes return rate (%), variance (+/- %), and inflation adjustment toggle.
- The Add Asset modal uses a **card-based type picker** (not a dropdown) with icon, title, and description for each type.
- Balance updates are tracked in the `balance_updates` table: `id`, `account_id` (FK CASCADE), `previous_balance`, `new_balance`, `change_amount`, `note`, `created_at`.
- Asset detail page features:
  - Large clickable balance display with inline math expression editor (see "Inline Value Editor" pattern below)
  - Asset description (notes) displayed directly below the balance, before Quick Stats
  - Balance history chart (recharts AreaChart) with note markers (amber ReferenceDots that scroll to the note in the timeline on click)
  - **Combined history + projection chart (investment accounts)**: A single `ComposedChart` showing historical balance as a solid area and future projection as dashed lines with variance bands. A "Today" `ReferenceLine` divides history from projection. The x-axis uses **time-based fractional year values** (not sequential integers): history dates map to `(date - earliest) / MS_PER_YEAR` and projection continues from `bridgeX + n`. This prevents visual compression when months of history are plotted alongside decades of projection. Projection years are user-configurable via a `<select>` dropdown (5/10/15/20/30/40/50 years), stored in `localStorage` under key `sb-projection-years`, defaulting to 30 or the user's `projectionEndAge` from their profile.
  - Planned Contributions section (add/edit/delete recurring contributions with label, amount, frequency)
  - Projection chart (simple accounts only): standalone `InvestmentProjectionChart` for simple accounts with contributions (10-year linear projection). Investment accounts no longer use a separate projection chart.
  - Unified activity timeline merging balance updates and standalone notes, sorted by date
  - Quick-add note input in the Activity section for fast annotation
  - Edit modal for name/notes (balance changes go through the inline editor to maintain history). Investment accounts also edit return rate, variance, and inflation toggle.
  - Investment accounts show expected return stat tile in quick stats
  - Add Asset modal uses `max-w-2xl` width (not `max-w-lg`) to accommodate investment account fields without scrolling
- `account_notes` table: `id`, `account_id` (FK CASCADE), `household_id` (FK CASCADE), `content`, `created_at`. Standalone notes attached to an asset.
- `account_contributions` table: `id`, `account_id` (FK CASCADE), `label` (text), `amount` (numeric 14,2), `frequency` (contribution_frequency enum), `created_at`. Multiple recurring contributions per account.
- API routes:
  - Standard CRUD: `GET/POST /api/assets`, `GET/PUT/DELETE /api/assets/[id]`
  - Balance history: `GET /api/assets/[id]/history` (list updates), `POST /api/assets/[id]/history` (create update + change balance)
  - Notes: `GET/POST /api/assets/[id]/notes` (list/create), `DELETE /api/assets/[id]/notes/[noteId]` (delete)
  - Contributions: `GET/POST /api/assets/[id]/contributions` (list/create), `PUT/DELETE /api/assets/[id]/contributions/[contributionId]` (update/delete)
- `PlannedContributions` component (`apps/web/src/components/PlannedContributions.tsx`): Reusable UI for managing recurring contributions. Shows list with inline edit, add form, monthly equivalent total.
- `InvestmentProjectionChart` component (`apps/web/src/components/InvestmentProjectionChart.tsx`): Accepts `contributions: AccountContribution[]` array. Sums annualized contributions for projection. Shows expected line, variance bands (if variance > 0), and inflation-adjusted dashed line (if enabled).
- Dev seed creates 3 simple accounts (Chase Checking, Emergency Fund, Cash Reserve) and 1 investment account (Vanguard 401(k)) with balance update history, sample notes, and planned contributions
- **Quick seed** (`db:seed:quick` / `db:reset:quick`): Minimal seed with completed onboarding (dateOfBirth, retirementAge, retirement target with traditional strategy), 1 simple account (Chase Checking), and 1 investment account (Vanguard 401(k)) with history and contributions. Skips the Getting Started wizard. File: `packages/db/src/seed-dev-quick.ts`.

### Liability Type System
- **Simple Debt** (`simple`): Money owed with no interest. Medical bills, money owed to friends, any balance without loan terms. Only requires name + balance.
- **Mortgage** (`mortgage`): Home loan with daily interest accrual, escrow, PMI, property tax, home insurance, and equity tracking. Default accrual method: `daily`.
- **Auto Loan** (`auto`): Car loan, typically pre-computed (simple) interest. Tracks vehicle value for upside-down detection. Default accrual method: `precomputed`.
- **Loan** (`loan`): General loan (personal, student, etc.) where the user picks the interest accrual method (monthly, daily, or precomputed). Default: `monthly`.
- DB enum `interest_accrual_method` with values `monthly` | `daily` | `precomputed`
- DB enum `debt_type` updated: added `simple` and `loan` to existing values (`mortgage`, `auto`, `student_loan`, `credit_card`, `other`)
- New nullable columns on `debts`: `interest_accrual_method`, `home_value`, `pmi_monthly`, `property_tax_yearly`, `home_insurance_yearly`, `loan_start_date`, `loan_term_months`, `vehicle_value`
- `original_balance`, `interest_rate`, `minimum_payment` are now nullable (not required for simple debts)
- New tables: `debt_balance_updates` (mirrors `balance_updates` for assets), `debt_notes` (mirrors `account_notes`)
- The Add Liability modal uses the same **card-based type picker** pattern as assets: step 1 picks type, step 2 shows type-specific form fields
- Liability detail page adapts per type:
  - Simple: just balance (inline editor), notes, activity timeline. No amortization or interest.
  - Mortgage: PITI breakdown, home equity tracker, amortization chart, what-if scenarios, balance history, notes
  - Auto: vehicle value vs loan balance comparison, upside-down warning, amortization chart, what-if, history, notes
  - Loan: accrual method badge, amortization chart, what-if, history, notes
- Loan calculation engine: `apps/web/src/lib/loan-calculations.ts`
  - `calculateAmortizationMonthly()`: Standard monthly compounding (Balance x Rate/12)
  - `calculateAmortizationDaily()`: Daily accrual (Balance x Rate/365 x ~30.44 days/month)
  - `calculateAmortizationPrecomputed()`: Total interest = Principal x Rate x Term; fixed interest per payment
  - `calculateAmortization()`: Unified dispatcher that picks the right method based on `accrualMethod` parameter
  - `calculateMortgageBreakdown()`: Returns full PITI breakdown (P&I, property tax, insurance, PMI, escrow, total)
  - `calculateEquity()`: Home value minus current balance
  - `estimatePayoffMonths()`: Quick payoff estimate without full amortization schedule
  - `ACCRUAL_METHOD_INFO`: Labels and descriptions for UI display
- API routes:
  - Standard CRUD: `GET/POST /api/liabilities`, `GET/PUT/DELETE /api/liabilities/[id]`
  - Balance history: `GET/POST /api/liabilities/[id]/history` (list/create updates, auto-updates debt balance)
  - Notes: `GET/POST /api/liabilities/[id]/notes` (list/create), `DELETE /api/liabilities/[id]/notes/[noteId]` (delete)
  - Scenarios: `GET/POST /api/liabilities/[id]/scenarios`, `DELETE /api/liabilities/[id]/scenarios/[scenarioId]`
- Dev seed creates 4 liabilities: simple debt (Money owed to Alex), mortgage (Home Mortgage), auto loan (Toyota RAV4), personal loan with balance history and notes

### Inline Value Editor Pattern
Used on the asset detail page for the balance field. Reuse this pattern anywhere a user edits a single numeric value and benefits from quick math.

**Behavior:**
- Clicking the displayed value opens an inline `<input type="text">` pre-filled with the current value.
- The cursor is placed at the **end** of the value (not selected/highlighted), so the user can immediately append an operator.
- On **blur** or **Enter**: the input is parsed and saved. On **Escape**: editing is cancelled without saving.
- A **live preview** (`→ $8,400.00`) appears below the input while the user is typing a valid expression, updated on every keystroke.
- The preview is only shown when the input resolves to a valid expression (not for plain number entry).

**Supported input modes:**
1. **Plain number**: `8500` or `-100` — directly sets the new value.
2. **Full expression**: `8500-100`, `8500+200`, `8500*2`, `8500/4`, or with a negative left operand like `-100+50` — both sides are explicit numbers with an operator between them.
3. **Prefix-operator expressions (NOT supported in this pattern)**: `+200` or `-100` as a standalone shorthand is intentionally excluded. These are ambiguous (does `-100` mean "subtract 100" or "set to -100"?) and cause bugs when a user opens a negative balance, blurs without editing, and watches the value double.

**Expression parsing rules:**
```typescript
// Only full two-operand expressions are treated as math. A leading minus alone is a negative number.
const FULL_EXPR_PATTERN = /^(-?\d+\.?\d*)\s*([+\-*/])\s*(-?\d+\.?\d*)$/;

function isExpression(value: string): boolean {
  const m = value.trim().match(FULL_EXPR_PATTERN);
  if (!m) return false;
  // Operator must appear after position 0, so "-100" (negative number) is never treated as an expression
  return value.trim().indexOf(m[2], 1) > 0;
}

function applyExpression(input: string): number | null {
  const m = input.trim().match(FULL_EXPR_PATTERN);
  if (!m) return null;
  const left = parseFloat(m[1]), right = parseFloat(m[3]);
  if (isNaN(left) || isNaN(right)) return null;
  switch (m[2]) {
    case "+": return left + right;
    case "-": return left - right;
    case "*": return left * right;
    case "/": return right === 0 ? null : left / right;
  }
  return null;
}
```

**Cursor placement on open:**
```typescript
setTimeout(() => {
  const el = inputRef.current;
  if (!el) return;
  const len = el.value.length;
  el.setSelectionRange(len, len);
}, 50);
```

**Live preview (render-time, no extra state):**
```tsx
{(() => {
  const trimmed = inputValue.trim();
  if (!trimmed || !isExpression(trimmed)) return null;
  const result = applyExpression(trimmed);
  if (result === null) return null;
  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="material-symbols-outlined text-[14px] text-primary">arrow_forward</span>
      <span className="text-[13px] font-semibold text-primary">{formatCurrency(result)}</span>
    </div>
  );
})()}
```

### Archive (Assets & Liabilities)
- Both `accounts` and `debts` tables have an `archived_at` (nullable timestamp) column. Null = active, non-null = archived.
- `Asset` and `Debt` TypeScript interfaces include `archivedAt: string | null`.
- **API filtering**: `GET /api/assets` and `GET /api/liabilities` return only active (non-archived) items by default. Pass `?includeArchived=true` query param to return all items.
- **Dashboard exclusion**: The dashboard fetches without `includeArchived`, so archived items are automatically excluded from projections, metrics, and chart data. Contributions on archived assets are also excluded.
- **Archive/unarchive via PUT**: Send `{ archivedAt: "ISO-string" }` to archive, `{ archivedAt: null }` to unarchive, via `PUT /api/assets/[id]` or `PUT /api/liabilities/[id]`.
- **List page UI**: Assets and liabilities list pages fetch with `?includeArchived=true` and split items into active and archived groups. Active items display in the main card grid. Archived items appear in a collapsible "Archived (N)" section below, collapsed by default.
- **Zero-balance indicator**: Active cards with $0 balance show an amber "Balance is zero. Archive this?" prompt using `tertiary-fixed` styling.
- **Archive confirmation modal**: Glassmorphism modal explaining effects (removed from dashboard, contributions/payments paused, data preserved, can be restored).
- **Archived cards**: Rendered with `opacity-60`, `bg-surface-container-low` (instead of `bg-surface-container-lowest`), and grayed icon containers. Show "Archived {date}" label with `inventory_2` icon. Hover actions: unarchive (restore) and delete.
- **Card hover actions**: Active cards show edit, archive (`inventory_2`), and delete buttons on hover. Archived cards show unarchive and delete.
- DB migration: `0015_archive_accounts.sql`

### Net Worth Tracker
- The Net Worth Tracker (`/tracker`) is a spreadsheet-style monthly grid showing assets and liabilities with calculated totals
- Two new DB tables: `net_worth_categories` (rows: asset or liability names) and `net_worth_entries` (monthly balance values per category)
- DB enum `category_type` with values `asset` | `liability`
- `net_worth_entries` has a unique constraint on `(category_id, year, month)`: one value per category per month
- API routes under `/api/dashboard`:
  - `GET /api/dashboard?year=YYYY`: returns categories + entries for the year
  - `POST /api/dashboard/categories`: create a category (name, type)
  - `PUT /api/dashboard/categories/[id]`: rename a category
  - `DELETE /api/dashboard/categories/[id]`: delete category + all its entries (cascade)
  - `PUT /api/dashboard/entries`: upsert a monthly value (categoryId, year, month, value)
- Main UI component: `NetWorthTracker` in `apps/web/src/components/NetWorthTracker.tsx`
- Current month is highlighted with amber styling; past months show as "actual"; future months show dashes
- Users can add/remove categories, inline-edit cell values, switch years, and see auto-calculated totals & net worth
- **Cell math expressions**: Typing `+100`, `-50`, `*2`, or `/4` into a cell resolves the operation against the nearest cell to the left in the same row that has a value. Only the calculated result is saved (no formula persistence). The reference cell is highlighted in amber while typing. An inline tooltip explains the feature on cell open. Logic lives in `NetWorthTracker.tsx` via `EXPR_PATTERN`, `isExpression`, `applyExpression`, and `findLeftValueMonth`.
- The net worth categories are **standalone**: not yet linked to the existing `accounts`/`debts` tables. This will be connected in a future iteration.

### Getting Started Wizard
- Standalone full-screen onboarding flow at `/getting-started` with no sidebar (uses `(onboarding)` route group)
- Layout: `apps/web/src/app/(onboarding)/layout.tsx` (full-screen, no sidebar)
- Page: `apps/web/src/app/(onboarding)/getting-started/page.tsx` (loads user data, renders wizard, redirects to `/dashboard` on completion)
- If user has already completed onboarding (has `dateOfBirth`, `retirementAge`, and a retirement target), visiting `/getting-started` redirects to `/dashboard`
- If user visits `/dashboard` without completing onboarding, they are redirected to `/getting-started`
- **Onboarding Wizard**: Four-step wizard. Component: `OnboardingWizard` in `apps/web/src/components/OnboardingWizard.tsx`. Props: `user: User`, `onComplete: () => void`. Steps:
  - **Step 1: Age**: Year/month/day dropdown selectors (pre-filled ~30 years ago), retirement age slider (default 65) + number input. Live sidebar shows current age, years remaining, life timeline progress bar.
  - **Step 2: Income Target**: Two modes via card selector: "Help me figure it out" (default, annual income in today's dollars with optional expandable monthly expense calculator) and "I already have a number" (direct target amount). Expandable expense categories (Housing, Transportation, Healthcare, etc.) auto-sum to monthly/yearly with inflation adjustment. Assumptions section: inflation (3%), withdrawal rate (4%), expected return (7%) with InfoTooltips. Live sidebar shows portfolio target, monthly/annual savings, years to go.
  - **Step 3: Strategy Selection**: Five savings strategy cards ordered best-to-worst. Each card shows icon, title, subtitle, "Best for" tag, mini ComposedChart (portfolio area + contribution line) with hover tooltips, and year 1/final monthly preview. Component: `StrategySelection` in `apps/web/src/components/StrategySelection.tsx`.
  - **Step 4: Strategy Configurator**: Full customization page with strategy-specific sliders, dual-axis ComposedChart extending to age 100 (portfolio + contribution over time), vertical draggable retirement-age marker (ReferenceLine), live summary panel with on-track indicator, collapsible purchasing power details (inflation-adjusted values, annual/monthly withdrawal in nominal and today's dollars), reset buttons (global + per-slider), and "Change Strategy" back button. Component: `StrategyConfigurator` in `apps/web/src/components/StrategyConfigurator.tsx`. The configurator propagates assumption changes (annual return, inflation rate, retirement age) back to the parent wizard via callbacks.
  - On completion, saves to `PATCH /api/users/me` (birthday + retirement age) and `PUT /api/retirement-target` (financial target + strategy fields).
- **Savings Strategies**: Five approaches to reaching the financial independence target, ordered best-to-worst:
  - **Front-Loaded**: High contributions early, lower later. Two phases with configurable phase 1 monthly amount and duration.
  - **Coast FIRE**: Aggressive saving for a set number of years, then $0 contributions. Uses binary search to find phase 1 amount that reaches target with compound growth alone after contributions stop.
  - **Barista FIRE**: Two-phase approach, both phases have contributions. Phase 1 is aggressive, phase 2 is reduced.
  - **Traditional**: Flat monthly amount for the entire period. Uses standard PMT formula.
  - **Back-Loaded**: Starts low, increases contributions by a configurable annual percentage (e.g. 5%/year).
- **Strategy calculation engine**: Pure functions in `apps/web/src/lib/retirement-strategies.ts`. Key functions: `simulateGrowth()` (month-by-month simulation), `solveStartingAmount()` (binary search solver), `calculateStartingMonthly()`, `getStrategyDefaults()`, `generateSchedule()`, `getScheduleWithOverride()`, `getExtendedSchedule()` (generates data from current age to `maxAge`, with $0 contributions post-retirement; accepts optional `maxAge` parameter, default 100), `getFinalValue()`, `getStrategySummary()`, `getMiniChartData()`. Exports `STRATEGY_LIST` constant with metadata for all 5 strategies (name, subtitle, icon, description, bestFor).
- **Post-onboarding dashboard**: Redirects to the main dashboard (`/dashboard`), which shows the full "single pane of glass" layout: greeting, key metrics strip, hero savings trajectory chart with asset projections overlay, and asset cards. See the Dashboard section below for full details.

### Dashboard
- The dashboard (`/dashboard`) is the primary landing page after sign-in: a "single pane of glass" overview of the user's financial position
- If the user hasn't completed onboarding, the dashboard redirects to `/getting-started`
- **Full-width layout**: No `max-w-3xl` constraint. Dashboard uses the full available width (`p-6 space-y-6`)
- **Hero header**: Gradient banner with decorative blurred circles (`from-primary-fixed/40 via-surface-container-lowest to-secondary-fixed/30`). Contains greeting ("Hey {firstName}") and Edit Target button. The on-track status badge was intentionally removed; the chart communicates this visually.
- **Key metrics strip**: Two rows when a retirement target exists:
  - **Primary row** (4 tiles): Target, Target Age, Monthly Savings, Annual Savings
  - **Secondary row** (3 tiles): Net Worth (color-coded: green if positive, red if negative), Total Assets (green), Total Liabilities (red if > 0)
  - The secondary "position" row also appears standalone (without the target row) when user has assets or debts but no retirement target.
- **Chart mode toggle**: Two modes: "Summary" (default) and "Detailed".
  - **Summary mode**: Only Plan area fill + Net Worth area. Clean, easy to understand.
  - **Detailed mode**: All 4 series visible: Plan, Assets (green dashed), Liabilities (red dashed), Net Worth (solid teal line on top).
  - Tooltip always shows full breakdown (Plan, Net Worth, Assets, Liabilities, ahead/behind) regardless of mode.
- **Hero savings trajectory chart**: 400px tall `ComposedChart` (recharts) showing:
  - Plan area fill (teal gradient, solid 2.5px stroke): the idealized savings schedule
  - Net Worth area (teal, lighter gradient) in summary mode, or line (solid teal 2.5px) in detailed mode
  - Asset projection area (green, dashed, semi-transparent): only in detailed mode
  - Liability projection area (red, dashed): only in detailed mode. Line stops rendering once all debts reach $0 (no trailing flat line).
  - "Today" `ReferenceLine` at current age (gray dashed, `insideTopLeft` position to avoid clipping)
  - Retirement age `ReferenceLine` (amber dashed, `insideTopRight` position to avoid clipping)
  - Chart top margin: 30px (prevents label clipping)
  - Legend below chart: uses colored dots (not thin lines) for better contrast. Net Worth dot has a teal fill with mint border to distinguish from Plan.
- **Time window controls**: Segmented controls with a dropdown for flexible year ranges:
  - **Focused** (default): `currentAge - 5` to `currentAge + 10`
  - **Year dropdown** (5/10/15/20/25 years): `currentAge - 2` to `currentAge + N`. Select element styled as a pill.
  - **Full Plan**: All ages from currentAge to `projectionEndAge`
- **Asset cards**: Grid of cards (1-4 columns responsive) linking to individual asset detail pages. Shows type icon, name, balance, and expected return for investments.
- **Liability cards**: Grid of cards (1-4 columns responsive) linking to individual liability detail pages. Shows type-specific icon (home, car, receipt, etc.), name, balance, interest rate, and monthly payment. Only shown when user has liabilities.
- **No-target prompt**: CTA card shown when no retirement target exists
- **No-asset prompt**: CTA shown in asset cards section when user has no accounts
- **Edit mode**: Inline form configurator with mode selector, inputs, live summary, and save/cancel buttons. Replaces the metrics strip and chart while editing.
- **Financial Independence Target**: Guided configurator for long-term savings goals. Two modes:
  - **Fixed Amount**: user enters a total target amount and target age
  - **Income Replacement**: user enters desired annual retirement income, safe withdrawal rate (default 4%), and target age. Portfolio target = `annualIncome / withdrawalRate`.
- Inflation adjustment: currently disabled for dashboard projections. All numbers shown in nominal dollars. The `INFLATION_RATE` constant and edit-mode inflation UI are preserved for future re-enablement.
- **Live summary panel** (edit mode only): Shows portfolio target, years remaining, required monthly savings (PMT formula), required annual savings. Updates in real-time as user adjusts inputs.
- **PMT formula**: `monthlySavings = target x r / ((1 + r)^n - 1)` where `r = expectedReturn/12`, `n = years x 12`
- **Asset projection utility**: `apps/web/src/lib/asset-projections.ts` contains:
  - `buildHistorical(asset, history)`: builds chronological timeline from balance updates
  - `projectAsset(asset, history, contributions, yearsForward, currentAge, currentYear)`: full projection for one asset (linear for simple, compound for investment)
  - `mergeProjections(projections, yearsForward, currentAge, currentYear)`: sums all asset projections by year
  - `projectDebt(debt, yearsForward, currentAge, currentYear)`: projects a single debt forward. Simple debts stay flat; debts with `minimumPayment` + `interestRate` amortize monthly to $0.
  - `mergeDebtProjections(projections, yearsForward, currentAge, currentYear)`: sums all debt projections by year
  - `buildDashboardChartData(planData, assetProjectedTotal, liabilityProjectedTotal, currentAge)`: merges plan schedule + asset projections + liability projections into unified `DashboardChartPoint[]` with `netWorth`, `liabilityTotal`, `projectedTotal`, and `planValue` fields
  - `calculateOnTrackStatus(planValue, netWorth)`: returns `OnTrackInfo` with status, label, ratio. Uses net worth (assets - liabilities), not just asset total.
- Dashboard fetches all user assets + their history + contributions on load, plus all liabilities via `GET /api/liabilities`.
- DB table: `retirement_targets` (one per household, UNIQUE on `household_id`)
- DB enum: `target_mode` with values `fixed` | `income_replacement`
- DB enum: `savings_strategy` with values `front_loaded` | `coast_fire` | `barista_fire` | `traditional` | `back_loaded`
- DB columns on `retirement_targets` for strategy: `savings_strategy` (enum, default `traditional`), `strategy_phase1_monthly` (numeric 14,2), `strategy_phase1_years` (integer), `strategy_phase2_monthly` (numeric 14,2), `strategy_annual_change_rate` (numeric 5,4). All nullable except `savings_strategy`.
- API routes:
  - `GET /api/retirement-target`: fetch household's target (or `null`), includes strategy fields
  - `PUT /api/retirement-target`: upsert (create or update) the household's target, accepts `savingsStrategy`, `strategyPhase1Monthly`, `strategyPhase1Years`, `strategyPhase2Monthly`, `strategyAnnualChangeRate`

### Account Settings
- Settings page at `/settings`: four sections: Profile, Personal & Financial, Household, Security
- DB: `users` table has extra profile columns: `date_of_birth` (date), `timezone` (text, default `America/Chicago`), `preferred_currency` (text, default `USD`), `retirement_age` (integer), `projection_end_age` (integer, default 100)
- `projection_end_age` controls how far age-based charts extend (dashboard savings trajectory, StrategyConfigurator). Min 50, max 120.
- DB: `households` table has `financial_goal_note` (text): moved from users to households
- API routes:
  - `GET /api/users/me`: returns full user profile (excludes passwordHash, includes activeHouseholdId)
  - `PATCH /api/users/me`: update name, email, dateOfBirth, timezone, preferredCurrency, retirementAge, projectionEndAge
  - `POST /api/users/me/password`: change password; requires `{ currentPassword, newPassword }`. Also clears `mustResetPassword`.
- Household section in settings: rename household, edit financial goal, manage members, invite new members, switch between households
- Navigation is a top horizontal navbar (`Navbar.tsx`), not a sidebar. Sticky to top. Contains: logo, nav items (Dashboard, Tracker, Assets, Liabilities, Cooper, Settings), household switcher, user menu with sign-out.
- Mobile: hamburger menu opens a slide-down nav overlay.
- Active nav item uses `text-accent` with a 2px bottom accent bar. Inactive items use `text-text-tertiary`.

---

## Design System

**Before building any new UI, read [docs/DESIGN.md](../docs/DESIGN.md) in full.** It is the single source of truth for all visual and interaction decisions: color tokens, typography, spacing, component patterns, motion, and iconography. Do not guess or invent design decisions that are not covered there. If something is missing, add it to DESIGN.md before implementing.

Key rules at a glance (see DESIGN.md for full detail):
- **No borders, no shadows.** Depth comes from background color shifts only. Tooltips and floating overlays may use `shadow-lg`.
- **Font:** Manrope only, weights 400-800. Never use any other font.
- **Icons:** Font Awesome 6 (Solid). Loaded via CDN. Use `<i className="fa-solid fa-{name}" />` for static icons, `<i className={`fa-solid ${variable}`} />` for dynamic. Never use Material Symbols or any other icon set.
- **Colors:** Use only the tokens defined in `globals.css` and DESIGN.md:
  - Backgrounds: `bg-canvas` (page), `bg-surface` (cards), `bg-surface-alt` (nested)
  - Text: `text-text-primary`, `text-text-secondary`, `text-text-tertiary`, `text-text-disabled`
  - Accent: `text-accent`, `bg-accent`, `bg-accent-light`, `bg-accent-hover`, `border-accent`
  - Semantic: `text-success`/`bg-success-light`, `text-error`/`bg-error-light`, `text-warning`/`bg-warning-light`
- **Navigation:** Top horizontal navbar (`Navbar.tsx`), NOT a sidebar. Component: `apps/web/src/components/Navbar.tsx`.
- **Buttons:** Ghost/outlined style by default. No solid-fill buttons. 1.5px border in accent, text in accent.
- **Motion:** Every state change must transition smoothly. CSS defaults in globals.css handle button/link transitions (150ms ease).
- **Spacing:** 4px base unit. All spacing is a multiple of 4.
- **Rounded corners:** Max `rounded-xl` (12px) for cards and containers. `rounded-[99px]` for pill badges only.
- **Cursor:** Always add `cursor-pointer` to clickable non-button elements.