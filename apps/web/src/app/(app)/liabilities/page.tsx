"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import type { Debt, DebtType } from "@/types";

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

function estimatePayoffMonths(balance: number, rate: number, payment: number): number | null {
  if (payment <= 0 || balance <= 0) return null;
  const monthlyRate = rate / 100 / 12;
  if (monthlyRate === 0) return Math.ceil(balance / payment);
  const minPayment = balance * monthlyRate;
  if (payment <= minPayment) return null;
  return Math.ceil(-Math.log(1 - (monthlyRate * balance) / payment) / Math.log(1 + monthlyRate));
}

function formatMonths(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m}mo`;
  if (m === 0) return `${y}yr`;
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

const emptyForm: FormState = {
  name: "",
  type: "mortgage",
  balance: "",
  originalBalance: "",
  interestRate: "",
  minimumPayment: "",
  escrowAmount: "",
  remainingMonths: "",
  notes: "",
};

export default function LiabilitiesPage() {
  const router = useRouter();
  const [debtList, setDebtList] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  async function fetchDebts() {
    setLoading(true);
    try {
      const data = await apiClient.get<Debt[]>("/api/liabilities");
      setDebtList(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchDebts(); }, []);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(debt: Debt, e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(debt);
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
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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

  const totalBalance = debtList.reduce((sum, d) => sum + d.balance, 0);

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[2px] text-primary">Finances</p>
          <h1 className="mt-1 font-headline font-extrabold text-4xl text-on-surface">Liabilities</h1>
          {debtList.length > 0 && (
            <p className="mt-2 text-[14px] text-on-surface-variant">
              Total owed:{" "}
              <span className="font-bold text-error">
                {formatCurrency(totalBalance)}
              </span>
            </p>
          )}
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-container px-5 py-3 text-[14px] font-semibold text-on-primary transition-transform active:scale-95"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add Liability
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="mt-16 text-center text-[14px] text-on-surface-variant">Loading…</div>
      ) : debtList.length === 0 ? (
        <div className="mt-16 flex flex-col items-center rounded-2xl bg-surface-container-low px-12 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-error-container">
            <span className="material-symbols-outlined text-[22px] text-error">credit_card</span>
          </div>
          <h2 className="mt-5 font-headline font-extrabold text-2xl text-on-surface">No liabilities yet</h2>
          <p className="mt-2 max-w-sm text-[14px] text-on-surface-variant">
            Add your mortgage, car loan, or other debts to track payoff timelines and see how extra payments can save you money.
          </p>
          <button
            onClick={openAdd}
            className="mt-6 rounded-full bg-gradient-to-r from-primary to-primary-container px-6 py-3 text-[14px] font-semibold text-on-primary transition-transform active:scale-95"
          >
            Add Your First Liability
          </button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {debtList.map((debt) => {
            const payoffMonths = debt.remainingMonths
              ?? estimatePayoffMonths(debt.balance, debt.interestRate, debt.minimumPayment);
            const paidDown = debt.originalBalance > 0
              ? ((debt.originalBalance - debt.balance) / debt.originalBalance) * 100
              : 0;

            return (
              <div
                key={debt.id}
                onClick={() => router.push(`/liabilities/${debt.id}`)}
                className="group relative cursor-pointer rounded-2xl bg-surface-container-lowest p-8 transition-transform hover:-translate-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-error-container">
                      <span className="material-symbols-outlined text-[16px] text-error">{TYPE_ICONS[debt.type]}</span>
                    </div>
                    <span className="text-[11px] uppercase tracking-[1px] text-on-surface-variant">
                      {TYPE_LABELS[debt.type]}
                    </span>
                  </div>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={(e) => openEdit(debt, e)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(debt.id); }}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-on-surface-variant hover:bg-error-container hover:text-error"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                  </div>
                </div>

                <p className="mt-4 text-[17px] font-semibold text-on-surface">{debt.name}</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-error">
                  {formatCurrency(debt.balance)}
                </p>

                {/* Progress bar */}
                <div className="mt-4 pt-4">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-on-surface-variant">Paid off</span>
                    <span className="font-semibold text-secondary">{paidDown.toFixed(1)}%</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-container-highest">
                    <div
                      className="h-full rounded-full bg-secondary transition-all"
                      style={{ width: `${Math.min(100, paidDown)}%` }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[1px] text-on-surface-variant">Rate</p>
                      <span className="rounded-full bg-tertiary-fixed px-2.5 py-1 text-[11px] font-semibold text-tertiary">
                        {debt.interestRate}%
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-[1px] text-on-surface-variant">Payment</p>
                      <p className="text-[14px] font-bold text-on-surface">
                        {formatCurrency(debt.minimumPayment)}/mo
                      </p>
                    </div>
                    {payoffMonths != null && (
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-[1px] text-on-surface-variant">Payoff</p>
                        <p className="text-[13px] font-semibold text-on-surface">
                          {formatMonths(payoffMonths)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {debt.notes && debt.type !== "mortgage" && (
                  <p className="mt-3 text-[12px] text-on-surface-variant line-clamp-2">{debt.notes}</p>
                )}

                <div className="mt-3 flex items-center gap-1 text-[12px] text-on-surface-variant">
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  <span>View details</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-on-surface/20 sm:items-center"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="w-full max-w-lg rounded-t-2xl bg-surface-container-lowest p-8 shadow-xl sm:rounded-2xl sm:max-h-[90vh] sm:overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-headline font-extrabold text-2xl text-on-surface">
                {editing ? "Edit Liability" : "New Liability"}
              </h2>
              <button
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Name</label>
                <input
                  type="text"
                  required
                  placeholder={form.type === "mortgage" ? "e.g. Home Mortgage" : "e.g. Toyota Camry Loan"}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-2xl bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as DebtType })}
                  className="w-full rounded-2xl bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                >
                  <option value="mortgage">Mortgage</option>
                  <option value="auto">Car Loan</option>
                  <option value="student_loan">Student Loan</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Current Balance</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="250000.00"
                    value={form.balance}
                    onChange={(e) => setForm({ ...form, balance: e.target.value })}
                    className="w-full rounded-2xl bg-surface-container-high px-4 py-3.5 text-[15px] font-bold text-on-surface placeholder:font-normal placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Original Balance</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="300000.00"
                    value={form.originalBalance}
                    onChange={(e) => setForm({ ...form, originalBalance: e.target.value })}
                    className="w-full rounded-2xl bg-surface-container-high px-4 py-3.5 text-[15px] font-bold text-on-surface placeholder:font-normal placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
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
                      placeholder="6.50"
                      value={form.interestRate}
                      onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                      className="w-full rounded-2xl bg-surface-container-high px-4 py-3.5 pr-8 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
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
                    placeholder="1580.00"
                    value={form.minimumPayment}
                    onChange={(e) => setForm({ ...form, minimumPayment: e.target.value })}
                    className="w-full rounded-2xl bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-on-surface">
                  Remaining Months <span className="font-normal text-on-surface-variant">(optional)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="600"
                  step="1"
                  placeholder="348"
                  value={form.remainingMonths}
                  onChange={(e) => setForm({ ...form, remainingMonths: e.target.value })}
                  className="w-full rounded-2xl bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                />
              </div>

              {form.type === "mortgage" && (
                <div className="rounded-xl bg-surface-container-low p-4 space-y-4">
                  <p className="text-[11px] uppercase tracking-[1.5px] text-primary">Mortgage Details</p>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-on-surface">
                      Escrow (Taxes &amp; Insurance) <span className="font-normal text-on-surface-variant">(optional, per month)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="450.00"
                      value={form.escrowAmount}
                      onChange={(e) => setForm({ ...form, escrowAmount: e.target.value })}
                      className="w-full rounded-2xl bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-on-surface">
                  Notes <span className="font-normal text-on-surface-variant">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Any notes about this liability…"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-2xl bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-full bg-surface-container-low py-3 text-[14px] font-semibold text-on-surface-variant hover:bg-surface-container"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-full bg-gradient-to-r from-primary to-primary-container py-3 text-[14px] font-semibold text-on-primary disabled:opacity-50"
                >
                  {saving ? "Saving…" : editing ? "Save Changes" : "Add Liability"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/20"
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-surface-container-lowest/80 backdrop-blur-[20px] p-8 shadow-xl">
            <h2 className="font-headline font-extrabold text-2xl text-on-surface">Delete liability?</h2>
            <p className="mt-2 text-[14px] text-on-surface-variant">
              This will permanently remove the liability and its history. This cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-full bg-surface-container-low py-3 text-[14px] font-semibold text-on-surface-variant hover:bg-surface-container"
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
