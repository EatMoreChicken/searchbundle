// Asset & liability projection utilities for the dashboard chart.
// Projects simple and investment accounts into the future based on their
// current balance, contributions, and (for investments) expected return rate.
// Projects debts forward based on minimum payments and interest rates.

import type { Asset, BalanceUpdate, AccountContribution, ContributionFrequency, Debt } from "@/types";

const FREQ_MULTIPLIER: Record<ContributionFrequency, number> = {
  weekly: 52,
  biweekly: 26,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};

export interface AssetHistoryPoint {
  date: Date;
  value: number;
}

export interface AssetYearlyPoint {
  year: number;
  age: number;
  value: number;
}

export interface AssetProjectionResult {
  assetId: string;
  assetName: string;
  assetType: string;
  currentBalance: number;
  historical: AssetHistoryPoint[];
  yearly: AssetYearlyPoint[]; // from currentYear forward
}

function annualizeContributions(contributions: AccountContribution[]): number {
  return contributions.reduce(
    (sum, c) => sum + c.amount * (FREQ_MULTIPLIER[c.frequency] ?? 12),
    0,
  );
}

function monthlyFromAnnual(annual: number): number {
  return annual / 12;
}

/**
 * Build historical timeline from balance updates + current balance.
 * Returns chronological points. Includes the account creation as the first
 * data point if there's no earlier update, and today's balance as the last.
 */
export function buildHistorical(
  asset: Asset,
  history: BalanceUpdate[],
): AssetHistoryPoint[] {
  const points: AssetHistoryPoint[] = [];

  // Sort updates chronologically (oldest first)
  const sorted = [...history].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  if (sorted.length > 0) {
    // First update's previousBalance is the earliest known value
    points.push({
      date: new Date(sorted[0].createdAt),
      value: sorted[0].previousBalance,
    });

    for (const update of sorted) {
      points.push({
        date: new Date(update.createdAt),
        value: update.newBalance,
      });
    }
  }

  // Always add today's balance as final point
  const now = new Date();
  const lastPoint = points[points.length - 1];
  if (!lastPoint || lastPoint.value !== asset.balance || now.getTime() - lastPoint.date.getTime() > 86_400_000) {
    points.push({ date: now, value: asset.balance });
  }

  return points;
}

/**
 * Project a simple account forward: balance grows linearly by contributions only.
 */
function projectSimple(
  currentBalance: number,
  monthlyContribution: number,
  years: number,
  currentAge: number,
  currentYear: number,
): AssetYearlyPoint[] {
  const points: AssetYearlyPoint[] = [];
  let balance = currentBalance;

  // Year 0 = now
  points.push({ year: currentYear, age: currentAge, value: Math.round(balance) });

  for (let y = 1; y <= years; y++) {
    balance += monthlyContribution * 12;
    points.push({
      year: currentYear + y,
      age: currentAge + y,
      value: Math.round(balance),
    });
  }

  return points;
}

/**
 * Project an investment account forward: compound growth + contributions.
 */
function projectInvestment(
  currentBalance: number,
  monthlyContribution: number,
  annualReturn: number,
  years: number,
  currentAge: number,
  currentYear: number,
): AssetYearlyPoint[] {
  const points: AssetYearlyPoint[] = [];
  const r = annualReturn / 12;
  let balance = currentBalance;

  points.push({ year: currentYear, age: currentAge, value: Math.round(balance) });

  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + r) + monthlyContribution;
    }
    points.push({
      year: currentYear + y,
      age: currentAge + y,
      value: Math.round(balance),
    });
  }

  return points;
}

/**
 * Build a full projection for one asset.
 */
export function projectAsset(
  asset: Asset,
  history: BalanceUpdate[],
  contributions: AccountContribution[],
  yearsForward: number,
  currentAge: number,
  currentYear: number,
): AssetProjectionResult {
  const historical = buildHistorical(asset, history);
  const annualContrib = annualizeContributions(contributions);
  const monthly = monthlyFromAnnual(annualContrib);

  let yearly: AssetYearlyPoint[];

  if (asset.type === "investment" && asset.returnRate != null && asset.returnRate > 0) {
    yearly = projectInvestment(
      asset.balance,
      monthly,
      asset.returnRate / 100,
      yearsForward,
      currentAge,
      currentYear,
    );
  } else {
    yearly = projectSimple(
      asset.balance,
      monthly,
      yearsForward,
      currentAge,
      currentYear,
    );
  }

  return {
    assetId: asset.id,
    assetName: asset.name,
    assetType: asset.type,
    currentBalance: asset.balance,
    historical,
    yearly,
  };
}

/**
 * Merge multiple asset projections into a single "total" yearly series.
 * Returns year-by-year combined value starting from the current year.
 */
export function mergeProjections(
  projections: AssetProjectionResult[],
  yearsForward: number,
  currentAge: number,
  currentYear: number,
): AssetYearlyPoint[] {
  const points: AssetYearlyPoint[] = [];

  for (let y = 0; y <= yearsForward; y++) {
    let total = 0;
    for (const proj of projections) {
      const pt = proj.yearly.find((p) => p.year === currentYear + y);
      if (pt) {
        total += pt.value;
      }
    }
    points.push({
      year: currentYear + y,
      age: currentAge + y,
      value: Math.round(total),
    });
  }

  return points;
}

// ─── Debt Projection ─────────────────────────────────────────────────────────

export interface DebtProjectionResult {
  debtId: string;
  debtName: string;
  debtType: string;
  currentBalance: number;
  yearly: AssetYearlyPoint[]; // balance from currentYear forward (decreasing)
}

/**
 * Project a single debt forward.
 * - Simple debts (no interest/payment): flat balance (user pays off manually)
 * - Debts with minimumPayment + interestRate: amortize monthly until $0
 * - Debts with minimumPayment but no interest: linear payoff
 */
export function projectDebt(
  debt: Debt,
  yearsForward: number,
  currentAge: number,
  currentYear: number,
): DebtProjectionResult {
  const points: AssetYearlyPoint[] = [];
  let balance = debt.balance;

  if (balance <= 0) {
    // Already paid off: flat at 0
    for (let y = 0; y <= yearsForward; y++) {
      points.push({ year: currentYear + y, age: currentAge + y, value: 0 });
    }
    return { debtId: debt.id, debtName: debt.name, debtType: debt.type, currentBalance: debt.balance, yearly: points };
  }

  const payment = debt.minimumPayment ?? 0;
  const rate = (debt.interestRate ?? 0) / 100;
  const monthlyRate = rate / 12;

  // Year 0 = now
  points.push({ year: currentYear, age: currentAge, value: Math.round(balance) });

  for (let y = 1; y <= yearsForward; y++) {
    for (let m = 0; m < 12; m++) {
      if (balance <= 0) { balance = 0; break; }

      if (payment <= 0) {
        // No scheduled payment: balance stays flat
        break;
      }

      if (rate > 0) {
        // Interest accrual then payment
        const interest = balance * monthlyRate;
        balance = balance + interest - payment;
      } else {
        // No interest: simple linear payoff
        balance = balance - payment;
      }

      if (balance < 0) balance = 0;
    }
    points.push({
      year: currentYear + y,
      age: currentAge + y,
      value: Math.round(Math.max(0, balance)),
    });
  }

  return { debtId: debt.id, debtName: debt.name, debtType: debt.type, currentBalance: debt.balance, yearly: points };
}

export function mergeDebtProjections(
  projections: DebtProjectionResult[],
  yearsForward: number,
  currentAge: number,
  currentYear: number,
): AssetYearlyPoint[] {
  const points: AssetYearlyPoint[] = [];

  for (let y = 0; y <= yearsForward; y++) {
    let total = 0;
    for (const proj of projections) {
      const pt = proj.yearly.find((p) => p.year === currentYear + y);
      if (pt) total += pt.value;
    }
    points.push({
      year: currentYear + y,
      age: currentAge + y,
      value: Math.round(total),
    });
  }

  return points;
}

// ─── Combined Chart Data ─────────────────────────────────────────────────────

export interface DashboardChartPoint {
  year: number;
  age: number;
  planValue: number | null;
  planMonthlyContribution: number | null;
  actualTotal: number | null;
  projectedTotal: number | null;
  liabilityTotal: number | null;
  netWorth: number | null;
}

/**
 * Build the unified chart dataset combining the retirement plan schedule
 * and the merged asset projections.
 *
 * - planData: from getExtendedSchedule (retirement strategy)
 * - assetProjectedTotal: merged yearly asset projections
 * - currentAge: user's current age
 *
 * Returns a year-by-year series where:
 * - `actualTotal` is populated only for the current year (the "today" anchor)
 * - `projectedTotal` is populated from the current year onward
 * - `planValue` comes from the strategy schedule
 */
export function buildDashboardChartData(
  planData: { age: number; year: number; portfolioValue: number; monthlyContribution: number }[],
  assetProjectedTotal: AssetYearlyPoint[],
  liabilityProjectedTotal: AssetYearlyPoint[],
  currentAge: number,
): DashboardChartPoint[] {
  const planByAge = new Map<number, typeof planData[0]>();
  for (const p of planData) {
    planByAge.set(p.age, p);
  }

  const projByAge = new Map<number, number>();
  for (const p of assetProjectedTotal) {
    projByAge.set(p.age, p.value);
  }

  const debtByAge = new Map<number, number>();
  for (const p of liabilityProjectedTotal) {
    debtByAge.set(p.age, p.value);
  }

  const allAges = new Set<number>();
  planData.forEach((p) => allAges.add(p.age));
  assetProjectedTotal.forEach((p) => allAges.add(p.age));
  liabilityProjectedTotal.forEach((p) => allAges.add(p.age));

  const sortedAges = Array.from(allAges).sort((a, b) => a - b);

  return sortedAges.map((age) => {
    const plan = planByAge.get(age);
    const assetValue = projByAge.get(age) ?? null;
    const debtValue = debtByAge.get(age) ?? null;

    const hasData = age >= currentAge && (assetValue != null || debtValue != null);
    const netWorthValue = hasData ? (assetValue ?? 0) - (debtValue ?? 0) : null;

    return {
      year: plan?.year ?? (new Date().getFullYear() + (age - currentAge)),
      age,
      planValue: plan?.portfolioValue ?? null,
      planMonthlyContribution: plan?.monthlyContribution ?? null,
      actualTotal: age === currentAge ? (assetValue ?? null) : null,
      projectedTotal: age >= currentAge ? (assetValue ?? null) : null,
      liabilityTotal: age >= currentAge ? debtValue : null,
      netWorth: netWorthValue,
    };
  });
}

export type OnTrackStatus = "ahead" | "on_track" | "slightly_behind" | "behind" | "no_data";

export interface OnTrackInfo {
  status: OnTrackStatus;
  label: string;
  ratio: number;
  planValue: number;
  actualValue: number;
}

export function calculateOnTrackStatus(
  planValueAtCurrentAge: number,
  netWorth: number,
): OnTrackInfo {
  // Plan starts at 0 at currentAge (models saving from scratch).
  if (planValueAtCurrentAge <= 0) {
    if (netWorth > 0) {
      return { status: "ahead", label: "Ahead of plan", ratio: 1, planValue: planValueAtCurrentAge, actualValue: netWorth };
    }
    if (netWorth === 0) {
      return { status: "on_track", label: "On track", ratio: 1, planValue: planValueAtCurrentAge, actualValue: netWorth };
    }
    return { status: "behind", label: "Behind plan", ratio: 0, planValue: planValueAtCurrentAge, actualValue: netWorth };
  }

  const ratio = netWorth / planValueAtCurrentAge;

  if (ratio >= 1.1) {
    return { status: "ahead", label: "Ahead of plan", ratio, planValue: planValueAtCurrentAge, actualValue: netWorth };
  }
  if (ratio >= 0.95) {
    return { status: "on_track", label: "On track", ratio, planValue: planValueAtCurrentAge, actualValue: netWorth };
  }
  if (ratio >= 0.8) {
    return { status: "slightly_behind", label: "Slightly behind", ratio, planValue: planValueAtCurrentAge, actualValue: netWorth };
  }
  return { status: "behind", label: "Behind plan", ratio, planValue: planValueAtCurrentAge, actualValue: netWorth };
}
