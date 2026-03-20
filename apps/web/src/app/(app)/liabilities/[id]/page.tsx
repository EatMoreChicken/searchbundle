"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import type { Debt, DebtType, Scenario } from "@/types";
import AmortizationChart, { calculateAmortization } from "@/components/AmortizationChart";

const TYPE_LABELS: Record<DebtType, string> = {
  mortgage: "Mortgage",
  auto: "Car Loan",
  student_loan: "Student Loan",
  credit_card: "Credit Card",
  other: "Other",
};

const TYPE_ICONS: Record<DebtType, string> = {
  mortgage: "home",
  auto: "directions_car",
  student_loan: "school",
  credit_card: "credit_card",
  other: "radio_button_checked",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function formatCurrencyPrecise(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

function formatMonths(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} month${m !== 1 ? "s" : ""}`;
  if (m === 0) return `${y} year${y !== 1 ? "s" : ""}`;
  return `${y}yr ${m}mo`;
}

interface FormState {
  name: string;
  type: DebtType;
  balance: string;
  originalBalance: string;
  interestRate: string;
  minimumPayment: string;
  escrowAmount: string;
  remainingMonths: string;
  notes: string;
}

export default function LiabilityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [debt, setDebt] = useState<Debt | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // What-if scenario state
  const [extraMonthly, setExtraMonthly] = useState("");
  const [extraYearly, setExtraYearly] = useState("");
  const [lumpSum, setLumpSum] = useState("");
  const [lumpSumMonth, setLumpSumMonth] = useState("1");
  const [scenarioActive, setScenarioActive] = useState(false);

  // Saved scenarios
  const [savedScenarios, setSavedScenarios] = useState<Scenario[]>([]);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  const [savingScenario, setSavingScenario] = useState(false);

  async function fetchDebt() {
    setLoading(true);
    try {
      const data = await apiClient.get<Debt>(`/api/liabilities/${id}`);
      setDebt(data);
    } finally {
      setLoading(false);
    }
  }

  async function fetchScenarios() {
    try {
      const data = await apiClient.get<Scenario[]>(`/api/liabilities/${id}/scenarios`);
      setSavedScenarios(data);
    } catch { /* ignore if no scenarios */ }
  }

  useEffect(() => { fetchDebt(); fetchScenarios(); }, [id]);

  function openEdit() {
    if (!debt) return;
    setForm({
      name: debt.name,
      type: debt.type,
      balance: String(debt.balance),
      originalBalance: String(debt.originalBalance),
      interestRate: String(debt.interestRate),
      minimumPayment: String(debt.minimumPayment),
      escrowAmount: debt.escrowAmount != null ? String(debt.escrowAmount) : "",
      remainingMonths: debt.remainingMonths != null ? String(debt.remainingMonths) : "",
      notes: debt.notes ?? "",
    });
    setEditOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !debt) return;
    setSaving(true);
    try {
      const hasMortgageFields = form.type === "mortgage";
      const payload = {
        name: form.name,
        type: form.type,
        balance: form.balance,
        originalBalance: form.originalBalance,
        interestRate: form.interestRate,
        minimumPayment: form.minimumPayment,
        escrowAmount: hasMortgageFields && form.escrowAmount ? form.escrowAmount : null,
        remainingMonths: form.remainingMonths ? form.remainingMonths : null,
        notes: form.notes || null,
      };
      await apiClient.put(`/api/liabilities/${debt.id}`, payload);
      setEditOpen(false);
      await fetchDebt();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!debt) return;
    await apiClient.delete(`/api/liabilities/${debt.id}`);
    router.push("/liabilities");
  }

  function clearScenario() {
    setExtraMonthly("");
    setExtraYearly("");
    setLumpSum("");
    setLumpSumMonth("1");
    setScenarioActive(false);
  }

  function loadScenario(scenario: Scenario) {
    setExtraMonthly(scenario.extraMonthlyPayment > 0 ? String(scenario.extraMonthlyPayment) : "");
    setExtraYearly(scenario.extraYearlyPayment > 0 ? String(scenario.extraYearlyPayment) : "");
    setLumpSum(scenario.lumpSumPayment > 0 ? String(scenario.lumpSumPayment) : "");
    setLumpSumMonth(String(scenario.lumpSumMonth));
    setScenarioActive(true);
  }

  async function handleSaveScenario() {
    if (!scenarioName.trim()) return;
    setSavingScenario(true);
    try {
      await apiClient.post(`/api/liabilities/${id}/scenarios`, {
        name: scenarioName.trim(),
        extraMonthlyPayment: extraMonthly ? Number(extraMonthly) : 0,
        extraYearlyPayment: extraYearly ? Number(extraYearly) : 0,
        lumpSumPayment: lumpSum ? Number(lumpSum) : 0,
        lumpSumMonth: lumpSumMonth ? Number(lumpSumMonth) : 1,
      });
      setSaveModalOpen(false);
      setScenarioName("");
      await fetchScenarios();
    } finally {
      setSavingScenario(false);
    }
  }

  async function handleDeleteScenario(scenarioId: string) {
    await apiClient.delete(`/api/liabilities/${id}/scenarios/${scenarioId}`);
    await fetchScenarios();
  }

  const hasScenarioInputs = !!(extraMonthly || extraYearly || lumpSum);

  useEffect(() => {
    setScenarioActive(hasScenarioInputs);
  }, [extraMonthly, extraYearly, lumpSum]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[14px] text-on-surface-variant">Loading…</p>
      </div>
    );
  }

  if (!debt) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-[14px] text-on-surface-variant">Liability not found.</p>
        <button onClick={() => router.push("/liabilities")} className="text-[13px] text-primary underline">
          Back to Liabilities
        </button>
      </div>
    );
  }

  // Calculations
  const baseAmort = calculateAmortization(
    debt.balance, debt.interestRate, debt.minimumPayment, debt.remainingMonths
  );

  const scenarioAmort = scenarioActive
    ? calculateAmortization(
        debt.balance,
        debt.interestRate,
        debt.minimumPayment,
        debt.remainingMonths,
        Number(extraMonthly) || 0,
        Number(extraYearly) || 0,
        Number(lumpSum) || 0,
        Number(lumpSumMonth) || 1
      )
    : null;

  const monthsSaved = scenarioAmort ? baseAmort.payoffMonths - scenarioAmort.payoffMonths : 0;
  const interestSaved = scenarioAmort ? baseAmort.totalInterest - scenarioAmort.totalInterest : 0;

  const paidDown = debt.originalBalance > 0
    ? ((debt.originalBalance - debt.balance) / debt.originalBalance) * 100
    : 0;

  const totalWithEscrow = debt.escrowAmount
    ? debt.minimumPayment + debt.escrowAmount
    : debt.minimumPayment;

  return (
    <div className="min-h-screen p-12">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/liabilities")}
          className="flex items-center gap-2 text-[13px] text-on-surface-variant hover:text-on-surface"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Liabilities
        </button>
        <div className="flex gap-2">
          <button
            onClick={openEdit}
            className="flex items-center gap-2 rounded-full bg-surface-container-low px-4 py-2.5 text-[13px] font-medium text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span>
            Edit
          </button>
          <button
            onClick={() => setDeleteConfirm(true)}
            className="flex items-center gap-2 rounded-full bg-surface-container-low px-4 py-2.5 text-[13px] font-medium text-on-surface-variant hover:bg-error-container hover:text-error"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
            Delete
          </button>
        </div>
      </div>

      {/* Debt header */}
      <div className="mt-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-error-container">
            <span className="material-symbols-outlined text-[18px] text-error">{TYPE_ICONS[debt.type]}</span>
          </div>
          <span className="text-[11px] uppercase tracking-[1.5px] text-on-surface-variant">
            {TYPE_LABELS[debt.type]}
          </span>
        </div>
        <h1 className="mt-3 font-headline font-extrabold text-4xl text-on-surface">{debt.name}</h1>
        <p className="mt-2 text-5xl font-bold tracking-tight text-error">
          {formatCurrency(debt.balance)}
        </p>
      </div>

      {/* Key metrics */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl bg-surface-container-lowest p-5">
          <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">Interest Rate</p>
          <p className="mt-2 text-xl font-bold text-tertiary">{debt.interestRate}%</p>
          <p className="mt-1 text-[12px] text-on-surface-variant">annual</p>
        </div>
        <div className="rounded-xl bg-surface-container-lowest p-5">
          <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">Monthly Payment</p>
          <p className="mt-2 text-xl font-bold text-on-surface">{formatCurrency(debt.minimumPayment)}</p>
          {debt.escrowAmount != null && debt.escrowAmount > 0 && (
            <p className="mt-1 text-[12px] text-on-surface-variant">
              + {formatCurrency(debt.escrowAmount)} escrow = {formatCurrency(totalWithEscrow)}
            </p>
          )}
        </div>
        <div className="rounded-xl bg-surface-container-lowest p-5">
          <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">Total Interest</p>
          <p className="mt-2 text-xl font-bold text-tertiary">{formatCurrency(baseAmort.totalInterest)}</p>
          <p className="mt-1 text-[12px] text-on-surface-variant">over life of loan</p>
        </div>
        <div className="rounded-xl bg-surface-container-lowest p-5">
          <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">Payoff In</p>
          <p className="mt-2 text-xl font-bold text-on-surface">{formatMonths(baseAmort.payoffMonths)}</p>
          <p className="mt-1 text-[12px] text-on-surface-variant">{baseAmort.payoffMonths} payments left</p>
        </div>
      </div>

      {/* Progress */}
      <div className="mt-6 rounded-xl bg-surface-container-lowest p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">Paid Off</p>
            <p className="mt-1 text-2xl font-bold text-secondary">{paidDown.toFixed(1)}%</p>
          </div>
          <div className="text-right">
            <p className="text-[12px] text-on-surface-variant">
              {formatCurrency(debt.originalBalance - debt.balance)} of {formatCurrency(debt.originalBalance)}
            </p>
          </div>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-surface-container-highest">
          <div
            className="h-full rounded-full bg-secondary transition-all"
            style={{ width: `${Math.min(100, paidDown)}%` }}
          />
        </div>
      </div>

      {/* Amortization chart */}
      <div className="mt-8 rounded-2xl bg-surface-container-lowest p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[2px] text-primary">Amortization</p>
            <h2 className="mt-1 text-xl font-bold text-on-surface">Payoff Schedule</h2>
          </div>
          {scenarioActive && scenarioAmort && (
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-secondary-fixed/30 px-3 py-1.5">
                <span className="text-[12px] font-semibold text-secondary">
                  {monthsSaved > 0 ? `${formatMonths(monthsSaved)} sooner` : "No change"}
                </span>
              </div>
              {interestSaved > 0 && (
                <div className="rounded-full bg-secondary-fixed/30 px-3 py-1.5">
                  <span className="text-[12px] font-semibold text-secondary">
                    {formatCurrency(interestSaved)} saved
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6">
          <AmortizationChart
            schedule={scenarioActive && scenarioAmort ? scenarioAmort.schedule : baseAmort.schedule}
            comparisonSchedule={scenarioActive && scenarioAmort ? baseAmort.schedule : undefined}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-[12px] text-on-surface-variant">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5 rounded bg-error" />
            {scenarioActive ? "Scenario balance" : "Remaining balance"}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-5 rounded bg-tertiary-fixed" />
            Cumulative interest
          </span>
          {scenarioActive && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-5 rounded border-t border-dashed border-secondary" />
              Original payoff
            </span>
          )}
        </div>
      </div>

      {/* What-If Scenario Panel */}
      <div className="mt-8 rounded-2xl bg-surface-container-lowest p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[2px] text-primary">What If</p>
            <h2 className="mt-1 text-xl font-bold text-on-surface">Extra Payment Scenarios</h2>
          </div>
          <div className="flex gap-2">
            {scenarioActive && (
              <>
                <button
                  onClick={() => setSaveModalOpen(true)}
                  className="flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-container px-4 py-2.5 text-[13px] font-semibold text-on-primary transition-transform active:scale-95"
                >
                  <span className="material-symbols-outlined text-[14px]">bookmark</span>
                  Save Scenario
                </button>
                <button
                  onClick={clearScenario}
                  className="flex items-center gap-2 rounded-full bg-surface-container-low px-4 py-2.5 text-[13px] font-medium text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                  Discard
                </button>
              </>
            )}
          </div>
        </div>

        <p className="mt-3 text-[14px] text-on-surface-variant">
          See how extra payments affect your payoff timeline and total interest paid.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-on-surface">
              Extra Monthly Payment
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-on-surface-variant">$</span>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="200"
                value={extraMonthly}
                onChange={(e) => setExtraMonthly(e.target.value)}
                className="w-full rounded-[10px] bg-surface-container-high pl-7 pr-4 py-3.5 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
              />
            </div>
            <p className="mt-1 text-[11px] text-on-surface-variant">Added to every monthly payment</p>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-on-surface">
              Extra Annual Payment
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-on-surface-variant">$</span>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="1000"
                value={extraYearly}
                onChange={(e) => setExtraYearly(e.target.value)}
                className="w-full rounded-[10px] bg-surface-container-high pl-7 pr-4 py-3.5 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
              />
            </div>
            <p className="mt-1 text-[11px] text-on-surface-variant">One extra payment each year</p>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-on-surface">
              Lump Sum Payment
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-on-surface-variant">$</span>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="5000"
                value={lumpSum}
                onChange={(e) => setLumpSum(e.target.value)}
                className="w-full rounded-[10px] bg-surface-container-high pl-7 pr-4 py-3.5 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
              />
            </div>
            <p className="mt-1 text-[11px] text-on-surface-variant">One-time additional payment</p>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-on-surface">
              Lump Sum in Month
            </label>
            <input
              type="number"
              min="1"
              max={baseAmort.payoffMonths}
              step="1"
              placeholder="1"
              value={lumpSumMonth}
              onChange={(e) => setLumpSumMonth(e.target.value)}
              className="w-full rounded-[10px] bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1 text-[11px] text-on-surface-variant">When the lump sum is applied</p>
          </div>
        </div>

        {/* Scenario comparison summary */}
        {scenarioActive && scenarioAmort && (
          <div className="mt-6 grid grid-cols-1 gap-4 rounded-xl border border-secondary/20 bg-secondary-fixed/30 p-6 sm:grid-cols-3">
            <div>
              <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">New Payoff Time</p>
              <p className="mt-1 text-xl font-bold text-secondary">
                {formatMonths(scenarioAmort.payoffMonths)}
              </p>
              {monthsSaved > 0 && (
                <p className="mt-0.5 text-[12px] text-secondary">{formatMonths(monthsSaved)} sooner</p>
              )}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">New Total Interest</p>
              <p className="mt-1 text-xl font-bold text-secondary">
                {formatCurrency(scenarioAmort.totalInterest)}
              </p>
              {interestSaved > 0 && (
                <p className="mt-0.5 text-[12px] text-secondary">{formatCurrency(interestSaved)} saved</p>
              )}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">New Total Cost</p>
              <p className="mt-1 text-xl font-bold text-on-surface">
                {formatCurrency(scenarioAmort.totalPaid)}
              </p>
              <p className="mt-0.5 text-[12px] text-on-surface-variant">
                was {formatCurrency(baseAmort.totalPaid)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Saved Scenarios */}
      {savedScenarios.length > 0 && (
        <div className="mt-8 rounded-2xl bg-surface-container-lowest p-8">
          <p className="text-[11px] uppercase tracking-[2px] text-primary">Saved</p>
          <h2 className="mt-1 text-xl font-bold text-on-surface">Saved Scenarios</h2>

          <div className="mt-4 space-y-3">
            {savedScenarios.map((scenario) => (
              <div
                key={scenario.id}
                className="flex items-center justify-between rounded-xl bg-surface-container-low p-4"
              >
                <div>
                  <p className="text-[15px] font-semibold text-on-surface">{scenario.name}</p>
                  <div className="mt-1 flex flex-wrap gap-3 text-[12px] text-on-surface-variant">
                    {scenario.extraMonthlyPayment > 0 && (
                      <span>+{formatCurrencyPrecise(scenario.extraMonthlyPayment)}/mo</span>
                    )}
                    {scenario.extraYearlyPayment > 0 && (
                      <span>+{formatCurrencyPrecise(scenario.extraYearlyPayment)}/yr</span>
                    )}
                    {scenario.lumpSumPayment > 0 && (
                      <span>+{formatCurrencyPrecise(scenario.lumpSumPayment)} lump sum (month {scenario.lumpSumMonth})</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadScenario(scenario)}
                    className="rounded-lg px-3 py-2 text-[12px] font-medium text-primary hover:bg-primary-fixed/30"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => handleDeleteScenario(scenario.id)}
                    className="rounded-lg px-3 py-2 text-[12px] font-medium text-on-surface-variant hover:bg-error-container hover:text-error"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loan breakdown info */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-surface-container-lowest p-6">
          <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">Loan Summary</p>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between text-[14px]">
              <span className="text-on-surface-variant">Original Balance</span>
              <span className="font-bold text-on-surface">{formatCurrency(debt.originalBalance)}</span>
            </div>
            <div className="flex justify-between text-[14px]">
              <span className="text-on-surface-variant">Principal Paid</span>
              <span className="font-bold text-secondary">{formatCurrency(debt.originalBalance - debt.balance)}</span>
            </div>
            <div className="flex justify-between text-[14px]">
              <span className="text-on-surface-variant">Remaining Balance</span>
              <span className="font-bold text-error">{formatCurrency(debt.balance)}</span>
            </div>
            <div className="pt-3 flex justify-between text-[14px]">
              <span className="text-on-surface-variant">Total Interest (remaining)</span>
              <span className="font-bold text-tertiary">{formatCurrency(baseAmort.totalInterest)}</span>
            </div>
            <div className="flex justify-between text-[14px]">
              <span className="text-on-surface-variant">Total Cost (remaining)</span>
              <span className="font-bold text-on-surface">{formatCurrency(baseAmort.totalPaid)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-surface-container-lowest p-6">
          <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">Payment Breakdown</p>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between text-[14px]">
              <span className="text-on-surface-variant">Principal &amp; Interest</span>
              <span className="font-bold text-on-surface">{formatCurrencyPrecise(debt.minimumPayment)}/mo</span>
            </div>
            {debt.escrowAmount != null && debt.escrowAmount > 0 && (
              <>
                <div className="flex justify-between text-[14px]">
                  <span className="text-on-surface-variant">Escrow (Tax &amp; Ins.)</span>
                  <span className="font-bold text-on-surface">{formatCurrencyPrecise(debt.escrowAmount)}/mo</span>
                </div>
                <div className="pt-3 flex justify-between text-[14px]">
                  <span className="font-medium text-on-surface">Total Monthly</span>
                  <span className="font-bold text-on-surface">{formatCurrencyPrecise(totalWithEscrow)}/mo</span>
                </div>
              </>
            )}
            {debt.remainingMonths != null && (
              <div className="flex justify-between text-[14px]">
                <span className="text-on-surface-variant">Remaining Term</span>
                <span className="font-bold text-on-surface">{formatMonths(debt.remainingMonths)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      {debt.notes && (
        <div className="mt-6 rounded-xl bg-surface-container-lowest p-6">
          <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">Notes</p>
          <p className="mt-2 text-[14px] text-on-surface-variant">{debt.notes}</p>
        </div>
      )}

      {/* Save Scenario Modal */}
      {saveModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/20"
          onClick={(e) => { if (e.target === e.currentTarget) setSaveModalOpen(false); }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-surface-container-lowest/80 backdrop-blur-[20px] p-8 shadow-xl">
            <h2 className="font-headline font-extrabold text-2xl text-on-surface">Save Scenario</h2>
            <p className="mt-2 text-[14px] text-on-surface-variant">
              Give this scenario a name so you can load it later.
            </p>
            <input
              type="text"
              placeholder="e.g. Aggressive payoff"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              className="mt-4 w-full rounded-[10px] bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
              autoFocus
            />
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setSaveModalOpen(false)}
                className="flex-1 rounded-[10px] bg-surface-container-low py-3 text-[14px] font-semibold text-on-surface-variant hover:bg-surface-container"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveScenario}
                disabled={savingScenario || !scenarioName.trim()}
                className="flex-1 rounded-[10px] bg-gradient-to-r from-primary to-primary-container py-3 text-[14px] font-semibold text-on-primary disabled:opacity-50"
              >
                {savingScenario ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editOpen && form && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-on-surface/20 sm:items-center"
          onClick={(e) => { if (e.target === e.currentTarget) setEditOpen(false); }}
        >
          <div className="w-full max-w-lg rounded-t-2xl bg-surface-container-lowest/80 backdrop-blur-[20px] p-8 shadow-xl sm:rounded-2xl sm:max-h-[90vh] sm:overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-headline font-extrabold text-2xl text-on-surface">Edit Liability</h2>
              <button
                onClick={() => setEditOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-[10px] bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Balance</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={form.balance}
                    onChange={(e) => setForm({ ...form, balance: e.target.value })}
                    className="w-full rounded-[10px] bg-surface-container-high px-4 py-3.5 text-[15px] font-bold text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Original Balance</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={form.originalBalance}
                    onChange={(e) => setForm({ ...form, originalBalance: e.target.value })}
                    className="w-full rounded-[10px] bg-surface-container-high px-4 py-3.5 text-[15px] font-bold text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1.5 block text-[13px] font-medium text-on-surface">
                    Interest Rate <span className="font-normal text-on-surface-variant">(%)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="0"
                      max="100"
                      step="0.01"
                      value={form.interestRate}
                      onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                      className="w-full rounded-[10px] bg-surface-container-high px-4 py-3.5 pr-8 text-[14px] text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-on-surface-variant">%</span>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Monthly Payment</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={form.minimumPayment}
                    onChange={(e) => setForm({ ...form, minimumPayment: e.target.value })}
                    className="w-full rounded-[10px] bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Remaining Months</label>
                <input
                  type="number"
                  min="1"
                  max="600"
                  step="1"
                  value={form.remainingMonths}
                  onChange={(e) => setForm({ ...form, remainingMonths: e.target.value })}
                  className="w-full rounded-[10px] bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                />
              </div>

              {form.type === "mortgage" && (
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-on-surface">
                    Escrow (Taxes &amp; Insurance) <span className="font-normal text-on-surface-variant">(per month)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.escrowAmount}
                    onChange={(e) => setForm({ ...form, escrowAmount: e.target.value })}
                    className="w-full rounded-[10px] bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-[10px] bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="flex-1 rounded-[10px] bg-surface-container-low py-3 text-[14px] font-semibold text-on-surface-variant hover:bg-surface-container"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-[10px] bg-gradient-to-r from-primary to-primary-container py-3 text-[14px] font-semibold text-on-primary disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/20"
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(false); }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-surface-container-lowest/80 backdrop-blur-[20px] p-8 shadow-xl">
            <h2 className="font-headline font-extrabold text-2xl text-on-surface">Delete liability?</h2>
            <p className="mt-2 text-[14px] text-on-surface-variant">
              This will permanently remove this liability and all its saved scenarios. This cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 rounded-[10px] bg-surface-container-low py-3 text-[14px] font-semibold text-on-surface-variant hover:bg-surface-container"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 rounded-[10px] bg-error py-3 text-[14px] font-semibold text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
