# Dashboard Redesign: Required Changes

## Data We Have
- **Assets**: 4 accounts, $103,200 total
- **Liabilities**: 4 liabilities, $315,850 total
- **Target**: $5.6M by age 65
- **Monthly savings needed**: $3,125
- **Annual savings needed**: $37,496

## Data We Don't Have (Yet)
- Take-home income
- Monthly cash flow breakdown
- Interest vs principal split on debt payments
- Investment growth/returns
- Savings rate percentage

---

## Section-by-Section Changes

### 1. Monthly Momentum Hero ✅
- **Keep**: The concept of showing a single positive progress number
- **Change**: Since we don't have income data, the momentum number should be calculated as the **month-over-month change in assets + month-over-month reduction in liabilities**
- **Breakdown items**: Show "Asset Growth" and "Debt Reduction" as the two components instead of savings/debt paydown/investment growth
- **Streak**: Track consecutive months where total progress is positive
- **vs last month**: Compare this month's progress to the prior month's progress

### 2. Stats Row ✅
- **Remove**: Savings rate (requires income data)
- **Remove**: "of take-home pay" descriptor
- **Keep**: This Year total, Annual Target, Target/Age
- **Replace savings rate with**: Month-over-month net worth change (framed positively)

### 3. Monthly Cash Flow ✅
- **Remove entirely** for now (requires income data to be meaningful)
- **Replace with**: A month-over-month asset breakdown showing each account's change this month (e.g., 401k +$800, brokerage +$200, savings +$2,125)

### 4. Debt Paydown Progress ✅
- **Keep as-is** in concept
- **Change**: We won't know the principal vs interest split, so just show the month-over-month balance reduction on each liability
- **Change label**: "paid this month" instead of "principal this month"
- **Keep**: Progress bars showing % paid off (current balance vs original balance, if we track original)
- **Note**: If we don't store the original loan amount, we need to either ask the user to input it or just show the monthly reduction without the progress bar

### 5. Goal Progress Bar ✅
- **Keep as-is**
- **Change**: "On track for" age projection should be calculated from current trajectory (assets growth rate extrapolated)

### 6. Savings Trajectory Chart ✅
- **Keep as-is**
- Already based on asset data we have

---

## New Data Points to Start Tracking
To make the dashboard work with month-over-month comparisons, we need to store:

1. **Monthly snapshots** of each asset account balance
2. **Monthly snapshots** of each liability balance
3. **Original loan amounts** for each liability (user input or first recorded value)
4. **Monthly net worth** history for streak/trend calculations

## Future Enhancements (When Income Data Is Available)
- Re-add Monthly Cash Flow section
- Add savings rate metric
- Split debt payments into principal vs interest
- Show true "building wealth" vs "cost of borrowing" breakdown