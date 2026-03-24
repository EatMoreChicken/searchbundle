"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import type { Asset, AssetType } from "@/types";

const ASSET_TYPES: {
  value: AssetType;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    value: "simple",
    label: "Simple Account",
    icon: "account_balance_wallet",
    description:
      "A basic account with no interest or growth. Examples: checking account, cash savings, petty cash, gift cards, or any balance you want to track.",
  },
  {
    value: "investment",
    label: "Investment Account",
    icon: "trending_up",
    description:
      "An account that grows over time with an expected return rate. Examples: 401(k), IRA, brokerage account, index funds.",
  },
];

const TYPE_ICON_NAMES: Record<string, string> = {
  simple: "account_balance_wallet",
  investment: "trending_up",
  savings: "savings",
  hsa: "favorite",
  property: "home",
  other: "radio_button_checked",
};

const TYPE_LABELS: Record<string, string> = {
  simple: "Simple Account",
  investment: "Investment",
  savings: "Savings",
  hsa: "HSA",
  property: "Property",
  other: "Other",
};

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string | Date) {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface FormState {
  name: string;
  type: AssetType;
  balance: string;
  currency: string;
  notes: string;
  returnRate: string;
  returnRateVariance: string;
  includeInflation: boolean;
}

const emptyForm: FormState = {
  name: "",
  type: "simple",
  balance: "",
  currency: "USD",
  notes: "",
  returnRate: "7",
  returnRateVariance: "2",
  includeInflation: false,
};

export default function AssetsPage() {
  const router = useRouter();
  const [assetList, setAssetList] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  async function fetchAssets() {
    setLoading(true);
    try {
      const data = await apiClient.get<Asset[]>("/api/assets");
      setAssetList(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAssets();
  }, []);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(asset: Asset, e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(asset);
    setForm({
      name: asset.name,
      type: asset.type,
      balance: String(asset.balance),
      currency: asset.currency,
      notes: asset.notes ?? "",
      returnRate: asset.returnRate != null ? String(asset.returnRate) : "7",
      returnRateVariance: asset.returnRateVariance != null ? String(asset.returnRateVariance) : "2",
      includeInflation: asset.includeInflation,
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
      const payload: Record<string, unknown> = {
        name: form.name,
        type: form.type,
        balance: form.balance,
        currency: form.currency,
        notes: form.notes || null,
      };
      if (form.type === "investment") {
        payload.returnRate = form.returnRate ? parseFloat(form.returnRate) : null;
        payload.returnRateVariance = form.returnRateVariance ? parseFloat(form.returnRateVariance) : null;
        payload.includeInflation = form.includeInflation;
      }
      if (editing) {
        await apiClient.put(`/api/assets/${editing.id}`, payload);
      } else {
        await apiClient.post("/api/assets", payload);
      }
      await fetchAssets();
      closeModal();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await apiClient.delete(`/api/assets/${id}`);
    setDeleteConfirm(null);
    await fetchAssets();
  }

  const totalBalance = assetList.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[2px] text-primary">Finances</p>
          <h1 className="mt-1 font-headline font-extrabold text-4xl text-on-surface">Assets</h1>
          {assetList.length > 0 && (
            <p className="mt-2 text-[14px] text-on-surface-variant">
              Total assets:{" "}
              <span className="font-bold text-on-surface">{formatCurrency(totalBalance)}</span>
            </p>
          )}
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-container px-5 py-3 text-[14px] font-semibold text-on-primary transition-transform active:scale-95"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add Asset
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="mt-16 text-center text-[14px] text-on-surface-variant">Loading…</div>
      ) : assetList.length === 0 ? (
        <div className="mt-16 flex flex-col items-center rounded-2xl bg-surface-container-low px-12 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-fixed/30">
            <span className="material-symbols-outlined text-[22px] text-primary">account_balance_wallet</span>
          </div>
          <h2 className="mt-5 font-headline font-extrabold text-2xl text-on-surface">No assets yet</h2>
          <p className="mt-2 max-w-sm text-[14px] text-on-surface-variant">
            Add your accounts to start building your financial picture. Track checking accounts, cash reserves, and more.
          </p>
          <button
            onClick={openAdd}
            className="mt-6 rounded-full bg-gradient-to-r from-primary to-primary-container px-6 py-3 text-[14px] font-semibold text-on-primary transition-transform active:scale-95"
          >
            Add Your First Asset
          </button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {assetList.map((asset) => (
            <div
              key={asset.id}
              onClick={() => router.push(`/assets/${asset.id}`)}
              className="group relative cursor-pointer rounded-2xl bg-surface-container-lowest p-8 transition-transform hover:-translate-y-1"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-fixed/30">
                    <span className="material-symbols-outlined text-[16px] text-primary">
                      {TYPE_ICON_NAMES[asset.type] ?? "account_balance_wallet"}
                    </span>
                  </div>
                  <span className="text-[11px] uppercase tracking-[1px] text-on-surface-variant">
                    {TYPE_LABELS[asset.type] ?? asset.type}
                  </span>
                </div>
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={(e) => openEdit(asset, e)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                  >
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(asset.id); }}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-on-surface-variant hover:bg-error-container hover:text-error"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                  </button>
                </div>
              </div>

              <p className="mt-4 text-[17px] font-semibold text-on-surface">{asset.name}</p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-on-surface">
                {formatCurrency(asset.balance, asset.currency)}
              </p>

              {asset.notes && (
                <p className="mt-3 text-[12px] text-on-surface-variant line-clamp-2">{asset.notes}</p>
              )}

              <div className="mt-4 flex items-center justify-between">
                <span className="text-[11px] text-on-surface-variant">
                  Added {formatDate(asset.createdAt)}
                </span>
                <div className="flex items-center gap-1 text-[12px] text-on-surface-variant">
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  <span>View details</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-on-surface/20 sm:items-center"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="w-full max-w-2xl rounded-t-2xl bg-surface-container-lowest p-8 shadow-xl sm:rounded-2xl sm:max-h-[90vh] sm:overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-headline font-extrabold text-2xl text-on-surface">
                {editing ? "Edit Asset" : "New Asset"}
              </h2>
              <button
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* Type picker (card-based) */}
              {!editing && (
                <div>
                  <label className="mb-2 block text-[13px] font-medium text-on-surface">
                    What type of asset is this?
                  </label>
                  <div className="space-y-2">
                    {ASSET_TYPES.map((at) => (
                      <button
                        type="button"
                        key={at.value}
                        onClick={() => setForm({ ...form, type: at.value })}
                        className={[
                          "flex w-full items-start gap-3 rounded-xl p-4 text-left transition-colors",
                          form.type === at.value
                            ? "bg-primary-fixed/30 ring-1 ring-primary/20"
                            : "bg-surface-container-low hover:bg-surface-container",
                        ].join(" ")}
                      >
                        <div className={[
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                          form.type === at.value
                            ? "bg-primary text-on-primary"
                            : "bg-surface-container-high text-on-surface-variant",
                        ].join(" ")}>
                          <span className="material-symbols-outlined text-[20px]">{at.icon}</span>
                        </div>
                        <div className="min-w-0">
                          <p className={[
                            "text-[14px] font-semibold",
                            form.type === at.value ? "text-primary" : "text-on-surface",
                          ].join(" ")}>
                            {at.label}
                          </p>
                          <p className="mt-0.5 text-[12px] text-on-surface-variant leading-relaxed">
                            {at.description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-on-surface">
                  What do you call this account?
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chase Checking, Emergency Fund"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                />
              </div>

              {!editing && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="mb-1.5 block text-[13px] font-medium text-on-surface">
                      Current balance
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={form.balance}
                      onChange={(e) => setForm({ ...form, balance: e.target.value })}
                      className="w-full rounded-xl bg-surface-container-high px-4 py-3.5 text-[15px] font-bold text-on-surface placeholder:font-normal placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="w-24">
                    <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Currency</label>
                    <input
                      type="text"
                      maxLength={3}
                      value={form.currency}
                      onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                      className="w-full rounded-xl bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              )}

              {/* Investment-specific fields */}
              {form.type === "investment" && (
                <div className="rounded-xl bg-surface-container-low p-4 space-y-4">
                  <p className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-[1px]">
                    Investment Settings
                  </p>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="mb-1.5 block text-[13px] font-medium text-on-surface">
                        Expected annual return (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="50"
                        placeholder="7"
                        value={form.returnRate}
                        onChange={(e) => setForm({ ...form, returnRate: e.target.value })}
                        className="w-full rounded-xl bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                      />
                      <p className="mt-1 text-[11px] text-on-surface-variant">
                        The average annual return you expect. S&P 500 averages ~10% historically.
                      </p>
                    </div>
                    <div className="flex-1">
                      <label className="mb-1.5 block text-[13px] font-medium text-on-surface">
                        Variance (+/- %)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="20"
                        placeholder="2"
                        value={form.returnRateVariance}
                        onChange={(e) => setForm({ ...form, returnRateVariance: e.target.value })}
                        className="w-full rounded-xl bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                      />
                      <p className="mt-1 text-[11px] text-on-surface-variant">
                        Shows best/worst case bands on the projection chart.
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.includeInflation}
                      onChange={(e) => setForm({ ...form, includeInflation: e.target.checked })}
                      className="h-4 w-4 rounded accent-primary"
                    />
                    <span className="text-[13px] text-on-surface">
                      Show inflation-adjusted values (3% annual)
                    </span>
                  </label>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-on-surface">
                  Notes <span className="font-normal text-on-surface-variant">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Any notes about this account…"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-xl bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-full bg-surface-container-low py-3 text-[14px] font-semibold text-on-surface-variant transition-transform active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-full bg-gradient-to-r from-primary to-primary-container py-3 text-[14px] font-semibold text-on-primary disabled:opacity-50 transition-transform active:scale-95"
                >
                  {saving ? "Saving…" : editing ? "Save Changes" : "Add Asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/20"
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-surface-container-lowest/80 backdrop-blur-[20px] p-8 shadow-xl">
            <h2 className="font-headline font-extrabold text-2xl text-on-surface">Delete asset?</h2>
            <p className="mt-2 text-[14px] text-on-surface-variant">
              This will permanently remove the asset and its history. This cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-full bg-surface-container-low py-3 text-[14px] font-semibold text-on-surface-variant transition-transform active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 rounded-full bg-error py-3 text-[14px] font-semibold text-white transition-transform active:scale-95"
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
