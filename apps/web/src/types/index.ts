// Shared TypeScript types used across the web app.
// More specific types live alongside the components/pages that use them.

export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: "investment" | "savings" | "property" | "other";
  balance: number;
  currency: string;
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
