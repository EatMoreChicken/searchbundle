# Investment Accounts and Projections

**Status**: Completed

## Description

Add investment account support and projection capabilities across all account types. This includes:

1. **Investment Account Type**: Expose the existing `investment` type in the UI with return rate, variance, and projection chart.
2. **Recurring Contributions (all account types)**: Allow users to define one or more recurring contributions per account (e.g., $1,000/month + $100/week). These drive projection calculations.
3. **Simple Account Projection**: Show a flat accumulation chart (no growth rate) based on current balance + recurring contributions.
4. **Investment Account Projection**: Show a growth chart with expected return, best/worst case bands (from variance), and inflation-adjusted line.

## Motivation

Users track balances manually but want to see forward-looking projections of where their accounts are heading. Simple accounts need a basic "if I keep contributing X per month, what does this look like?" chart. Investment accounts need compound growth projections with configurable return rates and variance ranges. Supporting multiple recurring contributions per account handles real-world scenarios (e.g., bi-weekly paycheck deposits + monthly employer match).

## Key Design Decisions

- **"Planned Contributions"** is the user-facing name for recurring additions (clear, forward-looking, not bank jargon).
- Multiple contributions per account stored in a separate `account_contributions` table (not inline on the account row). The existing single `contributionAmount`/`contributionFrequency` on the `accounts` table will be deprecated in favor of the new table.
- The `InvestmentProjectionChart` component is updated to accept an array of contributions and sum their annualized totals.
- Simple accounts get a simpler chart (linear accumulation, no return rate). Investment accounts get the full chart with variance bands.
- Projection horizon: 10 years default, configurable.

## Implementation Plan

### Phase 1: Database Schema

**New table: `account_contributions`**
```sql
CREATE TABLE account_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  frequency contribution_frequency NOT NULL DEFAULT 'monthly',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

**Migration file**: `0013_account_contributions.sql`

**Schema update**: Add `accountContributions` to `packages/db/src/schema.ts`, export from `index.ts`.

### Phase 2: API Routes

**`/api/assets/[id]/contributions`**
- `GET`: List all contributions for an asset (ordered by created_at)
- `POST`: Create a contribution `{ label, amount, frequency }`

**`/api/assets/[id]/contributions/[contributionId]`**
- `PUT`: Update `{ label, amount, frequency }`
- `DELETE`: Remove a contribution

### Phase 3: TypeScript Types

Add to `apps/web/src/types/index.ts`:
```typescript
export interface AccountContribution {
  id: string;
  accountId: string;
  label: string;
  amount: number;
  frequency: ContributionFrequency;
  createdAt: string;
}
```

### Phase 4: Simple Account - Projection Section

On the simple account detail page, add a "Projection" section:
- Shows a linear accumulation chart: current balance + sum of all contributions over time
- Uses a simplified chart (single line, no variance bands)
- Only visible when the account has at least one planned contribution
- "Add your first planned contribution to see a projection" empty state

### Phase 5: Investment Account - Full UI

**Assets list page:**
- Add "Investment Account" to `ASSET_TYPES` array (icon: `trending_up`, description about stocks, ETFs, retirement accounts)
- Investment-specific fields in the add modal: expected annual return (%), return rate variance (+/-%), inflation adjustment toggle

**Investment detail page:**
- All features of simple account (balance display, history chart, timeline, notes)
- Plus: "Growth Projection" section with `InvestmentProjectionChart`
- Investment settings section: return rate, variance, inflation toggle (editable inline)
- Projection uses all planned contributions summed together

### Phase 6: Update InvestmentProjectionChart

- Accept `contributions: AccountContribution[]` array instead of single amount/frequency
- Sum annualized contributions: `totalAnnual = sum(contribution.amount * FREQ_MULTIPLIER[contribution.frequency])`
- Keep existing FV formula, just use summed annual contribution
- For simple accounts: render a simplified version (returnRate = 0, no variance)

### Phase 7: Planned Contributions UI Component

Reusable component for both simple and investment accounts:
- List of current contributions with label, amount, frequency, delete button
- "Add Contribution" form: label input, amount input, frequency selector
- Inline editing of existing contributions
- Shows total monthly equivalent at the bottom

### Phase 8: Seed Data

- Add an investment account to seed data (e.g., "Vanguard 401(k)")
- Add 2-3 contributions per seeded account
- Balance history for the investment account

## Edge Cases

- Zero contributions: show empty state with CTA to add first contribution
- Investment account with 0% return rate: degrades to simple linear projection
- Negative contributions: should be allowed (e.g., monthly expense deductions)
- Currency formatting: use account's currency setting
- Very large projections: use abbreviated format ($1.2M, $500K)
- Multiple contributions with different frequencies: all annualized and summed for projection

## Test Steps

1. **Create a simple account**: Verify it works as before (no projection section visible initially)
2. **Add a planned contribution to simple account**: Add "$500/month" contribution. Verify projection chart appears showing linear accumulation over 10 years.
3. **Add multiple contributions**: Add a second contribution "$100/week". Verify chart updates to include both.
4. **Edit/delete contributions**: Edit the amount, change frequency, delete one. Verify chart updates.
5. **Create an investment account**: Select "Investment Account" type, fill in return rate (7%), variance (2%), enable inflation toggle.
6. **Verify investment projection**: Check that the chart shows expected line, variance band, and inflation-adjusted dashed line.
7. **Add contributions to investment account**: Add "$1,000/month" and "$200/biweekly". Verify projection includes compound growth.
8. **Check seeded data**: Run `npm run db:reset` and verify the seeded investment account has contributions, history, and projections.
9. **Verify notes/balance features work on investment accounts**: Notes, balance updates, chart markers should all work identically to simple accounts.
