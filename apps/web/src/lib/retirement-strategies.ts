// Retirement savings strategy calculation engine.
// All functions are pure and operate on plain numbers.

export type SavingsStrategy =
  | "front_loaded"
  | "coast_fire"
  | "barista_fire"
  | "traditional"
  | "back_loaded";

export interface StrategyMeta {
  id: SavingsStrategy;
  name: string;
  subtitle: string;
  icon: string;
  description: string;
  bestFor: string;
}

export const STRATEGY_LIST: StrategyMeta[] = [
  {
    id: "front_loaded",
    name: "Front-Loaded",
    subtitle: "Save more now, less later",
    icon: "fa-rocket",
    description:
      "Maximize compound interest by contributing more in the early years and gradually reducing your savings over time. The most mathematically efficient approach.",
    bestFor: "People who can save aggressively now and want to ease off later",
  },
  {
    id: "coast_fire",
    name: "Coast FIRE",
    subtitle: "Sprint then coast",
    icon: "fa-sailboat",
    description:
      "Save intensely for a set number of years until your portfolio can grow to your target on its own, then stop saving entirely. Compound growth carries you to the finish line.",
    bestFor: "Those willing to sacrifice short-term to gain complete savings freedom later",
  },
  {
    id: "barista_fire",
    name: "Barista FIRE",
    subtitle: "Sprint then slow down",
    icon: "fa-mug-hot",
    description:
      "Save aggressively for an initial period, then switch to smaller contributions. Great if you plan to move to part-time work or a lower-paying passion job.",
    bestFor: "People who want flexibility without full retirement savings pressure",
  },
  {
    id: "traditional",
    name: "Traditional",
    subtitle: "Steady and predictable",
    icon: "fa-arrows-left-right",
    description:
      "Save the same amount every month from now until retirement. Simple to automate and requires no adjustment over time.",
    bestFor: "People who prefer simplicity and consistency",
  },
  {
    id: "back_loaded",
    name: "Back-Loaded",
    subtitle: "Start small, ramp up",
    icon: "fa-arrow-trend-up",
    description:
      "Begin with smaller contributions that increase each year. Less optimal for compound growth, but realistic if your income will grow or you have financial constraints now.",
    bestFor: "Early-career savers or those with current financial constraints",
  },
];

// ─── Core simulation ────────────────────────────────────────────────────────

export interface YearlyDataPoint {
  year: number;
  age: number;
  portfolioValue: number;
  monthlyContribution: number;
  cumulativeContributions: number;
  cumulativeGrowth: number;
}

/**
 * Simulate month-by-month portfolio growth with a variable contribution function.
 * Returns the final balance.
 */
export function simulateGrowth(
  years: number,
  annualReturn: number,
  getMonthly: (yearIndex: number, monthIndex: number) => number
): number {
  const r = annualReturn / 12;
  let balance = 0;
  for (let y = 0; y < years; y++) {
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + r) + getMonthly(y, m);
    }
  }
  return balance;
}

/**
 * Generate year-by-year schedule data for charts.
 */
export function generateSchedule(
  years: number,
  annualReturn: number,
  currentAge: number,
  currentYear: number,
  getMonthly: (yearIndex: number, monthIndex: number) => number
): YearlyDataPoint[] {
  const r = annualReturn / 12;
  let balance = 0;
  let totalContributions = 0;
  const data: YearlyDataPoint[] = [];

  // Record starting point
  data.push({
    year: currentYear,
    age: currentAge,
    portfolioValue: 0,
    monthlyContribution: getMonthly(0, 0),
    cumulativeContributions: 0,
    cumulativeGrowth: 0,
  });

  for (let y = 0; y < years; y++) {
    const monthlyForYear = getMonthly(y, 0);
    for (let m = 0; m < 12; m++) {
      const contribution = getMonthly(y, m);
      balance = balance * (1 + r) + contribution;
      totalContributions += contribution;
    }
    data.push({
      year: currentYear + y + 1,
      age: currentAge + y + 1,
      portfolioValue: Math.round(balance),
      monthlyContribution: Math.round(monthlyForYear),
      cumulativeContributions: Math.round(totalContributions),
      cumulativeGrowth: Math.round(balance - totalContributions),
    });
  }

  return data;
}

/**
 * Binary search for the starting monthly contribution that reaches a target.
 */
function solveStartingAmount(
  target: number,
  years: number,
  annualReturn: number,
  buildGetMonthly: (startAmount: number) => (yearIndex: number, monthIndex: number) => number,
  maxIterations = 80
): number {
  if (target <= 0 || years <= 0) return 0;
  let low = 0;
  let high = target;
  for (let i = 0; i < maxIterations; i++) {
    const mid = (low + high) / 2;
    const result = simulateGrowth(years, annualReturn, buildGetMonthly(mid));
    if (result < target) low = mid;
    else high = mid;
    if (Math.abs(high - low) < 0.01) break;
  }
  return (low + high) / 2;
}

// ─── Strategy-specific calculations ─────────────────────────────────────────

export interface StrategyParams {
  strategy: SavingsStrategy;
  targetAmount: number;
  years: number;
  annualReturn: number;
  // Front-Loaded / Back-Loaded
  annualChangeRate?: number;
  // Coast FIRE / Barista FIRE
  phase1Years?: number;
  // Barista FIRE
  phase2Monthly?: number;
}

export interface StrategyDefaults {
  phase1Monthly: number;
  phase1Years: number;
  phase2Monthly: number;
  annualChangeRate: number;
  traditionalMonthly: number;
}

/**
 * Calculate the traditional flat PMT amount.
 */
export function calculateTraditionalMonthly(
  target: number,
  annualReturn: number,
  years: number
): number {
  if (years <= 0) return 0;
  const n = years * 12;
  if (annualReturn === 0) return target / n;
  const r = annualReturn / 12;
  return (target * r) / (Math.pow(1 + r, n) - 1);
}

/**
 * Get the contribution function for a given strategy and starting monthly.
 */
function getContributionFn(
  params: StrategyParams,
  startMonthly: number
): (yearIndex: number, monthIndex: number) => number {
  switch (params.strategy) {
    case "front_loaded": {
      const rate = params.annualChangeRate ?? 0.05;
      return (y) => startMonthly * Math.pow(1 - rate, y);
    }
    case "coast_fire": {
      const p1Years = params.phase1Years ?? Math.min(10, Math.floor(params.years / 2));
      return (y) => (y < p1Years ? startMonthly : 0);
    }
    case "barista_fire": {
      const p1Years = params.phase1Years ?? Math.min(10, Math.floor(params.years / 2));
      const p2Monthly = params.phase2Monthly ?? 0;
      return (y) => (y < p1Years ? startMonthly : p2Monthly);
    }
    case "traditional":
      return () => startMonthly;
    case "back_loaded": {
      const rate = params.annualChangeRate ?? 0.05;
      return (y) => startMonthly * Math.pow(1 + rate, y);
    }
  }
}

/**
 * Calculate the starting monthly contribution for a strategy so it reaches the target.
 */
export function calculateStartingMonthly(params: StrategyParams): number {
  if (params.strategy === "traditional") {
    return calculateTraditionalMonthly(params.targetAmount, params.annualReturn, params.years);
  }

  if (params.strategy === "barista_fire") {
    // For barista fire, we need to account for the phase2 contributions that are fixed
    const p1Years = params.phase1Years ?? Math.min(10, Math.floor(params.years / 2));
    const p2Monthly = params.phase2Monthly ?? 0;

    // Calculate how much the phase2 contributions will accumulate
    const phase2FV = simulateGrowth(
      params.years,
      params.annualReturn,
      (y) => (y < p1Years ? 0 : p2Monthly)
    );

    // The phase1 needs to produce (target - phase2FV) when grown for the remaining years
    const neededFromPhase1 = params.targetAmount - phase2FV;
    if (neededFromPhase1 <= 0) return 0;

    // The phase1 balance after p1Years will compound for remaining years
    const remainingYears = params.years - p1Years;
    const phase1Target =
      remainingYears > 0
        ? neededFromPhase1 / Math.pow(1 + params.annualReturn, remainingYears)
        : neededFromPhase1;

    return solveStartingAmount(
      phase1Target,
      p1Years,
      params.annualReturn,
      (start) => () => start
    );
  }

  return solveStartingAmount(
    params.targetAmount,
    params.years,
    params.annualReturn,
    (start) => getContributionFn({ ...params }, start)
  );
}

/**
 * Calculate default parameters for a given strategy.
 */
export function getStrategyDefaults(
  targetAmount: number,
  years: number,
  annualReturn: number
): StrategyDefaults {
  const traditionalMonthly = calculateTraditionalMonthly(targetAmount, annualReturn, years);
  const defaultPhase1Years = Math.min(10, Math.max(3, Math.floor(years / 2)));
  const defaultAnnualChangeRate = 0.05;
  const defaultPhase2Monthly = Math.round(traditionalMonthly * 0.25);

  const frontLoadedStart = calculateStartingMonthly({
    strategy: "front_loaded",
    targetAmount,
    years,
    annualReturn,
    annualChangeRate: defaultAnnualChangeRate,
  });

  return {
    phase1Monthly: Math.round(frontLoadedStart),
    phase1Years: defaultPhase1Years,
    phase2Monthly: defaultPhase2Monthly,
    annualChangeRate: defaultAnnualChangeRate,
    traditionalMonthly: Math.round(traditionalMonthly),
  };
}

/**
 * Generate full schedule data for chart rendering.
 */
export function getStrategySchedule(
  params: StrategyParams,
  currentAge: number,
  currentYear: number
): YearlyDataPoint[] {
  const startMonthly = calculateStartingMonthly(params);
  const fn = getContributionFn(params, startMonthly);
  return generateSchedule(params.years, params.annualReturn, currentAge, currentYear, fn);
}

/**
 * Build a contribution function with explicit starting monthly (for user-overridden values).
 */
export function getScheduleWithOverride(
  params: StrategyParams,
  overrideStartMonthly: number,
  currentAge: number,
  currentYear: number
): YearlyDataPoint[] {
  const fn = getContributionFn(params, overrideStartMonthly);
  return generateSchedule(params.years, params.annualReturn, currentAge, currentYear, fn);
}

/**
 * Extended schedule: generates data from currentAge to age 100.
 * Pre-retirement uses the strategy contribution function.
 * Post-retirement uses $0 contributions with compound growth only.
 */
export function getExtendedSchedule(
  params: StrategyParams,
  overrideStartMonthly: number,
  currentAge: number,
  currentYear: number,
  retirementAge: number,
  maxAge: number = 100
): YearlyDataPoint[] {
  const contributionFn = getContributionFn(params, overrideStartMonthly);
  const totalYears = maxAge - currentAge;
  const r = params.annualReturn / 12;
  let balance = 0;
  let totalContributions = 0;
  const data: YearlyDataPoint[] = [];

  data.push({
    year: currentYear,
    age: currentAge,
    portfolioValue: 0,
    monthlyContribution: contributionFn(0, 0),
    cumulativeContributions: 0,
    cumulativeGrowth: 0,
  });

  for (let y = 0; y < totalYears; y++) {
    const age = currentAge + y + 1;
    const isPreRetirement = y < params.years;
    const monthlyForYear = isPreRetirement ? contributionFn(y, 0) : 0;

    for (let m = 0; m < 12; m++) {
      const contribution = isPreRetirement ? contributionFn(y, m) : 0;
      balance = balance * (1 + r) + contribution;
      totalContributions += contribution;
    }

    data.push({
      year: currentYear + y + 1,
      age,
      portfolioValue: Math.round(balance),
      monthlyContribution: Math.round(monthlyForYear),
      cumulativeContributions: Math.round(totalContributions),
      cumulativeGrowth: Math.round(balance - totalContributions),
    });
  }

  return data;
}

/**
 * Get the final portfolio value for a schedule with a given starting monthly.
 */
export function getFinalValue(params: StrategyParams, startMonthly: number): number {
  const fn = getContributionFn(params, startMonthly);
  return simulateGrowth(params.years, params.annualReturn, fn);
}

/**
 * Quick summary for strategy cards: returns first-year and last-year monthly amounts.
 */
export function getStrategySummary(
  strategy: SavingsStrategy,
  targetAmount: number,
  years: number,
  annualReturn: number
): { firstYearMonthly: number; lastYearMonthly: number; phase1Years?: number } {
  const defaults = getStrategyDefaults(targetAmount, years, annualReturn);

  switch (strategy) {
    case "front_loaded": {
      const start = calculateStartingMonthly({
        strategy,
        targetAmount,
        years,
        annualReturn,
        annualChangeRate: defaults.annualChangeRate,
      });
      const lastYear = start * Math.pow(1 - defaults.annualChangeRate, years - 1);
      return {
        firstYearMonthly: Math.round(start),
        lastYearMonthly: Math.round(lastYear),
      };
    }
    case "coast_fire": {
      const start = calculateStartingMonthly({
        strategy,
        targetAmount,
        years,
        annualReturn,
        phase1Years: defaults.phase1Years,
      });
      return {
        firstYearMonthly: Math.round(start),
        lastYearMonthly: 0,
        phase1Years: defaults.phase1Years,
      };
    }
    case "barista_fire": {
      const start = calculateStartingMonthly({
        strategy,
        targetAmount,
        years,
        annualReturn,
        phase1Years: defaults.phase1Years,
        phase2Monthly: defaults.phase2Monthly,
      });
      return {
        firstYearMonthly: Math.round(start),
        lastYearMonthly: defaults.phase2Monthly,
        phase1Years: defaults.phase1Years,
      };
    }
    case "traditional": {
      const monthly = calculateTraditionalMonthly(targetAmount, annualReturn, years);
      return {
        firstYearMonthly: Math.round(monthly),
        lastYearMonthly: Math.round(monthly),
      };
    }
    case "back_loaded": {
      const start = calculateStartingMonthly({
        strategy,
        targetAmount,
        years,
        annualReturn,
        annualChangeRate: defaults.annualChangeRate,
      });
      const lastYear = start * Math.pow(1 + defaults.annualChangeRate, years - 1);
      return {
        firstYearMonthly: Math.round(start),
        lastYearMonthly: Math.round(lastYear),
      };
    }
  }
}

/**
 * Generate a simplified sparkline-style data array for mini charts on strategy cards.
 * Returns normalized values (0-1) for portfolio and contribution.
 */
export function getMiniChartData(
  strategy: SavingsStrategy,
  years: number
): { t: number; portfolio: number; contribution: number }[] {
  const points = Math.min(years, 20);
  const step = years / points;
  const data: { t: number; portfolio: number; contribution: number }[] = [];

  // Generate characteristic shapes for each strategy
  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const yearIdx = Math.floor(i * step);

    let contribution: number;
    let portfolio: number;

    switch (strategy) {
      case "front_loaded":
        contribution = Math.pow(1 - 0.05, yearIdx);
        portfolio = Math.pow(t, 1.4);
        break;
      case "coast_fire": {
        const cutoff = 0.4;
        contribution = t < cutoff ? 1 : 0;
        portfolio = t < cutoff ? Math.pow(t / cutoff, 1.2) * 0.4 : 0.4 + (t - cutoff) / (1 - cutoff) * 0.6;
        break;
      }
      case "barista_fire": {
        const cut = 0.4;
        contribution = t < cut ? 1 : 0.25;
        portfolio = t < cut ? Math.pow(t / cut, 1.2) * 0.35 : 0.35 + (t - cut) / (1 - cut) * 0.65;
        break;
      }
      case "traditional":
        contribution = 1;
        portfolio = Math.pow(t, 1.6);
        break;
      case "back_loaded":
        contribution = Math.pow(1 + 0.05, yearIdx) / Math.pow(1.05, years);
        portfolio = Math.pow(t, 2);
        break;
    }

    data.push({ t: Math.round(t * 100) / 100, portfolio, contribution });
  }

  // Normalize portfolio to 0-1
  const maxP = Math.max(...data.map((d) => d.portfolio), 0.01);
  const maxC = Math.max(...data.map((d) => d.contribution), 0.01);
  return data.map((d) => ({
    t: d.t,
    portfolio: d.portfolio / maxP,
    contribution: d.contribution / maxC,
  }));
}
