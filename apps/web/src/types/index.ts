// Shared TypeScript types used across the web app.
// More specific types live alongside the components/pages that use them.

export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  dateOfBirth: string | null;
  timezone: string;
  preferredCurrency: string;
  retirementAge: number | null;
  projectionEndAge: number;
  activeHouseholdId: string | null;
  mustResetPassword: boolean;
}

export type HouseholdRole = "owner" | "admin" | "member";

export interface Household {
  id: string;
  name: string;
  financialGoalNote: string | null;
  createdBy: string;
  createdAt: Date;
}

export interface HouseholdMember {
  id: string;
  householdId: string;
  userId: string;
  role: HouseholdRole;
  joinedAt: Date;
  user?: { id: string; name: string | null; email: string };
}

export type AssetType = "investment" | "savings" | "hsa" | "property" | "other" | "simple";
export type ContributionFrequency = "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";

export interface Asset {
  id: string;
  householdId: string;
  ownerId: string | null;
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

export type DebtType = "mortgage" | "student_loan" | "auto" | "credit_card" | "other" | "simple" | "loan";
export type InterestAccrualMethod = "monthly" | "daily" | "precomputed";

export interface Debt {
  id: string;
  householdId: string;
  ownerId: string | null;
  name: string;
  type: DebtType;
  balance: number;
  originalBalance: number | null;
  interestRate: number | null;
  minimumPayment: number | null;
  escrowAmount: number | null;
  remainingMonths: number | null;
  notes: string | null;
  interestAccrualMethod: InterestAccrualMethod | null;
  homeValue: number | null;
  pmiMonthly: number | null;
  propertyTaxYearly: number | null;
  homeInsuranceYearly: number | null;
  loanStartDate: string | null;
  loanTermMonths: number | null;
  vehicleValue: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DebtBalanceUpdate {
  id: string;
  debtId: string;
  previousBalance: number;
  newBalance: number;
  changeAmount: number;
  note: string | null;
  createdAt: string;
}

export interface DebtNote {
  id: string;
  debtId: string;
  householdId: string;
  content: string;
  createdAt: string;
}

export interface Scenario {
  id: string;
  householdId: string;
  debtId: string | null;
  accountId: string | null;
  name: string;
  extraMonthlyPayment: number;
  extraYearlyPayment: number;
  lumpSumPayment: number;
  lumpSumMonth: number;
  createdAt: Date;
}

export interface BalanceUpdate {
  id: string;
  accountId: string;
  previousBalance: number;
  newBalance: number;
  changeAmount: number;
  note: string | null;
  createdAt: string;
}

export interface AccountNote {
  id: string;
  accountId: string;
  householdId: string;
  content: string;
  createdAt: string;
}

export interface AccountContribution {
  id: string;
  accountId: string;
  label: string;
  amount: number;
  frequency: ContributionFrequency;
  createdAt: string;
}

export type CategoryType = "asset" | "liability";

export interface NetWorthCategory {
  id: string;
  householdId: string;
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

export type TargetMode = "fixed" | "income_replacement";

export type SavingsStrategy = "traditional" | "front_loaded" | "coast_fire" | "barista_fire" | "back_loaded";

export interface RetirementTarget {
  id: string;
  householdId: string;
  mode: TargetMode;
  targetAmount: number;
  targetAge: number;
  annualIncome: number | null;
  withdrawalRate: number;
  expectedReturn: number;
  inflationRate: number;
  includeInflation: boolean;
  savingsStrategy: SavingsStrategy;
  strategyPhase1Monthly: number | null;
  strategyPhase1Years: number | null;
  strategyPhase2Monthly: number | null;
  strategyAnnualChangeRate: number | null;
  createdAt: string;
  updatedAt: string;
}
