"use client";

import { useState } from "react";
import type { AccountContribution, ContributionFrequency } from "@/types";
import { apiClient } from "@/lib/api-client";

const FREQ_OPTIONS: { value: ContributionFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

const FREQ_MONTHLY_MULT: Record<ContributionFrequency, number> = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrencyFull(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

interface Props {
  assetId: string;
  contributions: AccountContribution[];
  onUpdate: () => void;
}

export default function PlannedContributions({ assetId, contributions, onUpdate }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<ContributionFrequency>("monthly");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editFrequency, setEditFrequency] = useState<ContributionFrequency>("monthly");
  const [editSaving, setEditSaving] = useState(false);

  const totalMonthly = contributions.reduce(
    (sum, c) => sum + c.amount * FREQ_MONTHLY_MULT[c.frequency],
    0
  );

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !amount.trim()) return;
    setSaving(true);
    try {
      await apiClient.post(`/api/assets/${assetId}/contributions`, {
        label: label.trim(),
        amount: parseFloat(amount),
        frequency,
      });
      setLabel("");
      setAmount("");
      setFrequency("monthly");
      setAddOpen(false);
      onUpdate();
    } finally {
      setSaving(false);
    }
  }

  function startEdit(c: AccountContribution) {
    setEditingId(c.id);
    setEditLabel(c.label);
    setEditAmount(String(c.amount));
    setEditFrequency(c.frequency);
  }

  async function handleEditSave() {
    if (!editingId || !editLabel.trim() || !editAmount.trim()) return;
    setEditSaving(true);
    try {
      await apiClient.put(`/api/assets/${assetId}/contributions/${editingId}`, {
        label: editLabel.trim(),
        amount: parseFloat(editAmount),
        frequency: editFrequency,
      });
      setEditingId(null);
      onUpdate();
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(contributionId: string) {
    await apiClient.delete(`/api/assets/${assetId}/contributions/${contributionId}`);
    onUpdate();
  }

  return (
    <div className="rounded-2xl bg-surface-container-lowest p-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[2px] text-primary">Planning</p>
          <h2 className="mt-1 text-xl font-bold text-on-surface">Planned Contributions</h2>
        </div>
        {contributions.length > 0 && !addOpen && (
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-container px-4 py-2 text-[12px] font-semibold text-on-primary transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            Add
          </button>
        )}
      </div>

      {contributions.length === 0 && !addOpen ? (
        <div className="mt-6 flex flex-col items-center py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed/30">
            <span className="material-symbols-outlined text-[20px] text-primary">event_repeat</span>
          </div>
          <p className="mt-4 text-[13px] text-on-surface-variant max-w-xs">
            Add recurring contributions to see a projection of how this account will grow over time.
          </p>
          <button
            onClick={() => setAddOpen(true)}
            className="mt-4 flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-container px-5 py-2.5 text-[13px] font-semibold text-on-primary transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            Add Contribution
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          {contributions.map((c) =>
            editingId === c.id ? (
              <div key={c.id} className="rounded-xl bg-surface-container p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label className="mb-1 block text-[11px] font-medium text-on-surface-variant">Label</label>
                    <input
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="w-full rounded-xl bg-surface-container-high px-3 py-2.5 text-[13px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="w-28">
                    <label className="mb-1 block text-[11px] font-medium text-on-surface-variant">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="w-full rounded-xl bg-surface-container-high px-3 py-2.5 text-[13px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="w-32">
                    <label className="mb-1 block text-[11px] font-medium text-on-surface-variant">Frequency</label>
                    <select
                      value={editFrequency}
                      onChange={(e) => setEditFrequency(e.target.value as ContributionFrequency)}
                      className="w-full rounded-xl bg-surface-container-high px-3 py-2.5 text-[13px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {FREQ_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleEditSave}
                      disabled={editSaving}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-on-primary disabled:opacity-50 transition-transform active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={c.id}
                className="group flex items-center justify-between rounded-xl bg-surface-container-low px-5 py-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-fixed/30">
                    <span className="material-symbols-outlined text-[14px] text-primary">event_repeat</span>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-on-surface">{c.label}</p>
                    <p className="mt-0.5 text-[11px] text-on-surface-variant">
                      {FREQ_OPTIONS.find((f) => f.value === c.frequency)?.label ?? c.frequency}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[14px] font-semibold text-on-surface">
                    {formatCurrencyFull(c.amount)}
                  </span>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => startEdit(c)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-on-surface-variant hover:bg-error-container hover:text-error transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Add form */}
      {addOpen && (
        <form onSubmit={handleAdd} className="mt-4 rounded-xl bg-surface-container p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-[11px] font-medium text-on-surface-variant">What is this for?</label>
              <input
                type="text"
                required
                placeholder="e.g. Monthly deposit, Employer match"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full rounded-xl bg-surface-container-high px-3 py-2.5 text-[13px] text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="w-28">
              <label className="mb-1 block text-[11px] font-medium text-on-surface-variant">Amount</label>
              <input
                type="number"
                required
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl bg-surface-container-high px-3 py-2.5 text-[13px] text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="w-32">
              <label className="mb-1 block text-[11px] font-medium text-on-surface-variant">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as ContributionFrequency)}
                className="w-full rounded-xl bg-surface-container-high px-3 py-2.5 text-[13px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {FREQ_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-on-primary disabled:opacity-50 transition-transform active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">check</span>
              </button>
              <button
                type="button"
                onClick={() => { setAddOpen(false); setLabel(""); setAmount(""); setFrequency("monthly"); }}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Monthly total */}
      {contributions.length > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-surface-container px-5 py-3">
          <span className="text-[12px] font-medium text-on-surface-variant">Monthly equivalent</span>
          <span className="text-[14px] font-bold text-on-surface">
            {formatCurrency(Math.round(totalMonthly))}
            <span className="text-[11px] font-normal text-on-surface-variant">/mo</span>
          </span>
        </div>
      )}
    </div>
  );
}
