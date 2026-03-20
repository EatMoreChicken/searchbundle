// Shared TypeScript types used across the web app.
// More specific types live alongside the components/pages that use them.

export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
}

export type AssetType = "investment" | "savings" | "hsa" | "property" | "other";
export type ContributionFrequency = "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";

export interface Asset {
  id: string;
  userId: string;
  name: string;
  type: AssetType;
  balance: number;
  currency: string;
  notes: string | null;
  contributionAmount: number | null;
  contributionFrequency: ContributionFrequency | null;
  returnRate: number | null;
  returnRateVariance: number | null;
  includeInflation: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Debt {
  id: string;
  userId: string;
  name: string;
  type: "mortgage" | "student_loan" | "auto" | "credit_card" | "other";
  balance: number;
  originalBalance: number;
  interestRate: number;
  minimumPayment: number;
  escrowAmount: number | null;
  remainingMonths: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type DebtType = Debt["type"];

export interface Scenario {
  id: string;
  userId: string;
  debtId: string | null;
  accountId: string | null;
  name: string;
  extraMonthlyPayment: number;
  extraYearlyPayment: number;
  lumpSumPayment: number;
  lumpSumMonth: number;
  createdAt: Date;
}

export type CategoryType = "asset" | "liability";

export interface NetWorthCategory {
  id: string;
  userId: string;
  name: string;
  type: CategoryType;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface NetWorthEntry {
  id: string;
  categoryId: string;
  year: number;
  month: number;
  value: number;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardData {
  categories: NetWorthCategory[];
  entries: NetWorthEntry[];
}
