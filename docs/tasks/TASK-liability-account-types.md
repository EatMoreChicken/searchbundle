# Liability Account Types: Simple, Mortgage, Auto Loan, General Loan

## Description

Implement a comprehensive liability type system similar to how assets have different types (simple, investment). This adds:

1. **Simple Liability**: A basic "I owe someone money" entry with no interest or amortization. Just a balance owed.
2. **Mortgage (Home Loan)**: Daily interest accrual, escrow breakdowns (property tax, homeowners insurance, PMI), original home price tracking, equity display.
3. **Auto Loan (Car Loan)**: Pre-computed (simple) interest accrual, typical for vehicle financing.
4. **General Loan**: A flexible loan type where the user picks their interest accrual method (monthly, daily, or simple/pre-computed). Covers personal loans, student loans, etc.

## Motivation

The current system treats all liabilities the same with a single amortization model. In reality, different loan types accrue interest differently, have different payment structures, and different metadata that is useful to track. Mortgages have escrow, property tax, PMI, and home value. Car loans use pre-computed interest. Users also need a way to track simple debts (money owed to a friend) that have no interest at all.

## Key Decisions

### Interest Accrual Methods
- **Monthly (standard amortization)**: Interest = balance x (annualRate / 12). Used by most traditional loans. This is the existing behavior.
- **Daily accrual**: Interest = balance x (annualRate / 365). Mortgages typically use this method. Difference from monthly is small but real.
- **Pre-computed (simple interest)**: Total interest is calculated upfront and added to the principal. Each payment reduces a fixed total. Common for auto loans from dealerships and some personal loans.

### Debt Type Restructuring
Current DB enum: `mortgage | student_loan | auto | credit_card | other`
New DB enum: `simple | mortgage | auto | loan`

- `simple`: No interest, no amortization. Just a balance. (Credit cards and "someone owes me" debts)
- `mortgage`: Home loan with daily interest accrual, escrow support, home value tracking
- `auto`: Car loan typically with pre-computed interest
- `loan`: General loan with user-selectable interest accrual method

We keep backward compatibility by mapping `student_loan`, `credit_card`, and `other` to `loan` via migration.

### New DB Columns on `debts` table
- `interest_accrual_method`: enum (`monthly` | `daily` | `precomputed`) - how interest is calculated
- `home_value`: numeric(14,2) - original purchase price of home (mortgage only)
- `pmi_monthly`: numeric(10,2) - private mortgage insurance per month (mortgage only)
- `property_tax_yearly`: numeric(10,2) - annual property tax (mortgage only)
- `home_insurance_yearly`: numeric(10,2) - annual homeowners insurance (mortgage only)
- `loan_start_date`: date - when the loan originated
- `loan_term_months`: integer - original full term of the loan in months
- `vehicle_value`: numeric(14,2) - current estimated vehicle value (auto only)

### Balance Updates & Notes for Debts
Currently, `balance_updates` and `account_notes` only reference `accounts` (assets). We need equivalent tables for debts:
- `debt_balance_updates`: same structure as `balance_updates` but with `debt_id` FK
- `debt_notes`: same structure as `account_notes` but with `debt_id` FK

### Payment Breakdown Display
For each loan type, the detail page shows:
- **Mortgage**: Principal + Interest, Property Tax escrow, Insurance escrow, PMI (if applicable), Total monthly payment
- **Auto**: Principal + Interest, Total monthly payment
- **Loan**: Principal + Interest (with accrual method noted), Total monthly payment
- **Simple**: Just the balance owed, no payment breakdown

## Implementation Plan

### Phase 1: Database Schema Changes
1. Add new enum: `interest_accrual_method` (`monthly` | `daily` | `precomputed`)
2. Update `debt_type` enum by adding `simple` and `loan`, then migrate existing data
3. Add new columns to `debts` table
4. Create `debt_balance_updates` table
5. Create `debt_notes` table
6. Run migration

### Phase 2: TypeScript Types & API
1. Update `Debt` interface in types/index.ts
2. Add new types: `DebtBalanceUpdate`, `DebtNote`, `InterestAccrualMethod`
3. Update liability API routes (GET/POST/PUT) to handle new fields
4. Add API routes: debt balance history, debt notes
5. Update parseDebt function to handle new fields

### Phase 3: Loan Calculation Engine
1. Create `apps/web/src/lib/loan-calculations.ts` with:
   - `calculateAmortizationMonthly()` - existing standard amortization
   - `calculateAmortizationDaily()` - daily interest accrual
   - `calculateAmortizationPrecomputed()` - pre-computed/simple interest
   - `calculateMortgagePaymentBreakdown()` - full PITI breakdown
   - `calculateEquity()` - for mortgage (home value - remaining balance)
   - Helper: `getAccrualMethodForType()` - default accrual per debt type

### Phase 4: UI - Add Liability Modal Refactor
1. Replace dropdown type selector with card-based picker (matching asset pattern)
2. Type cards: Simple Debt, Mortgage, Auto Loan, Loan
3. Conditional fields per type:
   - Simple: name, balance, notes only
   - Mortgage: all loan fields + home value, escrow fields
   - Auto: all loan fields + vehicle value
   - Loan: all loan fields + accrual method picker

### Phase 5: Liability Detail Pages
1. **Simple debt detail**: Balance display with inline editor, notes timeline
2. **Mortgage detail**: Full PITI breakdown, equity tracker, amortization chart, escrow breakdown, what-if scenarios, balance history, notes
3. **Auto loan detail**: Payment breakdown, amortization chart, vehicle value vs remaining balance, what-if scenarios, balance history, notes
4. **Loan detail**: Payment breakdown with accrual method explanation, amortization chart, what-if scenarios, balance history, notes

### Phase 6: Seed Data Update
1. Update seed-dev.ts to include sample liabilities of each type
2. Update seed-dev-quick.ts if needed

## Accrual Method Explainers (for UI)

**Monthly (Standard Amortization)**
Interest is calculated once per month on the outstanding balance. Most common for fixed-rate loans.
Formula: Monthly Interest = Balance x (Annual Rate / 12)

**Daily Accrual**
Interest is calculated every day on the outstanding balance, then summed for the month. Common for mortgages. Paying early in the month saves more interest.
Formula: Daily Interest = Balance x (Annual Rate / 365)

**Pre-computed (Simple Interest)**
Total interest for the life of the loan is calculated upfront and added to the principal. Your payment amount is fixed regardless of when you pay. Common for auto loans from dealerships.
Formula: Total Interest = Principal x Annual Rate x (Term in Years)

## Test Steps

1. **Simple Liability**: Add a simple debt "Money owed to friend" with balance $500, no interest. Verify it shows on the list and detail pages with no amortization chart.
2. **Mortgage**: Add a mortgage with $300,000 balance, $350,000 home value, 6.5% rate, 30yr term, $500 escrow. Verify PITI breakdown, equity display, daily accrual amortization.
3. **Auto Loan**: Add an auto loan with $25,000 balance, 5.9% rate, 60mo term. Verify pre-computed interest display and amortization.
4. **General Loan**: Add a personal loan with $10,000 balance, 8% rate, select monthly accrual. Verify accrual method explanation shows.
5. **Balance Updates**: On a mortgage detail page, update the balance. Verify history shows the change.
6. **Notes**: Add notes to each liability type. Verify timeline shows them.
7. **What-If Scenarios**: On a mortgage, test extra payment scenarios. Verify months saved and interest saved calculations.
8. **Existing Data**: Verify any existing liabilities still display correctly after migration.
