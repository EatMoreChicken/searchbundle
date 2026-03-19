"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type { Account } from "@/types";

type AccountType = Account["type"];

const TYPE_LABELS: Record<AccountType, string> = {
  investment: "Investment",
  savings: "Savings",
  property: "Property",
  other: "Other",
};

const TYPE_ICONS: Record<AccountType, string> = {
  investment: "fa-chart-line",
  savings: "fa-piggy-bank",
  property: "fa-house",
  other: "fa-circle-dot",
};

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}

interface FormState {
  name: string;
  type: AccountType;
  balance: string;
  currency: string;
  notes: string;
}

const emptyForm: FormState = {
  name: "",
  type: "savings",
  balance: "",
  currency: "USD",
  notes: "",
};

export default function AccountsPage() {
  const [accountList, setAccountList] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  async function fetchAccounts() {
    setLoading(true);
    try {
      const data = await apiClient.get<Account[]>("/api/accounts");
      setAccountList(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAccounts(); }, []);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(account: Account) {
    setEditing(account);
    setForm({
      name: account.name,
      type: account.type,
      balance: String(account.balance),
      currency: account.currency,
      notes: account.notes ?? "",
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
      const payload = {
        name: form.name,
        type: form.type,
        balance: form.balance,
        currency: form.currency,
        notes: form.notes || null,
      };
      if (editing) {
        await apiClient.put(`/api/accounts/${editing.id}`, payload);
      } else {
        await apiClient.post("/api/accounts", payload);
      }
      await fetchAccounts();
      closeModal();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await apiClient.delete(`/api/accounts/${id}`);
    setDeleteConfirm(null);
    await fetchAccounts();
  }

  const totalBalance = accountList.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="min-h-screen p-12">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[2px] text-teal">Finances</p>
          <h1 className="mt-1 font-display text-4xl text-text">Accounts</h1>
          {accountList.length > 0 && (
            <p className="mt-2 text-[14px] text-text-secondary">
              Total assets:{" "}
              <span className="font-heading font-bold text-text">
                {formatCurrency(totalBalance)}
              </span>
            </p>
          )}
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-[10px] bg-text px-5 py-3 text-[14px] font-semibold text-bg transition-transform hover:-translate-y-0.5"
        >
          <i className="fa-solid fa-plus text-[13px]" />
          Add Account
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="mt-16 text-center text-[14px] text-text-tertiary">Loading…</div>
      ) : accountList.length === 0 ? (
        /* Empty state */
        <div className="mt-16 flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface px-12 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-light">
            <i className="fa-solid fa-building-columns text-[20px] text-teal" />
          </div>
          <h2 className="mt-5 font-display text-2xl text-text">No accounts yet</h2>
          <p className="mt-2 max-w-sm text-[14px] text-text-secondary">
            Add your first account to start tracking your assets and building your financial picture.
          </p>
          <button
            onClick={openAdd}
            className="mt-6 rounded-[10px] bg-text px-6 py-3 text-[14px] font-semibold text-bg transition-transform hover:-translate-y-0.5"
          >
            Add Your First Account
          </button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {accountList.map((account) => (
            <div
              key={account.id}
              className="group relative rounded-2xl border border-border bg-elevated p-7 transition-transform hover:-translate-y-1"
            >
              {/* Type badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-light">
                    <i className={`fa-solid ${TYPE_ICONS[account.type]} text-[14px] text-teal`} />
                  </div>
                  <span className="font-mono text-[11px] uppercase tracking-[1px] text-text-tertiary">
                    {TYPE_LABELS[account.type]}
                  </span>
                </div>
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => openEdit(account)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary hover:bg-surface hover:text-text"
                  >
                    <i className="fa-solid fa-pen text-[11px]" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(account.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary hover:bg-red-light hover:text-red"
                  >
                    <i className="fa-solid fa-trash text-[11px]" />
                  </button>
                </div>
              </div>

              <p className="mt-4 font-heading text-[17px] font-semibold text-text">{account.name}</p>
              <p className="mt-1 font-heading text-3xl font-bold tracking-tight text-text">
                {formatCurrency(account.balance, account.currency)}
              </p>
              {account.notes && (
                <p className="mt-3 text-[12px] text-text-tertiary line-clamp-2">{account.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-text/20 sm:items-center"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="w-full max-w-md rounded-t-2xl bg-elevated p-8 shadow-xl sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-text">
                {editing ? "Edit Account" : "New Account"}
              </h2>
              <button
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary hover:bg-surface hover:text-text"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-text">
                  Account Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fidelity Roth IRA"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-[10px] border-[1.5px] border-border bg-bg px-4 py-3.5 text-[14px] text-text placeholder:text-text-tertiary focus:border-teal focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-text">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })}
                  className="w-full rounded-[10px] border-[1.5px] border-border bg-bg px-4 py-3.5 text-[14px] text-text focus:border-teal focus:outline-none"
                >
                  <option value="savings">Savings</option>
                  <option value="investment">Investment</option>
                  <option value="property">Property</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1.5 block text-[13px] font-medium text-text">
                    Current Balance
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.balance}
                    onChange={(e) => setForm({ ...form, balance: e.target.value })}
                    className="w-full rounded-[10px] border-[1.5px] border-border bg-bg px-4 py-3.5 font-heading text-[15px] font-bold text-text placeholder:font-body placeholder:font-normal placeholder:text-text-tertiary focus:border-teal focus:outline-none"
                  />
                </div>
                <div className="w-24">
                  <label className="mb-1.5 block text-[13px] font-medium text-text">
                    Currency
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                    className="w-full rounded-[10px] border-[1.5px] border-border bg-bg px-4 py-3.5 text-[14px] text-text focus:border-teal focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-text">
                  Notes{" "}
                  <span className="font-normal text-text-tertiary">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Any notes about this account…"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-[10px] border-[1.5px] border-border bg-bg px-4 py-3.5 text-[14px] text-text placeholder:text-text-tertiary focus:border-teal focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-[10px] border-[1.5px] border-border py-3 text-[14px] font-semibold text-text-secondary hover:border-text-secondary hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-[10px] bg-text py-3 text-[14px] font-semibold text-bg disabled:opacity-50"
                >
                  {saving ? "Saving…" : editing ? "Save Changes" : "Add Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-text/20"
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-elevated p-8 shadow-xl">
            <h2 className="font-display text-2xl text-text">Delete account?</h2>
            <p className="mt-2 text-[14px] text-text-secondary">
              This will permanently remove the account and its history. This cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-[10px] border-[1.5px] border-border py-3 text-[14px] font-semibold text-text-secondary hover:bg-surface"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 rounded-[10px] bg-red py-3 text-[14px] font-semibold text-white"
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

