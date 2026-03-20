"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import type { Asset, AssetType, ContributionFrequency } from "@/types";

const TYPE_LABELS: Record<AssetType, string> = {
  investment: "Investment",
  savings: "Savings",
  hsa: "HSA",
  property: "Property",
  other: "Other",
};

const TYPE_ICON_NAMES: Record<AssetType, string> = {
  investment: "trending_up",
  savings: "savings",
  hsa: "favorite",
  property: "home",
  other: "radio_button_checked",
};

const FREQ_LABELS: Record<ContributionFrequency, string> = {
  weekly: "Weekly",
  biweekly: "Bi-weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

const FREQ_MULTIPLIER: Record<ContributionFrequency, number> = {
  weekly: 52,
  biweekly: 26,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};

const PERIOD_OPTIONS = [
  { label: "1 Year", years: 1 },
  { label: "3 Years", years: 3 },
  { label: "5 Years", years: 5 },
  { label: "10 Years", years: 10 },
];

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

function projectValue(asset: Asset, years: number): number | null {
  if (asset.type !== "investment") return null;
  const r = (asset.returnRate ?? 0) / 100;
  const annualContrib =
    (asset.contributionAmount ?? 0) *
    (FREQ_MULTIPLIER[asset.contributionFrequency ?? "monthly"] ?? 12);
  if (r === 0) return asset.balance + annualContrib * years;
  return (
    asset.balance * Math.pow(1 + r, years) +
    annualContrib * ((Math.pow(1 + r, years) - 1) / r)
  );
}

interface FormState {
  name: string;
  type: AssetType;
  balance: string;
  currency: string;
  notes: string;
  contributionAmount: string;
  contributionFrequency: ContributionFrequency;
  returnRate: string;
  returnRateVariance: string;
  includeInflation: boolean;
}

const emptyForm: FormState = {
  name: "",
  type: "savings",
  balance: "",
  currency: "USD",
  notes: "",
  contributionAmount: "",
  contributionFrequency: "monthly",
  returnRate: "",
  returnRateVariance: "",
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
  const [selectedPeriod, setSelectedPeriod] = useState(PERIOD_OPTIONS[0]);

  async function fetchAssets() {
    setLoading(true);
    try {
      const data = await apiClient.get<Asset[]>("/api/assets");
      setAssetList(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAssets(); }, []);

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
      contributionAmount: asset.contributionAmount != null ? String(asset.contributionAmount) : "",
      contributionFrequency: asset.contributionFrequency ?? "monthly",
      returnRate: asset.returnRate != null ? String(asset.returnRate) : "",
      returnRateVariance: asset.returnRateVariance != null ? String(asset.returnRateVariance) : "",
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
      const isInvestment = form.type === "investment";
      const payload = {
        name: form.name,
        type: form.type,
        balance: form.balance,
        currency: form.currency,
        notes: form.notes || null,
        contributionAmount: isInvestment && form.contributionAmount ? form.contributionAmount : null,
        contributionFrequency: isInvestment ? form.contributionFrequency : null,
        returnRate: isInvestment && form.returnRate ? form.returnRate : null,
        returnRateVariance: isInvestment && form.returnRateVariance ? form.returnRateVariance : null,
        includeInflation: isInvestment ? form.includeInflation : false,
      };
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
  const hasInvestments = assetList.some((a) => a.type === "investment");

  return (
    <div className="min-h-screen p-12">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[2px] text-primary">Finances</p>
          <h1 className="mt-1 font-headline font-extrabold text-4xl text-on-surface">Assets</h1>
          {assetList.length > 0 && (
            <p className="mt-2 text-[14px] text-on-surface-variant">
              Total assets:{" "}
              <span className="font-bold text-on-surface">
                {formatCurrency(totalBalance)}
              </span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {hasInvestments && (
            <div className="flex items-center gap-1.5 rounded-full bg-surface-container-low px-3 py-2.5">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">calendar_today</span>
              <select
                value={selectedPeriod.years}
                onChange={(e) => {
                  const found = PERIOD_OPTIONS.find((p) => p.years === Number(e.target.value));
                  if (found) setSelectedPeriod(found);
                }}
                className="bg-transparent text-[13px] font-medium text-on-surface focus:outline-none"
              >
                {PERIOD_OPTIONS.map((p) => (
                  <option key={p.years} value={p.years}>{p.label}</option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-container px-5 py-3 text-[14px] font-semibold text-on-primary transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Add Asset
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="mt-16 text-center text-[14px] text-on-surface-variant">Loading…</div>
      ) : assetList.length === 0 ? (
        <div className="mt-16 flex flex-col items-center rounded-2xl bg-surface-container-low px-12 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-fixed/30">
            <span className="material-symbols-outlined text-[22px] text-primary">account_balance</span>
          </div>
          <h2 className="mt-5 font-headline font-extrabold text-2xl text-on-surface">No assets yet</h2>
          <p className="mt-2 max-w-sm text-[14px] text-on-surface-variant">
            Add your savings accounts, investments, HSA, or any other asset to start building your financial picture.
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
          {assetList.map((asset) => {
            const projected = projectValue(asset, selectedPeriod.years);
            const annualContrib =
              asset.contributionAmount != null && asset.contributionFrequency
                ? asset.contributionAmount * FREQ_MULTIPLIER[asset.contributionFrequency]
                : null;

            return (
              <div
                key={asset.id}
                onClick={() => router.push(`/assets/${asset.id}`)}
                className="group relative cursor-pointer rounded-2xl bg-surface-container-lowest p-7 transition-transform hover:-translate-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-fixed/30">
                      <span className="material-symbols-outlined text-[16px] text-primary">{TYPE_ICON_NAMES[asset.type]}</span>
                    </div>
                    <span className="text-[11px] uppercase tracking-[1px] text-on-surface-variant">
                      {TYPE_LABELS[asset.type]}
                    </span>
                  </div>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={(e) => openEdit(asset, e)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(asset.id); }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-on-surface-variant hover:bg-error-container hover:text-error"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                  </div>
                </div>

                <p className="mt-4 text-[17px] font-semibold text-on-surface">{asset.name}</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-on-surface">
                  {formatCurrency(asset.balance, asset.currency)}
                </p>

                {asset.type === "investment" && projected != null && (
                  <div className="mt-4 pt-4">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-[1px] text-on-surface-variant">
                          In {selectedPeriod.label}
                        </p>
                        <p className="mt-0.5 text-[18px] font-bold text-secondary">
                          {formatCurrency(projected, asset.currency)}
                        </p>
                      </div>
                      {asset.returnRate != null && (
                        <span className="rounded-full bg-secondary-fixed/40 px-2.5 py-1 text-[11px] font-semibold text-secondary">
                          {asset.returnRate}% / yr
                        </span>
                      )}
                    </div>
                    {annualContrib != null && annualContrib > 0 && asset.contributionFrequency && (
                      <p className="mt-2 text-[12px] text-on-surface-variant">
                        {formatCurrency(asset.contributionAmount!, asset.currency)}{" "}
                        {FREQ_LABELS[asset.contributionFrequency].toLowerCase()} contribution
                      </p>
                    )}
                  </div>
                )}

                {asset.type !== "investment" && asset.notes && (
                  <p className="mt-3 text-[12px] text-on-surface-variant line-clamp-2">{asset.notes}</p>
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
                {editing ? "Edit Asset" : "New Asset"}
              </h2>
              <button
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Asset Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fidelity Roth IRA"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-2xl bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as AssetType })}
                  className="w-full rounded-2xl bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                >
                  <option value="savings">Savings</option>
                  <option value="investment">Investment</option>
                  <option value="hsa">HSA</option>
                  <option value="property">Property</option>
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
                    placeholder="0.00"
                    value={form.balance}
                    onChange={(e) => setForm({ ...form, balance: e.target.value })}
                    className="w-full rounded-2xl bg-surface-container-high px-4 py-3.5 text-[15px] font-bold text-on-surface placeholder:font-normal placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="w-24">
                  <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Currency</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                    className="w-full rounded-2xl bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {form.type === "investment" && (
                <div className="rounded-xl bg-surface-container-low p-4 space-y-4">
                  <p className="text-[11px] uppercase tracking-[1.5px] text-primary">Investment Details</p>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="mb-1.5 block text-[13px] font-medium text-on-surface">
                        Contribution Amount <span className="font-normal text-on-surface-variant">(optional)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="500.00"
                        value={form.contributionAmount}
                        onChange={(e) => setForm({ ...form, contributionAmount: e.target.value })}
                        className="w-full rounded-2xl bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="w-36">
                      <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Frequency</label>
                      <select
                        value={form.contributionFrequency}
                        onChange={(e) => setForm({ ...form, contributionFrequency: e.target.value as ContributionFrequency })}
                        className="w-full rounded-2xl bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="mb-1.5 block text-[13px] font-medium text-on-surface">
                        Expected Return <span className="font-normal text-on-surface-variant">(% / yr)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="7.0"
                          value={form.returnRate}
                          onChange={(e) => setForm({ ...form, returnRate: e.target.value })}
                          className="w-full rounded-2xl bg-surface-container-high px-4 py-3.5 pr-8 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-on-surface-variant">%</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="mb-1.5 block text-[13px] font-medium text-on-surface">
                        Variance <span className="font-normal text-on-surface-variant">(±%)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="50"
                          step="0.1"
                          placeholder="1.0"
                          value={form.returnRateVariance}
                          onChange={(e) => setForm({ ...form, returnRateVariance: e.target.value })}
                          className="w-full rounded-2xl bg-surface-container-high px-4 py-3.5 pr-8 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-on-surface-variant">%</span>
                      </div>
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={form.includeInflation}
                      onChange={(e) => setForm({ ...form, includeInflation: e.target.checked })}
                      className="h-4 w-4 rounded accent-primary"
                    />
                    <span className="text-[13px] font-medium text-on-surface">
                      Track inflation-adjusted value
                      <span className="ml-1 font-normal text-on-surface-variant">(3% annual)</span>
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
                  placeholder="Any notes about this asset…"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-2xl bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
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