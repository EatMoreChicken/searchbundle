"use client";

import { useState, useMemo, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import type { User, RetirementTarget } from "@/types";
import type { SavingsStrategy } from "@/lib/retirement-strategies";
import StrategySelection from "./StrategySelection";
import StrategyConfigurator, { type StrategyConfig } from "./StrategyConfigurator";

// ─── Constants ──────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DEFAULT_RETIREMENT_AGE = 65;
const DEFAULT_INFLATION = 3;
const DEFAULT_WITHDRAWAL_RATE = 4;
const DEFAULT_EXPECTED_RETURN = 7;

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Housing / Mortgage", amount: "" },
  { name: "Transportation", amount: "" },
  { name: "Healthcare", amount: "" },
  { name: "Groceries", amount: "" },
  { name: "Utilities", amount: "" },
  { name: "Insurance", amount: "" },
  { name: "Entertainment", amount: "" },
];

// ─── Shared utilities ───────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatFullCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function calculateMonthlySavings(target: number, annualReturn: number, years: number): number {
  if (years <= 0) return 0;
  const n = years * 12;
  if (annualReturn === 0) return target / n;
  const r = annualReturn / 12;
  return (target * r) / (Math.pow(1 + r, n) - 1);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function InfoTooltip({ children }: { children: string }) {
  return (
    <span className="relative group inline-flex items-center ml-1 align-middle cursor-help">
      <span className="material-symbols-outlined text-[14px] text-on-surface-variant">info</span>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 z-20 mb-2 w-64 rounded-xl bg-on-surface px-3 py-2.5 text-xs leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {children}
      </span>
    </span>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">{children}</p>;
}

function NumericInput({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const display = !focused && value ? parseInt(value, 10).toLocaleString("en-US") : value;
  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={(e) => {
        const raw = e.target.value.replace(/,/g, "");
        if (raw === "" || /^\d+$/.test(raw)) onChange(raw);
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className={className}
      placeholder={placeholder}
    />
  );
}

function PrefixedInput({ prefix, suffix, children }: { prefix?: string; suffix?: string; children: React.ReactNode }) {
  return (
    <div className="relative flex items-center">
      {prefix && <span className="pointer-events-none absolute left-4 text-sm font-medium text-on-surface-variant select-none">{prefix}</span>}
      <div className={["w-full", prefix ? "[&_input]:pl-8" : "", suffix ? "[&_input]:pr-10" : ""].join(" ")}>{children}</div>
      {suffix && <span className="pointer-events-none absolute right-4 text-sm font-medium text-on-surface-variant select-none">{suffix}</span>}
    </div>
  );
}

const INPUT_CLASS =
  "w-full bg-surface-container-high rounded-2xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary transition-all";

const SELECT_CLASS =
  "w-full bg-surface-container-high rounded-2xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer";

// ─── Step Indicator ─────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i < current
                ? "bg-primary text-on-primary"
                : i === current
                ? "bg-primary-fixed text-primary"
                : "bg-surface-container-high text-on-surface-variant"
            }`}
          >
            {i < current ? (
              <span className="material-symbols-outlined text-[16px]">check</span>
            ) : (
              i + 1
            )}
          </div>
          {i < total - 1 && (
            <div
              className={`w-12 h-0.5 rounded-full transition-all ${
                i < current ? "bg-primary" : "bg-surface-container-high"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Wizard Component ──────────────────────────────────────────────────

interface OnboardingWizardProps {
  user: User;
  onComplete: (user: User, target: RetirementTarget) => void;
}

export default function OnboardingWizard({ user, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ── Step 1: Age ──

  const guessYear = CURRENT_YEAR - 30;
  const [birthYear, setBirthYear] = useState<string>(String(guessYear));
  const [birthMonth, setBirthMonth] = useState<string>("1");
  const [birthDay, setBirthDay] = useState<string>("1");
  const [retirementAge, setRetirementAge] = useState<number>(DEFAULT_RETIREMENT_AGE);

  const dateOfBirth = useMemo(() => {
    const y = Number(birthYear);
    const m = Number(birthMonth);
    const d = Number(birthDay);
    if (!y || !m || !d) return null;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }, [birthYear, birthMonth, birthDay]);

  const currentAge = useMemo(() => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }, [dateOfBirth]);

  const yearsRemaining = currentAge != null ? retirementAge - currentAge : null;

  const maxDays = useMemo(() => {
    return daysInMonth(Number(birthYear) || CURRENT_YEAR, Number(birthMonth) || 1);
  }, [birthYear, birthMonth]);

  // clamp day if month/year changes
  const clampedDay = useMemo(() => {
    const d = Number(birthDay);
    if (d > maxDays) return String(maxDays);
    return birthDay;
  }, [birthDay, maxDays]);

  if (clampedDay !== birthDay) {
    // deferred state update
    setTimeout(() => setBirthDay(clampedDay), 0);
  }

  // Year options: from 100 years ago to 18 years ago
  const yearOptions = useMemo(() => {
    const end = CURRENT_YEAR - 16;
    const start = CURRENT_YEAR - 100;
    return Array.from({ length: end - start + 1 }, (_, i) => end - i);
  }, []);

  // ── Step 2: Income Target ──

  type IncomeMode = "help" | "fixed";
  const [incomeMode, setIncomeMode] = useState<IncomeMode>("help");
  const [fixedAmount, setFixedAmount] = useState("");
  const [annualIncome, setAnnualIncome] = useState("");
  const [inflationRate, setInflationRate] = useState(String(DEFAULT_INFLATION));
  const [withdrawalRate, setWithdrawalRate] = useState(String(DEFAULT_WITHDRAWAL_RATE));
  const [expectedReturn, setExpectedReturn] = useState(String(DEFAULT_EXPECTED_RETURN));
  const [showExpenseCalc, setShowExpenseCalc] = useState(false);
  const [expenseCategories, setExpenseCategories] = useState(
    DEFAULT_EXPENSE_CATEGORIES.map((c) => ({ ...c }))
  );

  const monthlyExpenseTotal = useMemo(() => {
    return expenseCategories.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }, [expenseCategories]);

  const yearlyExpenseTotal = monthlyExpenseTotal * 12;

  const inflRateDecimal = (Number(inflationRate) || DEFAULT_INFLATION) / 100;
  const wdRateDecimal = (Number(withdrawalRate) || DEFAULT_WITHDRAWAL_RATE) / 100;
  const retDecimal = (Number(expectedReturn) || DEFAULT_EXPECTED_RETURN) / 100;

  // The annual income in today's dollars (either from direct input or from expense calc)
  const annualIncomeToday = useMemo(() => {
    if (incomeMode === "fixed") return 0;
    return Number(annualIncome) || 0;
  }, [incomeMode, annualIncome]);

  // Inflation-adjusted annual income at retirement
  const annualIncomeFuture = useMemo(() => {
    if (!yearsRemaining || yearsRemaining <= 0) return annualIncomeToday;
    return annualIncomeToday * Math.pow(1 + inflRateDecimal, yearsRemaining);
  }, [annualIncomeToday, inflRateDecimal, yearsRemaining]);

  // Portfolio target
  const portfolioTarget = useMemo(() => {
    if (incomeMode === "fixed") return Number(fixedAmount) || 0;
    if (wdRateDecimal === 0) return 0;
    return annualIncomeFuture / wdRateDecimal;
  }, [incomeMode, fixedAmount, annualIncomeFuture, wdRateDecimal]);

  // For fixed mode: inflate the entered amount forward for savings calc
  const inflationAdjustedTarget = useMemo(() => {
    if (incomeMode !== "fixed") return portfolioTarget;
    if (!yearsRemaining || yearsRemaining <= 0) return portfolioTarget;
    return portfolioTarget * Math.pow(1 + inflRateDecimal, yearsRemaining);
  }, [incomeMode, portfolioTarget, inflRateDecimal, yearsRemaining]);

  // Portfolio target in today's dollars (for display)
  const portfolioTodayDollars = useMemo(() => {
    if (incomeMode === "fixed") return Number(fixedAmount) || 0;
    if (wdRateDecimal === 0) return 0;
    return annualIncomeToday / wdRateDecimal;
  }, [incomeMode, fixedAmount, annualIncomeToday, wdRateDecimal]);

  const monthlySavings = useMemo(() => {
    if (!yearsRemaining || yearsRemaining <= 0) return 0;
    return calculateMonthlySavings(inflationAdjustedTarget, retDecimal, yearsRemaining);
  }, [inflationAdjustedTarget, retDecimal, yearsRemaining]);

  const annualSavings = monthlySavings * 12;

  // Expense inflation-adjusted totals at retirement
  const monthlyExpenseFuture = useMemo(() => {
    if (!yearsRemaining || yearsRemaining <= 0) return monthlyExpenseTotal;
    return monthlyExpenseTotal * Math.pow(1 + inflRateDecimal, yearsRemaining);
  }, [monthlyExpenseTotal, inflRateDecimal, yearsRemaining]);

  const yearlyExpenseFuture = monthlyExpenseFuture * 12;

  // ── Expense Helpers ──

  const updateExpense = useCallback((index: number, field: "name" | "amount", value: string) => {
    setExpenseCategories((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const addExpense = useCallback(() => {
    setExpenseCategories((prev) => [...prev, { name: "", amount: "" }]);
  }, []);

  const removeExpense = useCallback((index: number) => {
    setExpenseCategories((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const applyExpensesToAnnual = useCallback(() => {
    if (yearlyExpenseTotal > 0) {
      setAnnualIncome(String(yearlyExpenseTotal));
    }
  }, [yearlyExpenseTotal]);

  // ── Navigation ──

  const canAdvanceStep1 = dateOfBirth && currentAge != null && currentAge >= 16 && yearsRemaining != null && yearsRemaining > 0;

  const canAdvanceStep2 = useMemo(() => {
    if (incomeMode === "fixed") return (Number(fixedAmount) || 0) > 0;
    return (Number(annualIncome) || 0) > 0;
  }, [incomeMode, fixedAmount, annualIncome]);

  // ── Step 3: Savings Strategy ──

  const [selectedStrategy, setSelectedStrategy] = useState<SavingsStrategy | null>(null);
  const [strategyConfig, setStrategyConfig] = useState<StrategyConfig | null>(null);

  const handleStrategySelect = useCallback((s: SavingsStrategy) => {
    setSelectedStrategy(s);
  }, []);

  const handleConfigChange = useCallback((config: StrategyConfig) => {
    setStrategyConfig(config);
  }, []);

  const handleRetirementAgeChange = useCallback((age: number) => {
    setRetirementAge(age);
  }, []);

  const handleAnnualReturnChange = useCallback((rate: number) => {
    setExpectedReturn(String(Math.round(rate * 1000) / 10));
  }, []);

  const handleInflationRateChange = useCallback((rate: number) => {
    setInflationRate(String(Math.round(rate * 1000) / 10));
  }, []);

  function goNext() {
    if (step < 3) setStep(step + 1);
  }

  function goBack() {
    if (step > 0) setStep(step - 1);
  }

  async function handleComplete() {
    if (!dateOfBirth) return;
    setSaving(true);
    setError("");
    try {
      const updatedUser = await apiClient.patch<User>("/api/users/me", {
        dateOfBirth,
        retirementAge,
      });

      const targetAmount = incomeMode === "fixed" ? Number(fixedAmount) : portfolioTodayDollars;
      const savedTarget = await apiClient.put<RetirementTarget>("/api/retirement-target", {
        mode: incomeMode === "fixed" ? "fixed" : "income_replacement",
        targetAmount,
        targetAge: retirementAge,
        annualIncome: incomeMode === "help" ? Number(annualIncome) || null : null,
        withdrawalRate: wdRateDecimal,
        expectedReturn: retDecimal,
        inflationRate: inflRateDecimal,
        includeInflation: true,
        savingsStrategy: selectedStrategy ?? "traditional",
        strategyPhase1Monthly: strategyConfig?.phase1Monthly ?? null,
        strategyPhase1Years: strategyConfig?.phase1Years ?? null,
        strategyPhase2Monthly: strategyConfig?.phase2Monthly ?? null,
        strategyAnnualChangeRate: strategyConfig?.annualChangeRate ?? null,
      });

      onComplete(updatedUser, savedTarget);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={`p-6 ${step === 3 ? "max-w-5xl" : "max-w-4xl"} space-y-6`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-label-sm font-semibold text-on-surface-variant tracking-widest uppercase mb-1">
            Getting Started
          </p>
          <h1 className="text-headline-lg font-extrabold text-on-surface tracking-tight">
            {step === 0 && "Let\u2019s start with your age"}
            {step === 1 && "Plan your retirement income"}
            {step === 2 && "Choose your savings path"}
            {step === 3 && "Customize your plan"}
          </h1>
        </div>
        <StepIndicator current={step} total={4} />
      </div>

      {/* Step Content */}
      {step === 0 && (
        <StepAge
          birthYear={birthYear}
          setBirthYear={setBirthYear}
          birthMonth={birthMonth}
          setBirthMonth={setBirthMonth}
          birthDay={birthDay}
          setBirthDay={setBirthDay}
          retirementAge={retirementAge}
          setRetirementAge={setRetirementAge}
          currentAge={currentAge}
          yearsRemaining={yearsRemaining}
          yearOptions={yearOptions}
          maxDays={maxDays}
        />
      )}

      {step === 1 && (
        <StepIncome
          incomeMode={incomeMode}
          setIncomeMode={setIncomeMode}
          fixedAmount={fixedAmount}
          setFixedAmount={setFixedAmount}
          annualIncome={annualIncome}
          setAnnualIncome={setAnnualIncome}
          inflationRate={inflationRate}
          setInflationRate={setInflationRate}
          withdrawalRate={withdrawalRate}
          setWithdrawalRate={setWithdrawalRate}
          expectedReturn={expectedReturn}
          setExpectedReturn={setExpectedReturn}
          showExpenseCalc={showExpenseCalc}
          setShowExpenseCalc={setShowExpenseCalc}
          expenseCategories={expenseCategories}
          updateExpense={updateExpense}
          addExpense={addExpense}
          removeExpense={removeExpense}
          applyExpensesToAnnual={applyExpensesToAnnual}
          monthlyExpenseTotal={monthlyExpenseTotal}
          yearlyExpenseTotal={yearlyExpenseTotal}
          monthlyExpenseFuture={monthlyExpenseFuture}
          yearlyExpenseFuture={yearlyExpenseFuture}
          annualIncomeToday={annualIncomeToday}
          annualIncomeFuture={annualIncomeFuture}
          portfolioTarget={portfolioTarget}
          portfolioTodayDollars={portfolioTodayDollars}
          inflationAdjustedTarget={inflationAdjustedTarget}
          monthlySavings={monthlySavings}
          annualSavings={annualSavings}
          yearsRemaining={yearsRemaining}
          currentAge={currentAge}
          retirementAge={retirementAge}
        />
      )}

      {step === 2 && (
        <StrategySelection
          targetAmount={inflationAdjustedTarget}
          years={yearsRemaining ?? 0}
          annualReturn={retDecimal}
          selected={selectedStrategy}
          onSelect={handleStrategySelect}
        />
      )}

      {step === 3 && selectedStrategy && currentAge != null && yearsRemaining != null && yearsRemaining > 0 && (
        <>
          <StrategyConfigurator
            strategy={selectedStrategy}
            targetAmount={inflationAdjustedTarget}
            years={yearsRemaining}
            annualReturn={retDecimal}
            inflationRate={inflRateDecimal}
            withdrawalRate={wdRateDecimal}
            currentAge={currentAge}
            retirementAge={retirementAge}
            onConfigChange={handleConfigChange}
            onRetirementAgeChange={handleRetirementAgeChange}
            onAnnualReturnChange={handleAnnualReturnChange}
            onInflationRateChange={handleInflationRateChange}
            onBack={() => setStep(2)}
          />
          {error && (
            <div className="bg-error-container rounded-xl p-4">
              <p className="text-sm text-on-error-container">{error}</p>
            </div>
          )}
        </>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-3 pt-2">
        {step > 0 && (
          <button
            type="button"
            onClick={goBack}
            className="px-5 py-2.5 rounded-full text-sm font-medium text-on-surface-variant hover:bg-surface-container-high transition-all"
          >
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Back
            </span>
          </button>
        )}
        <div className="flex-1" />
        {step < 2 && (
          <button
            type="button"
            onClick={goNext}
            disabled={step === 0 ? !canAdvanceStep1 : !canAdvanceStep2}
            className="px-6 py-2.5 rounded-full text-sm font-semibold text-on-primary bg-gradient-to-r from-primary to-primary-container hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
          >
            <span className="flex items-center gap-1">
              Continue
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </span>
          </button>
        )}
        {step === 2 && (
          <button
            type="button"
            onClick={goNext}
            disabled={!selectedStrategy}
            className="px-6 py-2.5 rounded-full text-sm font-semibold text-on-primary bg-gradient-to-r from-primary to-primary-container hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
          >
            <span className="flex items-center gap-1">
              Customize
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </span>
          </button>
        )}
        {step === 3 && (
          <button
            type="button"
            onClick={handleComplete}
            disabled={saving}
            className="px-6 py-2.5 rounded-full text-sm font-semibold text-on-primary bg-gradient-to-r from-primary to-primary-container hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                Get Started
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1: Age & Retirement Age
// ═══════════════════════════════════════════════════════════════════════════

function StepAge({
  birthYear, setBirthYear,
  birthMonth, setBirthMonth,
  birthDay, setBirthDay,
  retirementAge, setRetirementAge,
  currentAge, yearsRemaining,
  yearOptions, maxDays,
}: {
  birthYear: string; setBirthYear: (v: string) => void;
  birthMonth: string; setBirthMonth: (v: string) => void;
  birthDay: string; setBirthDay: (v: string) => void;
  retirementAge: number; setRetirementAge: (v: number) => void;
  currentAge: number | null; yearsRemaining: number | null;
  yearOptions: number[]; maxDays: number;
}) {
  const lifePercent = currentAge != null
    ? Math.min(100, Math.max(0, currentAge))
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left: Form */}
      <div className="lg:col-span-3 space-y-6">
        <section className="bg-surface-container-lowest rounded-2xl p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-tertiary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-on-tertiary-fixed-variant text-[20px]">cake</span>
            </div>
            <div>
              <h2 className="text-title-md font-bold text-on-surface">When were you born?</h2>
              <p className="text-sm text-on-surface-variant">
                We use your age to calculate how many years you have to reach your goals. Never shared.
              </p>
            </div>
          </div>

          {/* Date selectors */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 tracking-wide uppercase">Year</label>
              <select
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                className={SELECT_CLASS}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 tracking-wide uppercase">Month</label>
              <select
                value={birthMonth}
                onChange={(e) => setBirthMonth(e.target.value)}
                className={SELECT_CLASS}
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 tracking-wide uppercase">Day</label>
              <select
                value={birthDay}
                onChange={(e) => setBirthDay(e.target.value)}
                className={SELECT_CLASS}
              >
                {Array.from({ length: maxDays }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="bg-surface-container-lowest rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[20px]">beach_access</span>
            </div>
            <div>
              <h2 className="text-title-md font-bold text-on-surface">When do you want to be financially free?</h2>
              <p className="text-sm text-on-surface-variant">
                This is the age you want the option to stop working. You can always keep going.
              </p>
            </div>
          </div>

          {/* Retirement age: slider + input */}
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={30}
                max={85}
                value={retirementAge}
                onChange={(e) => setRetirementAge(Number(e.target.value))}
                className="flex-1 h-2 rounded-full appearance-none bg-surface-container-highest cursor-pointer accent-primary"
              />
              <div className="relative w-20">
                <input
                  type="number"
                  min={30}
                  max={100}
                  value={retirementAge}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v >= 1 && v <= 120) setRetirementAge(v);
                  }}
                  className="w-full bg-surface-container-high rounded-xl px-3 py-2 text-center text-sm font-bold text-on-surface focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary transition-all"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant pointer-events-none">yrs</span>
              </div>
            </div>
            <FieldHint>
              Defaulted to 65. Slide or type to adjust. You can always change this later in Settings.
            </FieldHint>
          </div>
        </section>
      </div>

      {/* Right: Live Sidebar */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-surface-container-lowest rounded-2xl p-6 space-y-5 sticky top-6">
          <p className="text-label-sm font-bold text-on-surface-variant tracking-widest uppercase">
            Your Timeline
          </p>

          {/* Age display */}
          <div className="text-center space-y-1">
            <p className="text-5xl font-extrabold text-on-surface tracking-tight">
              {currentAge != null ? currentAge : "--"}
            </p>
            <p className="text-sm text-on-surface-variant">years old today</p>
          </div>

          {/* Life timeline bar */}
          <div className="space-y-2">
            <div className="relative h-4 bg-surface-container-highest rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary-container rounded-full transition-all duration-500"
                style={{ width: `${lifePercent}%` }}
              />
              {/* Target marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-tertiary"
                style={{ left: `${Math.min(100, (retirementAge / 100) * 100)}%` }}
              />
            </div>
            <div className="relative flex justify-between text-xs text-on-surface-variant">
              <span>Born</span>
              <span
                className="absolute font-semibold text-tertiary -translate-x-1/2"
                style={{ left: `${Math.min(98, Math.max(2, retirementAge))}%` }}
              >
                Retire at {retirementAge}
              </span>
              <span>100</span>
            </div>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-container-low rounded-xl p-4 text-center">
              <p className="text-2xl font-extrabold text-primary tracking-tight">
                {yearsRemaining != null && yearsRemaining > 0 ? yearsRemaining : "--"}
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5">years to go</p>
            </div>
            <div className="bg-surface-container-low rounded-xl p-4 text-center">
              <p className="text-2xl font-extrabold text-on-surface tracking-tight">{retirementAge}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">target age</p>
            </div>
          </div>

          {currentAge != null && yearsRemaining != null && yearsRemaining > 0 && (
            <p className="text-xs text-on-surface-variant leading-relaxed">
              You&apos;re {currentAge} today. That gives you <strong>{yearsRemaining} years</strong> to build toward financial independence by age {retirementAge}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2: Retirement Income Target
// ═══════════════════════════════════════════════════════════════════════════

function StepIncome({
  incomeMode, setIncomeMode,
  fixedAmount, setFixedAmount,
  annualIncome, setAnnualIncome,
  inflationRate, setInflationRate,
  withdrawalRate, setWithdrawalRate,
  expectedReturn, setExpectedReturn,
  showExpenseCalc, setShowExpenseCalc,
  expenseCategories, updateExpense, addExpense, removeExpense, applyExpensesToAnnual,
  monthlyExpenseTotal, yearlyExpenseTotal,
  monthlyExpenseFuture, yearlyExpenseFuture,
  annualIncomeToday, annualIncomeFuture,
  portfolioTarget, portfolioTodayDollars,
  inflationAdjustedTarget,
  monthlySavings, annualSavings,
  yearsRemaining, currentAge, retirementAge,
}: {
  incomeMode: "help" | "fixed";
  setIncomeMode: (v: "help" | "fixed") => void;
  fixedAmount: string;
  setFixedAmount: (v: string) => void;
  annualIncome: string;
  setAnnualIncome: (v: string) => void;
  inflationRate: string;
  setInflationRate: (v: string) => void;
  withdrawalRate: string;
  setWithdrawalRate: (v: string) => void;
  expectedReturn: string;
  setExpectedReturn: (v: string) => void;
  showExpenseCalc: boolean;
  setShowExpenseCalc: (v: boolean) => void;
  expenseCategories: { name: string; amount: string }[];
  updateExpense: (i: number, f: "name" | "amount", v: string) => void;
  addExpense: () => void;
  removeExpense: (i: number) => void;
  applyExpensesToAnnual: () => void;
  monthlyExpenseTotal: number;
  yearlyExpenseTotal: number;
  monthlyExpenseFuture: number;
  yearlyExpenseFuture: number;
  annualIncomeToday: number;
  annualIncomeFuture: number;
  portfolioTarget: number;
  portfolioTodayDollars: number;
  inflationAdjustedTarget: number;
  monthlySavings: number;
  annualSavings: number;
  yearsRemaining: number | null;
  currentAge: number | null;
  retirementAge: number;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left: Form */}
      <div className="lg:col-span-3 space-y-6">
        {/* Mode selector */}
        <div className="grid grid-cols-2 gap-3">
          {([
            {
              id: "help" as const,
              icon: "calculate",
              title: "Help me figure it out",
              desc: "Enter your desired annual spending and we'll calculate everything for you.",
            },
            {
              id: "fixed" as const,
              icon: "savings",
              title: "I already have a number",
              desc: "You know your total retirement savings target. Just type it in.",
            },
          ]).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setIncomeMode(opt.id)}
              className={`text-left p-5 rounded-2xl transition-all ${
                incomeMode === opt.id
                  ? "bg-primary-fixed"
                  : "bg-surface-container-lowest hover:bg-surface-container"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`material-symbols-outlined text-[18px] ${incomeMode === opt.id ? "text-primary" : "text-on-surface-variant"}`}>
                  {opt.icon}
                </span>
                <span className={`text-sm font-bold ${incomeMode === opt.id ? "text-primary" : "text-on-surface"}`}>
                  {opt.title}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">{opt.desc}</p>
            </button>
          ))}
        </div>

        {incomeMode === "fixed" ? (
          <section className="bg-surface-container-lowest rounded-2xl p-8 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-2">
                What is your total savings target?
              </label>
              <PrefixedInput prefix="$">
                <NumericInput
                  value={fixedAmount}
                  onChange={setFixedAmount}
                  placeholder="2,000,000"
                  className={INPUT_CLASS}
                />
              </PrefixedInput>
              <FieldHint>
                Enter in today&apos;s dollars. We&apos;ll automatically adjust for inflation to show what this amount will be worth at retirement. This is the total you want across all investment accounts.
              </FieldHint>
            </div>

            {/* Inflation-adjusted preview */}
            {(Number(fixedAmount) || 0) > 0 && yearsRemaining != null && yearsRemaining > 0 && (
              <div className="bg-tertiary-fixed/30 rounded-xl p-4 space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-on-tertiary-fixed-variant">
                  <span className="material-symbols-outlined text-[16px]">trending_up</span>
                  Inflation adjusted
                </div>
                <p className="text-xs text-on-surface-variant">
                  {formatFullCurrency(Number(fixedAmount))} today will need to be approximately{" "}
                  <strong className="text-on-tertiary-fixed-variant">
                    {formatFullCurrency(inflationAdjustedTarget)}
                  </strong>{" "}
                  in {yearsRemaining} years at {inflationRate}% annual inflation.
                </p>
              </div>
            )}
          </section>
        ) : (
          <div className="space-y-6">
            {/* Annual income input */}
            <section className="bg-surface-container-lowest rounded-2xl p-8 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-primary-fixed flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[18px]">payments</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-on-surface">How much per year do you want in retirement?</h3>
                  <p className="text-xs text-on-surface-variant">In today&apos;s dollars. A rough estimate is fine, you can refine this later.</p>
                </div>
              </div>

              <PrefixedInput prefix="$" suffix="/yr">
                <NumericInput
                  value={annualIncome}
                  onChange={setAnnualIncome}
                  placeholder="80,000"
                  className={INPUT_CLASS}
                />
              </PrefixedInput>

              {/* Inflation preview */}
              {annualIncomeToday > 0 && yearsRemaining != null && yearsRemaining > 0 && (
                <div className="bg-tertiary-fixed/30 rounded-xl p-4 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-on-tertiary-fixed-variant">
                    <span className="material-symbols-outlined text-[16px]">trending_up</span>
                    Inflation adjusted
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    {formatFullCurrency(annualIncomeToday)}/yr today will be approximately{" "}
                    <strong className="text-on-tertiary-fixed-variant">
                      {formatFullCurrency(annualIncomeFuture)}/yr
                    </strong>{" "}
                    in {yearsRemaining} years at {inflationRate}% inflation.
                  </p>
                </div>
              )}

              <FieldHint>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">lightbulb</span>
                  Don&apos;t overthink this. A rough number works great as a starting point. You can always adjust later.
                </span>
              </FieldHint>
            </section>

            {/* Expandable expense calculator */}
            <section className="bg-surface-container-lowest rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowExpenseCalc(!showExpenseCalc)}
                className="w-full flex items-center justify-between p-6 hover:bg-surface-container transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-tertiary-fixed flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-tertiary-fixed-variant text-[18px]">receipt_long</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-on-surface">Not sure? Calculate from monthly expenses</p>
                    <p className="text-xs text-on-surface-variant">Add up your expected monthly costs to figure out your yearly need</p>
                  </div>
                </div>
                <span className={`material-symbols-outlined text-on-surface-variant text-[20px] transition-transform ${showExpenseCalc ? "rotate-180" : ""}`}>
                  expand_more
                </span>
              </button>

              {showExpenseCalc && (
                <div className="px-6 pb-6 space-y-4">
                  <div className="bg-surface-container rounded-xl p-3 mb-2">
                    <p className="text-xs text-on-surface-variant flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">info</span>
                      Enter amounts in <strong>today&apos;s dollars</strong>. We&apos;ll estimate the future cost using the inflation rate below.
                    </p>
                  </div>

                  {/* Expense rows */}
                  <div className="space-y-2">
                    {expenseCategories.map((cat, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={cat.name}
                          onChange={(e) => updateExpense(i, "name", e.target.value)}
                          placeholder="Category name"
                          className="flex-1 bg-surface-container-high rounded-xl px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary transition-all"
                        />
                        <div className="relative w-32">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant">$</span>
                          <NumericInput
                            value={cat.amount}
                            onChange={(v) => updateExpense(i, "amount", v)}
                            placeholder="0"
                            className="w-full bg-surface-container-high rounded-xl pl-7 pr-8 py-2.5 text-sm text-on-surface text-right placeholder:text-on-surface-variant/50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary transition-all"
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant">/mo</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeExpense(i)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-all"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addExpense}
                    className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Add expense
                  </button>

                  {/* Expense totals */}
                  {monthlyExpenseTotal > 0 && (
                    <div className="bg-surface-container rounded-xl p-4 space-y-3">
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-xs text-on-surface-variant mb-0.5">Monthly total</p>
                          <p className="text-lg font-bold text-on-surface">{formatFullCurrency(monthlyExpenseTotal)}</p>
                          <p className="text-xs text-on-surface-variant">today</p>
                        </div>
                        <div>
                          <p className="text-xs text-on-surface-variant mb-0.5">Yearly total</p>
                          <p className="text-lg font-bold text-on-surface">{formatFullCurrency(yearlyExpenseTotal)}</p>
                          <p className="text-xs text-on-surface-variant">today</p>
                        </div>
                        <div>
                          <p className="text-xs text-on-surface-variant mb-0.5">Yearly at retirement</p>
                          <p className="text-lg font-bold text-tertiary">{formatFullCurrency(yearlyExpenseFuture)}</p>
                          <p className="text-xs text-on-surface-variant">inflation-adjusted</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={applyExpensesToAnnual}
                        className="w-full py-2.5 rounded-full text-sm font-semibold text-primary bg-primary-fixed/50 hover:bg-primary-fixed transition-colors"
                      >
                        Use {formatFullCurrency(yearlyExpenseTotal)}/yr as my retirement income
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Advanced parameters */}
            <section className="bg-surface-container-lowest rounded-2xl p-8 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-on-surface-variant text-[18px]">tune</span>
                <h3 className="text-sm font-bold text-on-surface">Assumptions</h3>
                <span className="text-xs text-on-surface-variant">(defaults work well for most people)</span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 flex items-center">
                    Inflation rate
                    <InfoTooltip>
                      Average annual price increase. Historically about 3% in the US. This adjusts your target so it reflects real future costs.
                    </InfoTooltip>
                  </label>
                  <PrefixedInput suffix="%">
                    <input
                      type="number"
                      min={0}
                      max={15}
                      step="0.1"
                      value={inflationRate}
                      onChange={(e) => setInflationRate(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </PrefixedInput>
                  <p className="text-xs text-on-surface-variant mt-1">Default: 3%. Most people keep this as-is.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 flex items-center">
                    Withdrawal rate
                    <InfoTooltip>
                      The percentage of your portfolio you withdraw each year. The "4% rule" means savings should last 30+ years. Lower is safer, higher means you need less saved but carries more risk.
                    </InfoTooltip>
                  </label>
                  <PrefixedInput suffix="%">
                    <input
                      type="number"
                      min={0.5}
                      max={20}
                      step="0.1"
                      value={withdrawalRate}
                      onChange={(e) => setWithdrawalRate(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </PrefixedInput>
                  <p className="text-xs text-on-surface-variant mt-1">Default: 4%. A widely accepted safe rate.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 flex items-center">
                    Expected return
                    <InfoTooltip>
                      How much your investments grow per year on average. A diversified index fund portfolio has historically returned about 7%. Conservative: 5-6%. Optimistic: 8-9%.
                    </InfoTooltip>
                  </label>
                  <PrefixedInput suffix="%">
                    <input
                      type="number"
                      min={0}
                      max={30}
                      step="0.1"
                      value={expectedReturn}
                      onChange={(e) => setExpectedReturn(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </PrefixedInput>
                  <p className="text-xs text-on-surface-variant mt-1">Default: 7%. Historical stock market average.</p>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Right: Live Summary */}
      <div className="lg:col-span-2">
        <div className="bg-surface-container-lowest rounded-2xl p-6 space-y-5 sticky top-6">
          <p className="text-label-sm font-bold text-on-surface-variant tracking-widest uppercase">
            Your Plan
          </p>

          {/* Portfolio target: big number */}
          <div className="text-center space-y-1 py-2">
            <p className="text-xs text-on-surface-variant uppercase tracking-wide">Portfolio target</p>
            <p className="text-4xl font-extrabold text-on-surface tracking-tight">
              {inflationAdjustedTarget > 0 ? formatCurrency(inflationAdjustedTarget) : "--"}
            </p>
            {inflationAdjustedTarget > 0 && portfolioTodayDollars > 0 && inflationAdjustedTarget !== portfolioTodayDollars && (
              <p className="text-xs text-on-surface-variant">
                {formatCurrency(portfolioTodayDollars)} in today&apos;s dollars
              </p>
            )}
          </div>

          {/* Metric tiles */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-container-low rounded-xl p-4 text-center">
              <p className="text-2xl font-extrabold text-primary tracking-tight">
                {monthlySavings > 0 ? formatFullCurrency(monthlySavings) : "--"}
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5">per month</p>
            </div>
            <div className="bg-surface-container-low rounded-xl p-4 text-center">
              <p className="text-2xl font-extrabold text-primary tracking-tight">
                {annualSavings > 0 ? formatFullCurrency(annualSavings) : "--"}
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5">per year</p>
            </div>
            <div className="bg-surface-container-low rounded-xl p-4 text-center">
              <p className="text-2xl font-extrabold text-on-surface tracking-tight">
                {yearsRemaining != null && yearsRemaining > 0 ? yearsRemaining : "--"}
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5">years to go</p>
            </div>
            <div className="bg-surface-container-low rounded-xl p-4 text-center">
              <p className="text-2xl font-extrabold text-on-surface tracking-tight">
                {currentAge ?? "--"} → {retirementAge}
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5">age range</p>
            </div>
          </div>

          <p className="text-xs text-on-surface-variant leading-relaxed">
            <span className="material-symbols-outlined text-[12px] align-middle mr-0.5">info</span>
            Based on {expectedReturn}% annual return and {inflationRate}% inflation. These are estimates you can refine anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
