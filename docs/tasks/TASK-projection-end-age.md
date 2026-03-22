# TASK: Projection End Age Setting

## Summary
Added a configurable "projection end age" setting that controls how far age-based charts extend. Previously, charts stopped at the retirement age or were hardcoded to age 100. Now the dashboard savings trajectory and StrategyConfigurator both extend to the user's configured projection end age (default 100), with a vertical reference line marking retirement age.

## Changes

### Database
- **`packages/db/src/schema.ts`**: Added `projectionEndAge` column (integer, NOT NULL, default 100) to `users` table
- **`packages/db/migrations/0010_projection_end_age.sql`**: Migration adding the column
- **`packages/db/migrations/meta/_journal.json`**: Updated with migration entry

### Types
- **`apps/web/src/types/index.ts`**: Added `projectionEndAge: number` to `User` interface

### API
- **`apps/web/src/app/api/users/me/route.ts`**: Added `projectionEndAge` to GET select, PATCH body parsing, PATCH update, and PATCH returning

### Strategy Engine
- **`apps/web/src/lib/retirement-strategies.ts`**: `getExtendedSchedule()` now accepts optional `maxAge` parameter (default 100) instead of hardcoding `const maxAge = 100`

### Dashboard
- **`apps/web/src/app/(app)/dashboard/page.tsx`**: 
  - Switched from `getScheduleWithOverride` to `getExtendedSchedule` for the savings trajectory chart
  - Chart extends to `user.projectionEndAge` (or 100 if not set)
  - Added vertical `ReferenceLine` at retirement age with "Retire {age}" label
  - Tooltip shows post-retirement indicator for ages past retirement

### Settings
- **`apps/web/src/app/(app)/settings/page.tsx`**: Added "Projection end age" number input (min 50, max 120) in the Personal & Financial section with descriptive help text

### Onboarding / StrategyConfigurator
- **`apps/web/src/components/StrategyConfigurator.tsx`**: Added optional `projectionEndAge` prop (defaults to 100), passed to `getExtendedSchedule()`
- **`apps/web/src/components/OnboardingWizard.tsx`**: Passes `user.projectionEndAge` to StrategyConfigurator

### Copilot Instructions
- **`.github/copilot-instructions.md`**: Updated Account Settings section with `projection_end_age` column details and updated strategy engine / dashboard descriptions

## Charts Not Affected
- **StrategySelection mini charts**: Normalized sparklines (0 to 1 scale), not age-based
- **InvestmentProjectionChart**: Uses year-horizon selector (1Y/5Y/10Y/20Y/30Y), not age-based
- **AmortizationChart**: Month-based loan payoff timeline, not age-based
