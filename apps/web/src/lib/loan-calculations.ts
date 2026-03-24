import type { InterestAccrualMethod } from "@/types";

export interface AmortizationPoint {
  month: number;
  balance: number;
  principal: number;
  interest: number;
  cumulativeInterest: number;
}

export interface AmortizationResult {
  schedule: AmortizationPoint[];
  totalInterest: number;
  totalPaid: number;
  payoffMonths: number;
}

export interface MortgageBreakdown {
  principalAndInterest: number;
  propertyTax: number;
  homeInsurance: number;
  pmi: number;
  escrow: number;
  totalMonthly: number;
}

export function getDefaultAccrualMethod(debtType: string): InterestAccrualMethod {
  switch (debtType) {
    case "mortgage":
      return "daily";
    case "auto":
      return "precomputed";
    case "loan":
      return "monthly";
    default:
      return "monthly";
  }
}

export const ACCRUAL_METHOD_INFO: Record<InterestAccrualMethod, { label: string; description: string }> = {
  monthly: {
    label: "Monthly (Standard Amortization)",
    description: "Interest is calculated once per month on the outstanding balance. Most common for fixed-rate loans. Formula: Monthly Interest = Balance x (Annual Rate / 12)",
  },
  daily: {
    label: "Daily Accrual",
    description: "Interest is calculated every day on the outstanding balance, then summed for the month. Common for mortgages. Paying early in the month saves more interest. Formula: Daily Interest = Balance x (Annual Rate / 365)",
  },
  precomputed: {
    label: "Pre-computed (Simple Interest)",
    description: "Total interest for the life of the loan is calculated upfront based on the original principal. Your payment schedule is fixed regardless of when you pay. Common for auto loans from dealerships. Formula: Total Interest = Principal x Rate x Term",
  },
};

export function calculateAmortizationMonthly(
  balance: number,
  annualRate: number,
  monthlyPayment: number,
  remainingMonths: number | null,
  extraMonthly = 0,
  extraYearly = 0,
  lumpSum = 0,
  lumpSumMonth = 1
): AmortizationResult {
  const monthlyRate = annualRate / 100 / 12;
  let currentBalance = balance;
  let cumulativeInterest = 0;
  let totalPaid = 0;
  const schedule: AmortizationPoint[] = [];
  const maxMonths = remainingMonths ?? 360;

  schedule.push({
    month: 0,
    balance: currentBalance,
    principal: 0,
    interest: 0,
    cumulativeInterest: 0,
  });

  for (let m = 1; m <= maxMonths && currentBalance > 0.01; m++) {
    const interestPayment = currentBalance * monthlyRate;
    let payment = monthlyPayment + extraMonthly;

    if (extraYearly > 0 && m % 12 === 0) {
      payment += extraYearly;
    }
    if (lumpSum > 0 && m === lumpSumMonth) {
      payment += lumpSum;
    }
    if (payment > currentBalance + interestPayment) {
      payment = currentBalance + interestPayment;
    }

    const principalPayment = payment - interestPayment;
    currentBalance = Math.max(0, currentBalance - principalPayment);
    cumulativeInterest += interestPayment;
    totalPaid += payment;

    schedule.push({
      month: m,
      balance: Math.round(currentBalance * 100) / 100,
      principal: Math.round(principalPayment * 100) / 100,
      interest: Math.round(interestPayment * 100) / 100,
      cumulativeInterest: Math.round(cumulativeInterest * 100) / 100,
    });

    if (currentBalance <= 0.01) break;
  }

  return {
    schedule,
    totalInterest: Math.round(cumulativeInterest * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    payoffMonths: schedule.length - 1,
  };
}

export function calculateAmortizationDaily(
  balance: number,
  annualRate: number,
  monthlyPayment: number,
  remainingMonths: number | null,
  extraMonthly = 0,
  extraYearly = 0,
  lumpSum = 0,
  lumpSumMonth = 1
): AmortizationResult {
  const dailyRate = annualRate / 100 / 365;
  let currentBalance = balance;
  let cumulativeInterest = 0;
  let totalPaid = 0;
  const schedule: AmortizationPoint[] = [];
  const maxMonths = remainingMonths ?? 360;

  schedule.push({
    month: 0,
    balance: currentBalance,
    principal: 0,
    interest: 0,
    cumulativeInterest: 0,
  });

  for (let m = 1; m <= maxMonths && currentBalance > 0.01; m++) {
    // Average ~30.44 days per month for daily accrual
    const daysInMonth = 30.44;
    const interestPayment = currentBalance * dailyRate * daysInMonth;
    let payment = monthlyPayment + extraMonthly;

    if (extraYearly > 0 && m % 12 === 0) {
      payment += extraYearly;
    }
    if (lumpSum > 0 && m === lumpSumMonth) {
      payment += lumpSum;
    }
    if (payment > currentBalance + interestPayment) {
      payment = currentBalance + interestPayment;
    }

    const principalPayment = payment - interestPayment;
    currentBalance = Math.max(0, currentBalance - principalPayment);
    cumulativeInterest += interestPayment;
    totalPaid += payment;

    schedule.push({
      month: m,
      balance: Math.round(currentBalance * 100) / 100,
      principal: Math.round(principalPayment * 100) / 100,
      interest: Math.round(interestPayment * 100) / 100,
      cumulativeInterest: Math.round(cumulativeInterest * 100) / 100,
    });

    if (currentBalance <= 0.01) break;
  }

  return {
    schedule,
    totalInterest: Math.round(cumulativeInterest * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    payoffMonths: schedule.length - 1,
  };
}

export function calculateAmortizationPrecomputed(
  originalBalance: number,
  annualRate: number,
  termMonths: number,
  remainingBalance: number,
  monthlyPayment: number,
  extraMonthly = 0,
  extraYearly = 0,
  lumpSum = 0,
  lumpSumMonth = 1
): AmortizationResult {
  // Pre-computed interest: total interest = principal x rate x term-in-years
  // Each payment goes to a fixed schedule of principal + interest splits
  // For simplicity, we still do month-by-month tracking from the remaining balance
  const totalInterestLifetime = originalBalance * (annualRate / 100) * (termMonths / 12);
  const totalOwed = originalBalance + totalInterestLifetime;
  const fixedMonthlyPayment = totalOwed / termMonths;

  // How many months have already been paid
  const monthsPaid = Math.round((originalBalance - remainingBalance) / (fixedMonthlyPayment - (totalInterestLifetime / termMonths)));
  const effectiveRemainingMonths = Math.max(1, termMonths - Math.max(0, monthsPaid));

  // For pre-computed, interest per month is fixed
  const monthlyInterestPortion = totalInterestLifetime / termMonths;

  let currentBalance = remainingBalance;
  let cumulativeInterest = 0;
  let totalPaid = 0;
  const schedule: AmortizationPoint[] = [];

  schedule.push({
    month: 0,
    balance: currentBalance,
    principal: 0,
    interest: 0,
    cumulativeInterest: 0,
  });

  for (let m = 1; m <= effectiveRemainingMonths && currentBalance > 0.01; m++) {
    let payment = (monthlyPayment || fixedMonthlyPayment) + extraMonthly;

    if (extraYearly > 0 && m % 12 === 0) {
      payment += extraYearly;
    }
    if (lumpSum > 0 && m === lumpSumMonth) {
      payment += lumpSum;
    }

    const interestPayment = Math.min(monthlyInterestPortion, currentBalance);
    if (payment > currentBalance + interestPayment) {
      payment = currentBalance + interestPayment;
    }

    const principalPayment = payment - interestPayment;
    currentBalance = Math.max(0, currentBalance - principalPayment);
    cumulativeInterest += interestPayment;
    totalPaid += payment;

    schedule.push({
      month: m,
      balance: Math.round(currentBalance * 100) / 100,
      principal: Math.round(principalPayment * 100) / 100,
      interest: Math.round(interestPayment * 100) / 100,
      cumulativeInterest: Math.round(cumulativeInterest * 100) / 100,
    });

    if (currentBalance <= 0.01) break;
  }

  return {
    schedule,
    totalInterest: Math.round(cumulativeInterest * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    payoffMonths: schedule.length - 1,
  };
}

export function calculateAmortization(
  balance: number,
  annualRate: number,
  monthlyPayment: number,
  remainingMonths: number | null,
  accrualMethod: InterestAccrualMethod = "monthly",
  originalBalance?: number | null,
  loanTermMonths?: number | null,
  extraMonthly = 0,
  extraYearly = 0,
  lumpSum = 0,
  lumpSumMonth = 1
): AmortizationResult {
  if (annualRate <= 0 || monthlyPayment <= 0) {
    return { schedule: [{ month: 0, balance, principal: 0, interest: 0, cumulativeInterest: 0 }], totalInterest: 0, totalPaid: 0, payoffMonths: 0 };
  }

  switch (accrualMethod) {
    case "daily":
      return calculateAmortizationDaily(balance, annualRate, monthlyPayment, remainingMonths, extraMonthly, extraYearly, lumpSum, lumpSumMonth);
    case "precomputed":
      return calculateAmortizationPrecomputed(
        originalBalance ?? balance,
        annualRate,
        loanTermMonths ?? remainingMonths ?? 60,
        balance,
        monthlyPayment,
        extraMonthly,
        extraYearly,
        lumpSum,
        lumpSumMonth
      );
    case "monthly":
    default:
      return calculateAmortizationMonthly(balance, annualRate, monthlyPayment, remainingMonths, extraMonthly, extraYearly, lumpSum, lumpSumMonth);
  }
}

export function calculateMortgageBreakdown(
  minimumPayment: number,
  propertyTaxYearly: number | null,
  homeInsuranceYearly: number | null,
  pmiMonthly: number | null,
  escrowAmount: number | null,
): MortgageBreakdown {
  const propertyTax = propertyTaxYearly ? propertyTaxYearly / 12 : 0;
  const homeInsurance = homeInsuranceYearly ? homeInsuranceYearly / 12 : 0;
  const pmi = pmiMonthly ?? 0;
  // If escrow is set, it overrides individual property tax + insurance
  const escrow = escrowAmount ?? (propertyTax + homeInsurance);
  const totalMonthly = minimumPayment + escrow + pmi;

  return {
    principalAndInterest: minimumPayment,
    propertyTax,
    homeInsurance,
    pmi,
    escrow,
    totalMonthly,
  };
}

export function calculateEquity(homeValue: number | null, currentBalance: number): number | null {
  if (homeValue == null) return null;
  return homeValue - currentBalance;
}

export function estimatePayoffMonths(balance: number, rate: number, payment: number): number | null {
  if (payment <= 0 || balance <= 0) return null;
  if (rate <= 0) return Math.ceil(balance / payment);
  const monthlyRate = rate / 100 / 12;
  const minPayment = balance * monthlyRate;
  if (payment <= minPayment) return null;
  return Math.ceil(-Math.log(1 - (monthlyRate * balance) / payment) / Math.log(1 + monthlyRate));
}
