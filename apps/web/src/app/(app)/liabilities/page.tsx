"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import type { Debt, DebtType, InterestAccrualMethod } from "@/types";
import { ACCRUAL_METHOD_INFO, getDefaultAccrualMethod, estimatePayoffMonths } from "@/lib/loan-calculations";

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
  simple: "fa-receipt",
  mortgage: "fa-house",
  auto: "fa-car",
  loan: "fa-building-columns",
  student_loan: "fa-graduation-cap",
  credit_card: "fa-credit-card",
  other: "fa-circle-dot",
};

const TYPE_DESCRIPTIONS: Record<string, string> = {
  simple: "A simple debt with no interest. Money owed to a friend, medical bill, or any balance you are paying off.",
  mortgage: "A home loan with daily interest accrual, escrow for taxes and insurance, and equity tracking.",
  auto: "A car loan, typically with pre-computed (simple) interest calculated upfront by the dealer.",
  loan: "A general loan (personal, student, etc.) where you choose how interest accrues.",
};

const CREATABLE_TYPES: DebtType[] = ["simple", "mortgage", "auto", "loan"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function formatMonths(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m}mo`;
  if (m === 0) return `${y}yr`;
  return `${y}yr ${m}mo`;
}

function formatDate(dateStr: string | Date) {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
  interestAccrualMethod: InterestAccrualMethod;
  homeValue: string;
  pmiMonthly: string;
  propertyTaxYearly: string;
  homeInsuranceYearly: string;
  loanStartDate: string;
  loanTermMonths: string;
  vehicleValue: string;
}

function emptyForm(type: DebtType = "simple"): FormState {
  return {
    name: "",
    type,
    balance: "",
    originalBalance: "",
    interestRate: "",
    minimumPayment: "",
    escrowAmount: "",
    remainingMonths: "",
    notes: "",
    interestAccrualMethod: getDefaultAccrualMethod(type),
    homeValue: "",
    pmiMonthly: "",
    propertyTaxYearly: "",
    homeInsuranceYearly: "",
    loanStartDate: "",
    loanTermMonths: "",
    vehicleValue: "",
  };
}

function debtToForm(debt: Debt): FormState {
  return {
    name: debt.name,
    type: debt.type,
    balance: String(debt.balance),
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
  };
}

const isLoanType = (t: DebtType) => t !== "simple";

export default function LiabilitiesPage() {
  const router = useRouter();
  const [debtList, setDebtList] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState<string | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [step, setStep] = useState<"type" | "details">("type");

  async function fetchDebts() {
    setLoading(true);
    try {
      const data = await apiClient.get<Debt[]>("/api/liabilities?includeArchived=true");
      setDebtList(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchDebts(); }, []);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm());
    setStep("type");
    setModalOpen(true);
  }

  function openEdit(debt: Debt, e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(debt);
    setForm(debtToForm(debt));
    setStep("details");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm());
    setStep("type");
  }

  function selectType(type: DebtType) {
    setForm({ ...emptyForm(type), name: form.name });
    setStep("details");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        type: form.type,
        balance: form.balance,
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

      if (editing) {
        await apiClient.put(`/api/liabilities/${editing.id}`, payload);
      } else {
        await apiClient.post("/api/liabilities", payload);
      }
      await fetchDebts();
      closeModal();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await apiClient.delete(`/api/liabilities/${id}`);
    setDeleteConfirm(null);
    await fetchDebts();
  }

  async function handleArchive(id: string) {
    await apiClient.put(`/api/liabilities/${id}`, { archivedAt: new Date().toISOString() });
    setArchiveConfirm(null);
    await fetchDebts();
  }

  async function handleUnarchive(id: string) {
    await apiClient.put(`/api/liabilities/${id}`, { archivedAt: null });
    await fetchDebts();
  }

  const activeDebts = debtList.filter((d) => !d.archivedAt);
  const archivedDebts = debtList.filter((d) => !!d.archivedAt);
  const totalBalance = activeDebts.reduce((sum, d) => sum + d.balance, 0);

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[2px] text-accent">Finances</p>
          <h1 className="mt-1 font-headline font-extrabold text-4xl text-text-primary">Liabilities</h1>
          {debtList.length > 0 && (
            <p className="mt-2 text-[14px] text-text-secondary">
              Total owed:{" "}
              <span className="font-bold text-error">
                {formatCurrency(totalBalance)}
              </span>
            </p>
          )}
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent-hover px-5 py-3 text-[14px] font-semibold text-white transition-transform active:scale-95"
        >
          <i className="fa-solid fa-plus text-[16px]" />
          Add Liability
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="mt-16 text-center text-[14px] text-text-secondary">Loading...</div>
      ) : activeDebts.length === 0 && archivedDebts.length === 0 ? (
        <div className="mt-16 flex flex-col items-center rounded-xl bg-surface-alt px-12 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-error-light">
            <i className="fa-solid fa-credit-card text-[22px] text-error" />
          </div>
          <h2 className="mt-5 font-headline font-extrabold text-2xl text-text-primary">No liabilities yet</h2>
          <p className="mt-2 max-w-sm text-[14px] text-text-secondary">
            Add your mortgage, car loan, or other debts to track payoff timelines and see how extra payments can save you money.
          </p>
          <button
            onClick={openAdd}
            className="mt-6 rounded-full bg-gradient-to-r from-accent to-accent-hover px-6 py-3 text-[14px] font-semibold text-white transition-transform active:scale-95"
          >
            Add Your First Liability
          </button>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {activeDebts.length > 0 && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {activeDebts.map((debt) => {
                const payoffMonths = debt.remainingMonths
                  ?? (debt.interestRate != null && debt.minimumPayment != null
                    ? estimatePayoffMonths(debt.balance, debt.interestRate, debt.minimumPayment)
                    : null);
                const paidDown = debt.originalBalance != null && debt.originalBalance > 0
                  ? ((debt.originalBalance - debt.balance) / debt.originalBalance) * 100
                  : 0;

                return (
                  <div
                    key={debt.id}
                    onClick={() => router.push(`/liabilities/${debt.id}`)}
                    className="group relative cursor-pointer rounded-xl bg-surface p-8 transition-transform hover:-translate-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-error-light">
                          <i className={`fa-solid ${TYPE_ICONS[debt.type] ?? "fa-circle-dot"} text-[16px] text-error`} />
                        </div>
                        <span className="text-[11px] uppercase tracking-[1px] text-text-secondary">
                          {TYPE_LABELS[debt.type] ?? debt.type}
                        </span>
                      </div>
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={(e) => openEdit(debt, e)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-alt hover:text-accent"
                        >
                          <i className="fa-solid fa-pen text-[14px]" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setArchiveConfirm(debt.id); }}
                          className="flex h-8 w-8 items-center justify-center rounded-xl text-text-secondary hover:bg-warning-light hover:text-warning"
                          title="Archive"
                        >
                          <i className="fa-solid fa-box-archive text-[14px]" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(debt.id); }}
                          className="flex h-8 w-8 items-center justify-center rounded-xl text-text-secondary hover:bg-error-light hover:text-error"
                        >
                          <i className="fa-solid fa-trash text-[14px]" />
                        </button>
                      </div>
                    </div>

                    <p className="mt-4 text-[17px] font-semibold text-text-primary">{debt.name}</p>
                    <p className="mt-1 text-3xl font-bold tracking-tight text-error">
                      {formatCurrency(debt.balance)}
                    </p>

                    {debt.balance === 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setArchiveConfirm(debt.id); }}
                        className="mt-3 flex items-center gap-1.5 rounded-full bg-warning-light/50 px-3 py-1.5 text-[11px] font-semibold text-warning transition-colors hover:bg-warning-light"
                      >
                        <i className="fa-solid fa-box-archive text-[14px]" />
                        Balance is zero. Archive this?
                      </button>
                    )}

                    {debt.type !== "simple" && (
                      <div className="mt-4 pt-4">
                        {debt.originalBalance != null && debt.originalBalance > 0 && (
                          <>
                            <div className="flex items-center justify-between text-[12px]">
                              <span className="text-text-secondary">Paid off</span>
                              <span className="font-semibold text-success">{paidDown.toFixed(1)}%</span>
                            </div>
                            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-altest">
                              <div
                                className="h-full rounded-full bg-secondary transition-all"
                                style={{ width: `${Math.min(100, paidDown)}%` }}
                              />
                            </div>
                          </>
                        )}
                        <div className="mt-3 flex items-center justify-between">
                          {debt.interestRate != null && (
                            <div>
                              <p className="text-[10px] uppercase tracking-[1px] text-text-secondary">Rate</p>
                              <span className="rounded-full bg-warning-light px-2.5 py-1 text-[11px] font-semibold text-warning">
                                {debt.interestRate}%
                              </span>
                            </div>
                          )}
                          {debt.minimumPayment != null && (
                            <div className="text-right">
                              <p className="text-[10px] uppercase tracking-[1px] text-text-secondary">Payment</p>
                              <p className="text-[14px] font-bold text-text-primary">
                                {formatCurrency(debt.minimumPayment)}/mo
                              </p>
                            </div>
                          )}
                          {payoffMonths != null && (
                            <div className="text-right">
                              <p className="text-[10px] uppercase tracking-[1px] text-text-secondary">Payoff</p>
                              <p className="text-[13px] font-semibold text-text-primary">
                                {formatMonths(payoffMonths)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {debt.notes && (
                      <p className="mt-3 text-[12px] text-text-secondary line-clamp-2">{debt.notes}</p>
                    )}

                    <div className="mt-3 flex items-center gap-1 text-[12px] text-text-secondary">
                      <i className="fa-solid fa-arrow-right text-[14px]" />
                      <span>View details</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeDebts.length === 0 && archivedDebts.length > 0 && (
            <div className="flex flex-col items-center rounded-xl bg-surface-alt px-12 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-error-light">
                <i className="fa-solid fa-credit-card text-[22px] text-error" />
              </div>
              <h2 className="mt-5 font-headline font-extrabold text-2xl text-text-primary">All liabilities archived</h2>
              <p className="mt-2 max-w-sm text-[14px] text-text-secondary">
                All your liabilities are currently archived. Add a new one or restore an archived liability below.
              </p>
              <button
                onClick={openAdd}
                className="mt-6 rounded-full bg-gradient-to-r from-accent to-accent-hover px-6 py-3 text-[14px] font-semibold text-white transition-transform active:scale-95"
              >
                Add Liability
              </button>
            </div>
          )}

          {archivedDebts.length > 0 && (
            <div>
              <button
                onClick={() => setArchivedOpen(!archivedOpen)}
                className="flex items-center gap-2 text-[13px] font-semibold text-text-secondary hover:text-accent"
              >
                <span className="fa-solid text-[18px]" style={{ transform: archivedOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                  chevron_right
                </span>
                Archived ({archivedDebts.length})
              </button>

              {archivedOpen && (
                <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {archivedDebts.map((debt) => (
                    <div
                      key={debt.id}
                      onClick={() => router.push(`/liabilities/${debt.id}`)}
                      className="group relative cursor-pointer rounded-xl bg-surface-alt p-8 opacity-60 transition-all hover:opacity-100"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-alt">
                            <i className={`fa-solid ${TYPE_ICONS[debt.type] ?? "fa-circle-dot"} text-[16px] text-text-secondary`} />
                          </div>
                          <span className="text-[11px] uppercase tracking-[1px] text-text-secondary">
                            {TYPE_LABELS[debt.type] ?? debt.type}
                          </span>
                        </div>
                        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUnarchive(debt.id); }}
                            className="flex h-8 w-8 items-center justify-center rounded-xl text-text-secondary hover:bg-accent-light hover:text-accent"
                            title="Restore"
                          >
                            <i className="fa-solid fa-box-open text-[14px]" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(debt.id); }}
                            className="flex h-8 w-8 items-center justify-center rounded-xl text-text-secondary hover:bg-error-light hover:text-error"
                          >
                            <i className="fa-solid fa-trash text-[14px]" />
                          </button>
                        </div>
                      </div>

                      <p className="mt-4 text-[17px] font-semibold text-text-primary">{debt.name}</p>
                      <p className="mt-1 text-3xl font-bold tracking-tight text-text-secondary">
                        {formatCurrency(debt.balance)}
                      </p>

                      <div className="mt-3 flex items-center gap-1.5">
                        <i className="fa-solid fa-box-archive text-[14px] text-text-secondary" />
                        <span className="text-[11px] text-text-secondary">
                          Archived {debt.archivedAt ? formatDate(debt.archivedAt) : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-text-primary/20 sm:items-center"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="w-full max-w-2xl rounded-t-2xl bg-surface p-8 shadow-xl sm:rounded-xl sm:max-h-[90vh] sm:overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-headline font-extrabold text-2xl text-text-primary">
                {editing ? "Edit Liability" : step === "type" ? "What kind of liability?" : `New ${TYPE_LABELS[form.type]}`}
              </h2>
              <button
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-alt hover:text-accent"
              >
                <i className="fa-solid fa-xmark text-[18px]" />
              </button>
            </div>

            {/* Step 1: Type Selection */}
            {step === "type" && !editing && (
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {CREATABLE_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => selectType(t)}
                    className="flex items-start gap-4 rounded-xl bg-surface-alt p-5 text-left transition-colors hover:bg-accent-light"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-error-light">
                      <i className={`fa-solid ${TYPE_ICONS[t]} text-[18px] text-error`} />
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-text-primary">{TYPE_LABELS[t]}</p>
                      <p className="mt-1 text-[12px] text-text-secondary">{TYPE_DESCRIPTIONS[t]}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Step 2: Details Form */}
            {step === "details" && (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {!editing && (
                  <button
                    type="button"
                    onClick={() => setStep("type")}
                    className="mb-2 flex items-center gap-1 text-[13px] text-text-secondary hover:text-accent"
                  >
                    <i className="fa-solid fa-arrow-left text-[16px]" />
                    Change type
                  </button>
                )}

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-text-primary">Name</label>
                  <input
                    type="text"
                    required
                    placeholder={
                      form.type === "mortgage" ? "e.g. Home Mortgage" :
                      form.type === "auto" ? "e.g. Toyota Camry Loan" :
                      form.type === "simple" ? "e.g. Money owed to Alex" :
                      "e.g. Personal Loan"
                    }
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-xl bg-surface-alt px-4 py-3.5 text-[14px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:bg-surface focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                    {form.type === "simple" ? "How much is owed?" : "Current Balance"}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-text-secondary">$</span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      placeholder={form.type === "simple" ? "500.00" : "250000.00"}
                      value={form.balance}
                      onChange={(e) => setForm({ ...form, balance: e.target.value })}
                      className="w-full rounded-xl bg-surface-alt pl-7 pr-4 py-3.5 text-[15px] font-bold text-text-primary placeholder:font-normal placeholder:text-text-secondary focus:outline-none focus:bg-surface focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  {form.type === "simple" && (
                    <p className="mt-1 text-[11px] text-text-secondary">No interest will be calculated on simple debts.</p>
                  )}
                </div>

                {isLoanType(form.type) && (
                  <>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                          Original Loan Amount <span className="font-normal text-text-secondary">(optional)</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-text-secondary">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="300000.00"
                            value={form.originalBalance}
                            onChange={(e) => setForm({ ...form, originalBalance: e.target.value })}
                            className="w-full rounded-xl bg-surface-alt pl-7 pr-4 py-3.5 text-[14px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:bg-surface focus:ring-1 focus:ring-accent"
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                          Interest Rate <span className="font-normal text-text-secondary">(%)</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            placeholder="6.50"
                            value={form.interestRate}
                            onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                            className="w-full rounded-xl bg-surface-alt px-4 py-3.5 pr-8 text-[14px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:bg-surface focus:ring-1 focus:ring-accent"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-text-secondary">%</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="mb-1.5 block text-[13px] font-medium text-text-primary">Monthly Payment (P&I)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-text-secondary">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="1580.00"
                            value={form.minimumPayment}
                            onChange={(e) => setForm({ ...form, minimumPayment: e.target.value })}
                            className="w-full rounded-xl bg-surface-alt pl-7 pr-4 py-3.5 text-[14px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:bg-surface focus:ring-1 focus:ring-accent"
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-text-secondary">Principal and interest only, before escrow or extras.</p>
                      </div>
                      <div className="flex-1">
                        <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                          Remaining Months <span className="font-normal text-text-secondary">(optional)</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="600"
                          step="1"
                          placeholder="348"
                          value={form.remainingMonths}
                          onChange={(e) => setForm({ ...form, remainingMonths: e.target.value })}
                          className="w-full rounded-xl bg-surface-alt px-4 py-3.5 text-[14px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:bg-surface focus:ring-1 focus:ring-accent"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                          Loan Start Date <span className="font-normal text-text-secondary">(optional)</span>
                        </label>
                        <input
                          type="date"
                          value={form.loanStartDate}
                          onChange={(e) => setForm({ ...form, loanStartDate: e.target.value })}
                          className="w-full rounded-xl bg-surface-alt px-4 py-3.5 text-[14px] text-text-primary focus:outline-none focus:bg-surface focus:ring-1 focus:ring-accent"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                          Original Term <span className="font-normal text-text-secondary">(months, optional)</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="600"
                          step="1"
                          placeholder={form.type === "mortgage" ? "360" : form.type === "auto" ? "60" : "120"}
                          value={form.loanTermMonths}
                          onChange={(e) => setForm({ ...form, loanTermMonths: e.target.value })}
                          className="w-full rounded-xl bg-surface-alt px-4 py-3.5 text-[14px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:bg-surface focus:ring-1 focus:ring-accent"
                        />
                      </div>
                    </div>

                    {form.type === "loan" && (
                      <div className="rounded-xl bg-surface-alt p-4 space-y-3">
                        <p className="text-[11px] uppercase tracking-[1.5px] text-accent">Interest Accrual Method</p>
                        <p className="text-[12px] text-text-secondary">How does your lender calculate interest? If unsure, monthly is the most common.</p>
                        <div className="space-y-2">
                          {(["monthly", "daily", "precomputed"] as InterestAccrualMethod[]).map((method) => (
                            <button
                              key={method}
                              type="button"
                              onClick={() => setForm({ ...form, interestAccrualMethod: method })}
                              className={`w-full rounded-xl p-3 text-left transition-colors ${
                                form.interestAccrualMethod === method
                                  ? "bg-accent-light"
                                  : "bg-surface-alt hover:bg-surface-alt"
                              }`}
                            >
                              <p className="text-[13px] font-semibold text-text-primary">{ACCRUAL_METHOD_INFO[method].label}</p>
                              <p className="mt-0.5 text-[11px] text-text-secondary">{ACCRUAL_METHOD_INFO[method].description}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {form.type === "mortgage" && (
                  <div className="rounded-xl bg-surface-alt p-4 space-y-4">
                    <p className="text-[11px] uppercase tracking-[1.5px] text-accent">Mortgage Details</p>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                          Home Purchase Price <span className="font-normal text-text-secondary">(optional)</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-text-secondary">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="350000.00"
                            value={form.homeValue}
                            onChange={(e) => setForm({ ...form, homeValue: e.target.value })}
                            className="w-full rounded-xl bg-surface-alt pl-7 pr-4 py-3.5 text-[14px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:bg-surface focus:ring-1 focus:ring-accent"
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-text-secondary">Used to track your equity in the home.</p>
                      </div>
                      <div className="flex-1">
                        <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                          Escrow (Total) <span className="font-normal text-text-secondary">(optional, /mo)</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-text-secondary">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="450.00"
                            value={form.escrowAmount}
                            onChange={(e) => setForm({ ...form, escrowAmount: e.target.value })}
                            className="w-full rounded-xl bg-surface-alt pl-7 pr-4 py-3.5 text-[14px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:bg-surface focus:ring-1 focus:ring-accent"
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-text-secondary">Or break it down below.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                          Property Tax <span className="font-normal text-text-secondary">(/year, optional)</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-text-secondary">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="3600.00"
                            value={form.propertyTaxYearly}
                            onChange={(e) => setForm({ ...form, propertyTaxYearly: e.target.value })}
                            className="w-full rounded-xl bg-surface-alt pl-7 pr-4 py-3.5 text-[14px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:bg-surface focus:ring-1 focus:ring-accent"
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                          Home Insurance <span className="font-normal text-text-secondary">(/year, optional)</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-text-secondary">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="1800.00"
                            value={form.homeInsuranceYearly}
                            onChange={(e) => setForm({ ...form, homeInsuranceYearly: e.target.value })}
                            className="w-full rounded-xl bg-surface-alt pl-7 pr-4 py-3.5 text-[14px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:bg-surface focus:ring-1 focus:ring-accent"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                        PMI (Private Mortgage Insurance) <span className="font-normal text-text-secondary">(/month, optional)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-text-secondary">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="125.00"
                          value={form.pmiMonthly}
                          onChange={(e) => setForm({ ...form, pmiMonthly: e.target.value })}
                          className="w-full rounded-xl bg-surface-alt pl-7 pr-4 py-3.5 text-[14px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:bg-surface focus:ring-1 focus:ring-accent"
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-text-secondary">
                        PMI is usually required when your down payment is less than 20%. It can be removed once you reach 20% equity.
                      </p>
                    </div>
                  </div>
                )}

                {form.type === "auto" && (
                  <div className="rounded-xl bg-surface-alt p-4 space-y-4">
                    <p className="text-[11px] uppercase tracking-[1.5px] text-accent">Vehicle Details</p>
                    <div>
                      <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                        Current Vehicle Value <span className="font-normal text-text-secondary">(optional)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-text-secondary">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="22000.00"
                          value={form.vehicleValue}
                          onChange={(e) => setForm({ ...form, vehicleValue: e.target.value })}
                          className="w-full rounded-xl bg-surface-alt pl-7 pr-4 py-3.5 text-[14px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:bg-surface focus:ring-1 focus:ring-accent"
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-text-secondary">
                        Estimated value from KBB or similar. Used to determine if you are upside down on the loan.
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                    Notes <span className="font-normal text-text-secondary">(optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Any notes about this liability..."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full rounded-xl bg-surface-alt px-4 py-3.5 text-[14px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:bg-surface focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 rounded-full bg-surface-alt py-3 text-[14px] font-semibold text-text-secondary hover:bg-surface-alt"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-full bg-gradient-to-r from-accent to-accent-hover py-3 text-[14px] font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? "Saving..." : editing ? "Save Changes" : `Add ${TYPE_LABELS[form.type]}`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Archive confirmation */}
      {archiveConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/20"
          onClick={(e) => { if (e.target === e.currentTarget) setArchiveConfirm(null); }}
        >
          <div className="w-full max-w-sm rounded-xl bg-surface/80 backdrop-blur-[20px] p-8 shadow-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning-light">
              <i className="fa-solid fa-box-archive text-[22px] text-warning" />
            </div>
            <h2 className="mt-4 font-headline font-extrabold text-2xl text-text-primary">Archive this liability?</h2>
            <div className="mt-3 space-y-2 text-[13px] text-text-secondary">
              <p>Archiving will:</p>
              <ul className="ml-4 list-disc space-y-1">
                <li>Remove it from your dashboard and projections</li>
                <li>Pause any recurring payment tracking</li>
                <li>Keep all history, notes, and data intact</li>
              </ul>
              <p>You can restore it at any time from the Archived section.</p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setArchiveConfirm(null)}
                className="flex-1 rounded-full bg-surface-alt py-3 text-[14px] font-semibold text-text-secondary transition-transform active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={() => handleArchive(archiveConfirm)}
                className="flex-1 rounded-full bg-gradient-to-r from-warning to-warning py-3 text-[14px] font-semibold text-white transition-transform active:scale-95"
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/20"
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}
        >
          <div className="w-full max-w-sm rounded-xl bg-surface/80 backdrop-blur-[20px] p-8 shadow-xl">
            <h2 className="font-headline font-extrabold text-2xl text-text-primary">Delete liability?</h2>
            <p className="mt-2 text-[14px] text-text-secondary">
              This will permanently remove the liability and its history. This cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-full bg-surface-alt py-3 text-[14px] font-semibold text-text-secondary hover:bg-surface-alt"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 rounded-full bg-error py-3 text-[14px] font-semibold text-white"
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
