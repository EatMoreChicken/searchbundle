"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import type { Debt, DebtType, DebtBalanceUpdate, DebtNote, Scenario, InterestAccrualMethod } from "@/types";
import AmortizationChart from "@/components/AmortizationChart";
import {
  calculateAmortization,
  calculateMortgageBreakdown,
  calculateEquity,
  ACCRUAL_METHOD_INFO,
  getDefaultAccrualMethod,
} from "@/lib/loan-calculations";
import type { AmortizationResult } from "@/lib/loan-calculations";

const TYPE_LABELS: Record<DebtType, string> = {
  simple: "Simple Debt",
  mortgage: "Mortgage",
  auto: "Auto Loan",
  loan: "Loan",
  student_loan: "Student Loan",
  credit_card: "Credit Card",
  other: "Other",
};

const TYPE_ICONS: Record<DebtType, string> = {
  simple: "receipt_long",
  mortgage: "home",
  auto: "directions_car",
  loan: "account_balance",
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const isLoanType = (t: DebtType) => t !== "simple";

const FULL_EXPR_PATTERN = /^(-?\d+\.?\d*)\s*([+\-*/])\s*(-?\d+\.?\d*)$/;

function isExpression(value: string): boolean {
  const m = value.trim().match(FULL_EXPR_PATTERN);
  if (!m) return false;
  return value.trim().indexOf(m[2], 1) > 0;
}

function applyExpression(input: string): number | null {
  const m = input.trim().match(FULL_EXPR_PATTERN);
  if (!m) return null;
  const left = parseFloat(m[1]), right = parseFloat(m[3]);
  if (isNaN(left) || isNaN(right)) return null;
  switch (m[2]) {
    case "+": return left + right;
    case "-": return left - right;
    case "*": return left * right;
    case "/": return right === 0 ? null : left / right;
  }
  return null;
}

interface EditFormState {
  name: string;
  type: DebtType;
  originalBalance: string;
  interestRate: string;
  minimumPayment: string;
  escrowAmount: string;
  remainingMonths: string;
  notes: string;
  interestAccrualMethod: InterestAccrualMethod;
  homeValue: string;
  pmiMonthly: string;
  propertyTaxYearly: string;
  homeInsuranceYearly: string;
  loanStartDate: string;
  loanTermMonths: string;
  vehicleValue: string;
}

export default function LiabilityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [debt, setDebt] = useState<Debt | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<EditFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Inline balance editor
  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState("");
  const balanceRef = useRef<HTMLInputElement>(null);

  // Balance history & notes
  const [history, setHistory] = useState<DebtBalanceUpdate[]>([]);
  const [notes, setNotes] = useState<DebtNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

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

  async function fetchHistory() {
    try {
      const data = await apiClient.get<DebtBalanceUpdate[]>(`/api/liabilities/${id}/history`);
      setHistory(data);
    } catch { /* ignore */ }
  }

  async function fetchNotes() {
    try {
      const data = await apiClient.get<DebtNote[]>(`/api/liabilities/${id}/notes`);
      setNotes(data);
    } catch { /* ignore */ }
  }

  async function fetchScenarios() {
    try {
      const data = await apiClient.get<Scenario[]>(`/api/liabilities/${id}/scenarios`);
      setSavedScenarios(data);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    fetchDebt();
    fetchHistory();
    fetchNotes();
    fetchScenarios();
  }, [id]);

  // Inline balance edit functions
  function openBalanceEditor() {
    if (!debt) return;
    setBalanceInput(String(debt.balance));
    setEditingBalance(true);
    setTimeout(() => {
      const el = balanceRef.current;
      if (!el) return;
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }, 50);
  }

  async function saveBalance() {
    if (!debt) return;
    const trimmed = balanceInput.trim();
    if (!trimmed) { setEditingBalance(false); return; }

    let newBalance: number;
    if (isExpression(trimmed)) {
      const result = applyExpression(trimmed);
      if (result === null) { setEditingBalance(false); return; }
      newBalance = Math.round(result * 100) / 100;
    } else {
      const parsed = parseFloat(trimmed);
      if (isNaN(parsed)) { setEditingBalance(false); return; }
      newBalance = Math.round(parsed * 100) / 100;
    }

    if (newBalance === debt.balance) { setEditingBalance(false); return; }

    try {
      await apiClient.post(`/api/liabilities/${id}/history`, { newBalance });
      setEditingBalance(false);
      await fetchDebt();
      await fetchHistory();
    } catch {
      setEditingBalance(false);
    }
  }

  async function addNote() {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      await apiClient.post(`/api/liabilities/${id}/notes`, { content: newNote.trim() });
      setNewNote("");
      await fetchNotes();
    } finally {
      setAddingNote(false);
    }
  }

  async function deleteNote(noteId: string) {
    await apiClient.delete(`/api/liabilities/${id}/notes/${noteId}`);
    await fetchNotes();
  }

  function openEdit() {
    if (!debt) return;
    setForm({
      name: debt.name,
      type: debt.type,
      originalBalance: debt.originalBalance != null ? String(debt.originalBalance) : "",
      interestRate: debt.interestRate != null ? String(debt.interestRate) : "",
      minimumPayment: debt.minimumPayment != null ? String(debt.minimumPayment) : "",
      escrowAmount: debt.escrowAmount != null ? String(debt.escrowAmount) : "",
      remainingMonths: debt.remainingMonths != null ? String(debt.remainingMonths) : "",
      notes: debt.notes ?? "",
      interestAccrualMethod: debt.interestAccrualMethod ?? getDefaultAccrualMethod(debt.type),
      homeValue: debt.homeValue != null ? String(debt.homeValue) : "",
      pmiMonthly: debt.pmiMonthly != null ? String(debt.pmiMonthly) : "",
      propertyTaxYearly: debt.propertyTaxYearly != null ? String(debt.propertyTaxYearly) : "",
      homeInsuranceYearly: debt.homeInsuranceYearly != null ? String(debt.homeInsuranceYearly) : "",
      loanStartDate: debt.loanStartDate ?? "",
      loanTermMonths: debt.loanTermMonths != null ? String(debt.loanTermMonths) : "",
      vehicleValue: debt.vehicleValue != null ? String(debt.vehicleValue) : "",
    });
    setEditOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !debt) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        type: form.type,
        balance: debt.balance,
        notes: form.notes || null,
      };

      if (isLoanType(form.type)) {
        payload.originalBalance = form.originalBalance || null;
        payload.interestRate = form.interestRate || null;
        payload.minimumPayment = form.minimumPayment || null;
        payload.remainingMonths = form.remainingMonths || null;
        payload.loanStartDate = form.loanStartDate || null;
        payload.loanTermMonths = form.loanTermMonths || null;
        payload.interestAccrualMethod = form.interestAccrualMethod;
      }
      if (form.type === "mortgage") {
        payload.homeValue = form.homeValue || null;
        payload.escrowAmount = form.escrowAmount || null;
        payload.pmiMonthly = form.pmiMonthly || null;
        payload.propertyTaxYearly = form.propertyTaxYearly || null;
        payload.homeInsuranceYearly = form.homeInsuranceYearly || null;
      }
      if (form.type === "auto") {
        payload.vehicleValue = form.vehicleValue || null;
      }

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
        <p className="text-[14px] text-on-surface-variant">Loading...</p>
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

  const hasLoanData = isLoanType(debt.type) && debt.interestRate != null && debt.minimumPayment != null;
  const accrualMethod = debt.interestAccrualMethod ?? getDefaultAccrualMethod(debt.type);

  const baseAmort: AmortizationResult | null = hasLoanData
    ? calculateAmortization(
        debt.balance,
        debt.interestRate!,
        debt.minimumPayment!,
        debt.remainingMonths,
        accrualMethod,
        debt.originalBalance,
        debt.loanTermMonths
      )
    : null;

  const scenarioAmort: AmortizationResult | null = hasLoanData && scenarioActive
    ? calculateAmortization(
        debt.balance,
        debt.interestRate!,
        debt.minimumPayment!,
        debt.remainingMonths,
        accrualMethod,
        debt.originalBalance,
        debt.loanTermMonths,
        Number(extraMonthly) || 0,
        Number(extraYearly) || 0,
        Number(lumpSum) || 0,
        Number(lumpSumMonth) || 1
      )
    : null;

  const monthsSaved = baseAmort && scenarioAmort ? baseAmort.payoffMonths - scenarioAmort.payoffMonths : 0;
  const interestSaved = baseAmort && scenarioAmort ? baseAmort.totalInterest - scenarioAmort.totalInterest : 0;

  const paidDown = debt.originalBalance != null && debt.originalBalance > 0
    ? ((debt.originalBalance - debt.balance) / debt.originalBalance) * 100
    : 0;

  const mortgageBreakdown = debt.type === "mortgage" && debt.minimumPayment != null
    ? calculateMortgageBreakdown(
        debt.minimumPayment,
        debt.propertyTaxYearly,
        debt.homeInsuranceYearly,
        debt.pmiMonthly,
        debt.escrowAmount
      )
    : null;

  const equity = debt.type === "mortgage" ? calculateEquity(debt.homeValue, debt.balance) : null;
  const isUpsideDown = debt.type === "auto" && debt.vehicleValue != null && debt.balance > debt.vehicleValue;

  // Merge timeline of history + notes
  const timeline: Array<{ type: "update" | "note"; date: string; data: DebtBalanceUpdate | DebtNote }> = [
    ...history.map((h) => ({ type: "update" as const, date: h.createdAt, data: h })),
    ...notes.map((n) => ({ type: "note" as const, date: n.createdAt, data: n })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="min-h-screen p-6">
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

      {/* Header */}
      <div className="mt-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-error-container">
            <span className="material-symbols-outlined text-[18px] text-error">{TYPE_ICONS[debt.type] ?? "radio_button_checked"}</span>
          </div>
          <span className="text-[11px] uppercase tracking-[1.5px] text-on-surface-variant">
            {TYPE_LABELS[debt.type] ?? debt.type}
          </span>
          {debt.interestAccrualMethod && debt.type === "loan" && (
            <span className="rounded-full bg-tertiary-fixed px-2.5 py-0.5 text-[10px] font-semibold text-tertiary">
              {ACCRUAL_METHOD_INFO[debt.interestAccrualMethod].label}
            </span>
          )}
        </div>
        <h1 className="mt-3 font-headline font-extrabold text-4xl text-on-surface">{debt.name}</h1>

        {/* Inline balance editor */}
        {editingBalance ? (
          <div className="mt-2">
            <input
              ref={balanceRef}
              type="text"
              value={balanceInput}
              onChange={(e) => setBalanceInput(e.target.value)}
              onBlur={saveBalance}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveBalance();
                if (e.key === "Escape") setEditingBalance(false);
              }}
              className="w-full max-w-md rounded-2xl bg-surface-container-high px-4 py-3 text-4xl font-bold tracking-tight text-error focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
            {(() => {
              const trimmed = balanceInput.trim();
              if (!trimmed || !isExpression(trimmed)) return null;
              const result = applyExpression(trimmed);
              if (result === null) return null;
              return (
                <div className="mt-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px] text-primary">arrow_forward</span>
                  <span className="text-[13px] font-semibold text-primary">{formatCurrency(result)}</span>
                </div>
              );
            })()}
          </div>
        ) : (
          <button
            onClick={openBalanceEditor}
            className="mt-2 text-5xl font-bold tracking-tight text-error hover:opacity-80 transition-opacity cursor-pointer"
            title="Click to update balance"
          >
            {formatCurrency(debt.balance)}
          </button>
        )}

        {debt.notes && (
          <p className="mt-3 text-[14px] text-on-surface-variant">{debt.notes}</p>
        )}
      </div>

      {/* ===== SIMPLE DEBT: minimal dashboard ===== */}
      {debt.type === "simple" && (
        <>
          {/* Activity timeline */}
          <div className="mt-8 rounded-2xl bg-surface-container-lowest p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[2px] text-primary">History</p>
                <h2 className="mt-1 text-xl font-bold text-on-surface">Activity</h2>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <input
                type="text"
                placeholder="Add a note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addNote(); }}
                className="flex-1 rounded-2xl bg-surface-container-high px-4 py-3 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={addNote}
                disabled={addingNote || !newNote.trim()}
                className="rounded-full bg-gradient-to-r from-primary to-primary-container px-5 py-3 text-[13px] font-semibold text-on-primary disabled:opacity-50"
              >
                Add
              </button>
            </div>

            {timeline.length === 0 ? (
              <p className="mt-6 text-center text-[13px] text-on-surface-variant">No activity yet. Update the balance or add a note.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {timeline.map((item) => (
                  <div key={`${item.type}-${"id" in item.data ? item.data.id : ""}`} className="flex gap-3 rounded-xl bg-surface-container-low p-4">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${item.type === "update" ? "bg-error-container" : "bg-primary-fixed"}`}>
                      <span className={`material-symbols-outlined text-[14px] ${item.type === "update" ? "text-error" : "text-primary"}`}>
                        {item.type === "update" ? "sync_alt" : "sticky_note_2"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      {item.type === "update" ? (
                        <>
                          <p className="text-[13px] text-on-surface">
                            <span className="font-semibold">{formatCurrency((item.data as DebtBalanceUpdate).previousBalance)}</span>
                            {" → "}
                            <span className="font-semibold">{formatCurrency((item.data as DebtBalanceUpdate).newBalance)}</span>
                            <span className={`ml-2 text-[12px] font-semibold ${(item.data as DebtBalanceUpdate).changeAmount < 0 ? "text-secondary" : "text-error"}`}>
                              {(item.data as DebtBalanceUpdate).changeAmount > 0 ? "+" : ""}{formatCurrencyPrecise((item.data as DebtBalanceUpdate).changeAmount)}
                            </span>
                          </p>
                          {(item.data as DebtBalanceUpdate).note && (
                            <p className="mt-1 text-[12px] text-on-surface-variant">{(item.data as DebtBalanceUpdate).note}</p>
                          )}
                        </>
                      ) : (
                        <p className="text-[13px] text-on-surface">{(item.data as DebtNote).content}</p>
                      )}
                      <p className="mt-1 text-[11px] text-on-surface-variant">{formatDate(item.date)}</p>
                    </div>
                    {item.type === "note" && (
                      <button
                        onClick={() => deleteNote((item.data as DebtNote).id)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-error-container hover:text-error"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== LOAN TYPES: full dashboard ===== */}
      {isLoanType(debt.type) && (
        <>
          {/* Key metrics */}
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {debt.interestRate != null && (
              <div className="rounded-xl bg-surface-container-lowest p-5">
                <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">Interest Rate</p>
                <p className="mt-2 text-xl font-bold text-tertiary">{debt.interestRate}%</p>
                <p className="mt-1 text-[12px] text-on-surface-variant">annual</p>
              </div>
            )}
            {debt.minimumPayment != null && (
              <div className="rounded-xl bg-surface-container-lowest p-5">
                <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">Monthly Payment</p>
                <p className="mt-2 text-xl font-bold text-on-surface">{formatCurrency(debt.minimumPayment)}</p>
                {mortgageBreakdown && mortgageBreakdown.escrow > 0 && (
                  <p className="mt-1 text-[12px] text-on-surface-variant">
                    + {formatCurrency(mortgageBreakdown.escrow)} escrow = {formatCurrency(mortgageBreakdown.totalMonthly)}
                  </p>
                )}
              </div>
            )}
            {baseAmort && (
              <div className="rounded-xl bg-surface-container-lowest p-5">
                <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">Total Interest</p>
                <p className="mt-2 text-xl font-bold text-tertiary">{formatCurrency(baseAmort.totalInterest)}</p>
                <p className="mt-1 text-[12px] text-on-surface-variant">remaining</p>
              </div>
            )}
            {baseAmort && (
              <div className="rounded-xl bg-surface-container-lowest p-5">
                <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">Payoff In</p>
                <p className="mt-2 text-xl font-bold text-on-surface">{formatMonths(baseAmort.payoffMonths)}</p>
                <p className="mt-1 text-[12px] text-on-surface-variant">{baseAmort.payoffMonths} payments left</p>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {debt.originalBalance != null && debt.originalBalance > 0 && (
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
          )}

          {/* Mortgage-specific: PITI breakdown + equity */}
          {debt.type === "mortgage" && mortgageBreakdown && (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-surface-container-lowest p-6">
                <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">Monthly Payment Breakdown (PITI)</p>
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between text-[14px]">
                    <span className="text-on-surface-variant">Principal & Interest</span>
                    <span className="font-bold text-on-surface">{formatCurrencyPrecise(mortgageBreakdown.principalAndInterest)}</span>
                  </div>
                  {mortgageBreakdown.propertyTax > 0 && (
                    <div className="flex justify-between text-[14px]">
                      <span className="text-on-surface-variant">Property Tax</span>
                      <span className="font-bold text-on-surface">{formatCurrencyPrecise(mortgageBreakdown.propertyTax)}/mo</span>
                    </div>
                  )}
                  {mortgageBreakdown.homeInsurance > 0 && (
                    <div className="flex justify-between text-[14px]">
                      <span className="text-on-surface-variant">Home Insurance</span>
                      <span className="font-bold text-on-surface">{formatCurrencyPrecise(mortgageBreakdown.homeInsurance)}/mo</span>
                    </div>
                  )}
                  {mortgageBreakdown.pmi > 0 && (
                    <div className="flex justify-between text-[14px]">
                      <span className="text-on-surface-variant">PMI</span>
                      <span className="font-bold text-on-surface">{formatCurrencyPrecise(mortgageBreakdown.pmi)}/mo</span>
                    </div>
                  )}
                  <div className="pt-3 flex justify-between text-[14px]">
                    <span className="font-medium text-on-surface">Total Monthly</span>
                    <span className="text-xl font-bold text-on-surface">{formatCurrencyPrecise(mortgageBreakdown.totalMonthly)}</span>
                  </div>
                </div>
              </div>

              {equity != null && (
                <div className="rounded-xl bg-surface-container-lowest p-6">
                  <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">Home Equity</p>
                  <p className="mt-2 text-3xl font-bold text-secondary">{formatCurrency(equity)}</p>
                  <p className="mt-2 text-[12px] text-on-surface-variant">
                    Home value: {formatCurrency(debt.homeValue!)} - Owed: {formatCurrency(debt.balance)}
                  </p>
                  {debt.homeValue != null && debt.homeValue > 0 && (
                    <>
                      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-surface-container-highest">
                        <div
                          className="h-full rounded-full bg-secondary transition-all"
                          style={{ width: `${Math.min(100, (equity / debt.homeValue) * 100)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[12px] text-on-surface-variant">
                        {((equity / debt.homeValue) * 100).toFixed(1)}% equity
                        {(equity / debt.homeValue) < 0.2 && (
                          <span className="ml-2 text-tertiary">(PMI likely required until 20%)</span>
                        )}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Auto-specific: vehicle value comparison */}
          {debt.type === "auto" && debt.vehicleValue != null && (
            <div className="mt-6 rounded-xl bg-surface-container-lowest p-6">
              <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">Vehicle vs Loan</p>
              <div className="mt-4 flex items-center gap-8">
                <div>
                  <p className="text-[12px] text-on-surface-variant">Vehicle Value</p>
                  <p className="text-2xl font-bold text-secondary">{formatCurrency(debt.vehicleValue)}</p>
                </div>
                <div>
                  <p className="text-[12px] text-on-surface-variant">Loan Balance</p>
                  <p className="text-2xl font-bold text-error">{formatCurrency(debt.balance)}</p>
                </div>
                <div>
                  <p className="text-[12px] text-on-surface-variant">
                    {isUpsideDown ? "Upside Down By" : "Positive Equity"}
                  </p>
                  <p className={`text-2xl font-bold ${isUpsideDown ? "text-error" : "text-secondary"}`}>
                    {formatCurrency(Math.abs(debt.vehicleValue - debt.balance))}
                  </p>
                </div>
              </div>
              {isUpsideDown && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-error-container p-3">
                  <span className="material-symbols-outlined text-[16px] text-error">warning</span>
                  <p className="text-[12px] text-on-error-container">
                    You owe more than the vehicle is worth. Consider prioritizing paying this down before trading in.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Amortization chart */}
          {baseAmort && (
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
          )}

          {/* What-If Scenario Panel */}
          {hasLoanData && (
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
                  <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Extra Monthly Payment</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-on-surface-variant">$</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="200"
                      value={extraMonthly}
                      onChange={(e) => setExtraMonthly(e.target.value)}
                      className="w-full rounded-2xl bg-surface-container-high pl-7 pr-4 py-3.5 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-on-surface-variant">Added to every monthly payment</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Extra Annual Payment</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-on-surface-variant">$</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="1000"
                      value={extraYearly}
                      onChange={(e) => setExtraYearly(e.target.value)}
                      className="w-full rounded-2xl bg-surface-container-high pl-7 pr-4 py-3.5 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-on-surface-variant">One extra payment each year</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Lump Sum Payment</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-on-surface-variant">$</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="5000"
                      value={lumpSum}
                      onChange={(e) => setLumpSum(e.target.value)}
                      className="w-full rounded-2xl bg-surface-container-high pl-7 pr-4 py-3.5 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-on-surface-variant">One-time additional payment</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Lump Sum in Month</label>
                  <input
                    type="number"
                    min="1"
                    max={baseAmort?.payoffMonths ?? 360}
                    step="1"
                    placeholder="1"
                    value={lumpSumMonth}
                    onChange={(e) => setLumpSumMonth(e.target.value)}
                    className="w-full rounded-2xl bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                  />
                  <p className="mt-1 text-[11px] text-on-surface-variant">When the lump sum is applied</p>
                </div>
              </div>

              {scenarioActive && scenarioAmort && baseAmort && (
                <div className="mt-6 grid grid-cols-1 gap-4 rounded-xl bg-secondary-fixed/30 p-6 sm:grid-cols-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">New Payoff Time</p>
                    <p className="mt-1 text-xl font-bold text-secondary">{formatMonths(scenarioAmort.payoffMonths)}</p>
                    {monthsSaved > 0 && <p className="mt-0.5 text-[12px] text-secondary">{formatMonths(monthsSaved)} sooner</p>}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">New Total Interest</p>
                    <p className="mt-1 text-xl font-bold text-secondary">{formatCurrency(scenarioAmort.totalInterest)}</p>
                    {interestSaved > 0 && <p className="mt-0.5 text-[12px] text-secondary">{formatCurrency(interestSaved)} saved</p>}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">New Total Cost</p>
                    <p className="mt-1 text-xl font-bold text-on-surface">{formatCurrency(scenarioAmort.totalPaid)}</p>
                    <p className="mt-0.5 text-[12px] text-on-surface-variant">was {formatCurrency(baseAmort.totalPaid)}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Saved Scenarios */}
          {savedScenarios.length > 0 && (
            <div className="mt-8 rounded-2xl bg-surface-container-lowest p-8">
              <p className="text-[11px] uppercase tracking-[2px] text-primary">Saved</p>
              <h2 className="mt-1 text-xl font-bold text-on-surface">Saved Scenarios</h2>
              <div className="mt-4 space-y-3">
                {savedScenarios.map((scenario) => (
                  <div key={scenario.id} className="flex items-center justify-between rounded-xl bg-surface-container-low p-4">
                    <div>
                      <p className="text-[15px] font-semibold text-on-surface">{scenario.name}</p>
                      <div className="mt-1 flex flex-wrap gap-3 text-[12px] text-on-surface-variant">
                        {scenario.extraMonthlyPayment > 0 && <span>+{formatCurrencyPrecise(scenario.extraMonthlyPayment)}/mo</span>}
                        {scenario.extraYearlyPayment > 0 && <span>+{formatCurrencyPrecise(scenario.extraYearlyPayment)}/yr</span>}
                        {scenario.lumpSumPayment > 0 && <span>+{formatCurrencyPrecise(scenario.lumpSumPayment)} lump (month {scenario.lumpSumMonth})</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadScenario(scenario)}
                        className="rounded-xl px-3 py-2 text-[12px] font-medium text-primary hover:bg-primary-fixed/30"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => handleDeleteScenario(scenario.id)}
                        className="rounded-xl px-3 py-2 text-[12px] font-medium text-on-surface-variant hover:bg-error-container hover:text-error"
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
            {baseAmort && (
              <div className="rounded-xl bg-surface-container-lowest p-6">
                <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">Loan Summary</p>
                <div className="mt-4 space-y-3">
                  {debt.originalBalance != null && (
                    <>
                      <div className="flex justify-between text-[14px]">
                        <span className="text-on-surface-variant">Original Balance</span>
                        <span className="font-bold text-on-surface">{formatCurrency(debt.originalBalance)}</span>
                      </div>
                      <div className="flex justify-between text-[14px]">
                        <span className="text-on-surface-variant">Principal Paid</span>
                        <span className="font-bold text-secondary">{formatCurrency(debt.originalBalance - debt.balance)}</span>
                      </div>
                    </>
                  )}
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
                  {debt.loanStartDate && (
                    <div className="flex justify-between text-[14px]">
                      <span className="text-on-surface-variant">Loan Start Date</span>
                      <span className="font-bold text-on-surface">{formatDate(debt.loanStartDate)}</span>
                    </div>
                  )}
                  {debt.loanTermMonths != null && (
                    <div className="flex justify-between text-[14px]">
                      <span className="text-on-surface-variant">Original Term</span>
                      <span className="font-bold text-on-surface">{formatMonths(debt.loanTermMonths)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-xl bg-surface-container-lowest p-6">
              <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">Payment Breakdown</p>
              <div className="mt-4 space-y-3">
                {debt.minimumPayment != null && (
                  <div className="flex justify-between text-[14px]">
                    <span className="text-on-surface-variant">Principal & Interest</span>
                    <span className="font-bold text-on-surface">{formatCurrencyPrecise(debt.minimumPayment)}/mo</span>
                  </div>
                )}
                {debt.escrowAmount != null && debt.escrowAmount > 0 && (
                  <div className="flex justify-between text-[14px]">
                    <span className="text-on-surface-variant">Escrow (Tax & Ins.)</span>
                    <span className="font-bold text-on-surface">{formatCurrencyPrecise(debt.escrowAmount)}/mo</span>
                  </div>
                )}
                {mortgageBreakdown && mortgageBreakdown.totalMonthly !== mortgageBreakdown.principalAndInterest && (
                  <div className="pt-3 flex justify-between text-[14px]">
                    <span className="font-medium text-on-surface">Total Monthly</span>
                    <span className="font-bold text-on-surface">{formatCurrencyPrecise(mortgageBreakdown.totalMonthly)}/mo</span>
                  </div>
                )}
                {debt.remainingMonths != null && (
                  <div className="flex justify-between text-[14px]">
                    <span className="text-on-surface-variant">Remaining Term</span>
                    <span className="font-bold text-on-surface">{formatMonths(debt.remainingMonths)}</span>
                  </div>
                )}
                {debt.interestAccrualMethod && (
                  <div className="flex justify-between text-[14px]">
                    <span className="text-on-surface-variant">Interest Method</span>
                    <span className="font-bold text-on-surface">{ACCRUAL_METHOD_INFO[debt.interestAccrualMethod].label}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Activity timeline */}
          <div className="mt-8 rounded-2xl bg-surface-container-lowest p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[2px] text-primary">History</p>
                <h2 className="mt-1 text-xl font-bold text-on-surface">Activity</h2>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <input
                type="text"
                placeholder="Add a note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addNote(); }}
                className="flex-1 rounded-2xl bg-surface-container-high px-4 py-3 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={addNote}
                disabled={addingNote || !newNote.trim()}
                className="rounded-full bg-gradient-to-r from-primary to-primary-container px-5 py-3 text-[13px] font-semibold text-on-primary disabled:opacity-50"
              >
                Add
              </button>
            </div>

            {timeline.length === 0 ? (
              <p className="mt-6 text-center text-[13px] text-on-surface-variant">No activity yet. Update the balance or add a note.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {timeline.map((item) => (
                  <div key={`${item.type}-${"id" in item.data ? item.data.id : ""}`} className="flex gap-3 rounded-xl bg-surface-container-low p-4">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${item.type === "update" ? "bg-error-container" : "bg-primary-fixed"}`}>
                      <span className={`material-symbols-outlined text-[14px] ${item.type === "update" ? "text-error" : "text-primary"}`}>
                        {item.type === "update" ? "sync_alt" : "sticky_note_2"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      {item.type === "update" ? (
                        <>
                          <p className="text-[13px] text-on-surface">
                            <span className="font-semibold">{formatCurrency((item.data as DebtBalanceUpdate).previousBalance)}</span>
                            {" → "}
                            <span className="font-semibold">{formatCurrency((item.data as DebtBalanceUpdate).newBalance)}</span>
                            <span className={`ml-2 text-[12px] font-semibold ${(item.data as DebtBalanceUpdate).changeAmount < 0 ? "text-secondary" : "text-error"}`}>
                              {(item.data as DebtBalanceUpdate).changeAmount > 0 ? "+" : ""}{formatCurrencyPrecise((item.data as DebtBalanceUpdate).changeAmount)}
                            </span>
                          </p>
                          {(item.data as DebtBalanceUpdate).note && (
                            <p className="mt-1 text-[12px] text-on-surface-variant">{(item.data as DebtBalanceUpdate).note}</p>
                          )}
                        </>
                      ) : (
                        <p className="text-[13px] text-on-surface">{(item.data as DebtNote).content}</p>
                      )}
                      <p className="mt-1 text-[11px] text-on-surface-variant">{formatDate(item.date)}</p>
                    </div>
                    {item.type === "note" && (
                      <button
                        onClick={() => deleteNote((item.data as DebtNote).id)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-error-container hover:text-error"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
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
              className="mt-4 w-full rounded-2xl bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
              autoFocus
            />
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setSaveModalOpen(false)}
                className="flex-1 rounded-full bg-surface-container-low py-3 text-[14px] font-semibold text-on-surface-variant hover:bg-surface-container"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveScenario}
                disabled={savingScenario || !scenarioName.trim()}
                className="flex-1 rounded-full bg-gradient-to-r from-primary to-primary-container py-3 text-[14px] font-semibold text-on-primary disabled:opacity-50"
              >
                {savingScenario ? "Saving..." : "Save"}
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
          <div className="w-full max-w-2xl rounded-t-2xl bg-surface-container-lowest p-8 shadow-xl sm:rounded-2xl sm:max-h-[90vh] sm:overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-headline font-extrabold text-2xl text-on-surface">Edit Liability</h2>
              <button
                onClick={() => setEditOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Name</label>
                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-2xl bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary" />
              </div>

              {isLoanType(form.type) && (
                <>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Original Balance</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-on-surface-variant">$</span>
                        <input type="number" min="0" step="0.01" value={form.originalBalance} onChange={(e) => setForm({ ...form, originalBalance: e.target.value })}
                          className="w-full rounded-2xl bg-surface-container-high pl-7 pr-4 py-3.5 text-[14px] text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Interest Rate (%)</label>
                      <div className="relative">
                        <input type="number" min="0" max="100" step="0.01" value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                          className="w-full rounded-2xl bg-surface-container-high px-4 py-3.5 pr-8 text-[14px] text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-on-surface-variant">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Monthly Payment (P&I)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-on-surface-variant">$</span>
                        <input type="number" min="0" step="0.01" value={form.minimumPayment} onChange={(e) => setForm({ ...form, minimumPayment: e.target.value })}
                          className="w-full rounded-2xl bg-surface-container-high pl-7 pr-4 py-3.5 text-[14px] text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Remaining Months</label>
                      <input type="number" min="1" max="600" step="1" value={form.remainingMonths} onChange={(e) => setForm({ ...form, remainingMonths: e.target.value })}
                        className="w-full rounded-2xl bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary" />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Loan Start Date</label>
                      <input type="date" value={form.loanStartDate} onChange={(e) => setForm({ ...form, loanStartDate: e.target.value })}
                        className="w-full rounded-2xl bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary" />
                    </div>
                    <div className="flex-1">
                      <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Original Term (months)</label>
                      <input type="number" min="1" max="600" step="1" value={form.loanTermMonths} onChange={(e) => setForm({ ...form, loanTermMonths: e.target.value })}
                        className="w-full rounded-2xl bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary" />
                    </div>
                  </div>
                </>
              )}

              {form.type === "mortgage" && (
                <div className="rounded-xl bg-surface-container-low p-4 space-y-4">
                  <p className="text-[11px] uppercase tracking-[1.5px] text-primary">Mortgage Details</p>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Home Value</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-on-surface-variant">$</span>
                        <input type="number" min="0" step="0.01" value={form.homeValue} onChange={(e) => setForm({ ...form, homeValue: e.target.value })}
                          className="w-full rounded-2xl bg-surface-container-high pl-7 pr-4 py-3.5 text-[14px] text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Escrow (/mo)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-on-surface-variant">$</span>
                        <input type="number" min="0" step="0.01" value={form.escrowAmount} onChange={(e) => setForm({ ...form, escrowAmount: e.target.value })}
                          className="w-full rounded-2xl bg-surface-container-high pl-7 pr-4 py-3.5 text-[14px] text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Property Tax (/year)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-on-surface-variant">$</span>
                        <input type="number" min="0" step="0.01" value={form.propertyTaxYearly} onChange={(e) => setForm({ ...form, propertyTaxYearly: e.target.value })}
                          className="w-full rounded-2xl bg-surface-container-high pl-7 pr-4 py-3.5 text-[14px] text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Home Insurance (/year)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-on-surface-variant">$</span>
                        <input type="number" min="0" step="0.01" value={form.homeInsuranceYearly} onChange={(e) => setForm({ ...form, homeInsuranceYearly: e.target.value })}
                          className="w-full rounded-2xl bg-surface-container-high pl-7 pr-4 py-3.5 text-[14px] text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-on-surface">PMI (/month)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-on-surface-variant">$</span>
                      <input type="number" min="0" step="0.01" value={form.pmiMonthly} onChange={(e) => setForm({ ...form, pmiMonthly: e.target.value })}
                        className="w-full rounded-2xl bg-surface-container-high pl-7 pr-4 py-3.5 text-[14px] text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary" />
                    </div>
                  </div>
                </div>
              )}

              {form.type === "auto" && (
                <div className="rounded-xl bg-surface-container-low p-4 space-y-4">
                  <p className="text-[11px] uppercase tracking-[1.5px] text-primary">Vehicle Details</p>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Vehicle Value</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-on-surface-variant">$</span>
                      <input type="number" min="0" step="0.01" value={form.vehicleValue} onChange={(e) => setForm({ ...form, vehicleValue: e.target.value })}
                        className="w-full rounded-2xl bg-surface-container-high pl-7 pr-4 py-3.5 text-[14px] text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary" />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Notes</label>
                <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-2xl bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditOpen(false)}
                  className="flex-1 rounded-full bg-surface-container-low py-3 text-[14px] font-semibold text-on-surface-variant hover:bg-surface-container">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 rounded-full bg-gradient-to-r from-primary to-primary-container py-3 text-[14px] font-semibold text-on-primary disabled:opacity-50">
                  {saving ? "Saving..." : "Save Changes"}
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
              This will permanently remove this liability and all its history. This cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setDeleteConfirm(false)}
                className="flex-1 rounded-full bg-surface-container-low py-3 text-[14px] font-semibold text-on-surface-variant hover:bg-surface-container">
                Cancel
              </button>
              <button onClick={handleDelete}
                className="flex-1 rounded-full bg-error py-3 text-[14px] font-semibold text-white">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
