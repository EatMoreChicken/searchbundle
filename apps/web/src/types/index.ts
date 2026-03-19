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
  interestRate: number;
  minimumPayment: number;
  originalBalance: number;
  createdAt: Date;
  updatedAt: Date;
}
