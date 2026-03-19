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

const TYPE_ICONS: Record<AssetType, string> = {
  investment: "fa-chart-line",
  savings: "fa-piggy-bank",
  hsa: "fa-heart-pulse",
  property: "fa-house",
  other: "fa-circle-dot",
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
          <p className="font-mono text-[11px] uppercase tracking-[2px] text-teal">Finances</p>
          <h1 className="mt-1 font-display text-4xl text-text">Assets</h1>
          {assetList.length > 0 && (
            <p className="mt-2 text-[14px] text-text-secondary">
              Total assets:{" "}
              <span className="font-heading font-bold text-text">
                {formatCurrency(totalBalance)}
              </span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {hasInvestments && (
            <div className="flex items-center gap-1.5 rounded-[10px] border border-border bg-surface px-3 py-2.5">
              <i className="fa-solid fa-calendar text-[12px] text-text-tertiary" />
              <select
                value={selectedPeriod.years}
                onChange={(e) => {
                  const found = PERIOD_OPTIONS.find((p) => p.years === Number(e.target.value));
                  if (found) setSelectedPeriod(found);
                }}
                className="bg-transparent text-[13px] font-medium text-text focus:outline-none"
              >
                {PERIOD_OPTIONS.map((p) => (
                  <option key={p.years} value={p.years}>{p.label}</option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-[10px] bg-text px-5 py-3 text-[14px] font-semibold text-bg transition-transform hover:-translate-y-0.5"
          >
            <i className="fa-solid fa-plus text-[13px]" />
            Add Asset
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="mt-16 text-center text-[14px] text-text-tertiary">Loading…</div>
      ) : assetList.length === 0 ? (
        <div className="mt-16 flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface px-12 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-light">
            <i className="fa-solid fa-building-columns text-[20px] text-teal" />
          </div>
          <h2 className="mt-5 font-display text-2xl text-text">No assets yet</h2>
          <p className="mt-2 max-w-sm text-[14px] text-text-secondary">
            Add your savings accounts, investments, HSA, or any other asset to start building your financial picture.
          </p>
          <button
            onClick={openAdd}
            className="mt-6 rounded-[10px] bg-text px-6 py-3 text-[14px] font-semibold text-bg transition-transform hover:-translate-y-0.5"
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
                className="group relative cursor-pointer rounded-2xl border border-border bg-elevated p-7 transition-transform hover:-translate-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-light">
                      <i className={`fa-solid ${TYPE_ICONS[asset.type]} text-[14px] text-teal`} />
                    </div>
                    <span className="font-mono text-[11px] uppercase tracking-[1px] text-text-tertiary">
                      {TYPE_LABELS[asset.type]}
                    </span>
                  </div>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={(e) => openEdit(asset, e)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary hover:bg-surface hover:text-text"
                    >
                      <i className="fa-solid fa-pen text-[11px]" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(asset.id); }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary hover:bg-red-light hover:text-red"
                    >
                      <i className="fa-solid fa-trash text-[11px]" />
                    </button>
                  </div>
                </div>

                <p className="mt-4 font-heading text-[17px] font-semibold text-text">{asset.name}</p>
                <p className="mt-1 font-heading text-3xl font-bold tracking-tight text-text">
                  {formatCurrency(asset.balance, asset.currency)}
                </p>

                {asset.type === "investment" && projected != null && (
                  <div className="mt-4 border-t border-border pt-4">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[1px] text-text-tertiary">
                          In {selectedPeriod.label}
                        </p>
                        <p className="mt-0.5 font-heading text-[18px] font-bold text-green">
                          {formatCurrency(projected, asset.currency)}
                        </p>
                      </div>
                      {asset.returnRate != null && (
                        <span className="rounded-full bg-green-light px-2.5 py-1 font-mono text-[11px] font-semibold text-green">
                          {asset.returnRate}% / yr
                        </span>
                      )}
                    </div>
                    {annualContrib != null && annualContrib > 0 && asset.contributionFrequency && (
                      <p className="mt-2 text-[12px] text-text-tertiary">
                        {formatCurrency(asset.contributionAmount!, asset.currency)}{" "}
                        {FREQ_LABELS[asset.contributionFrequency].toLowerCase()} contribution
                      </p>
                    )}
                  </div>
                )}

                {asset.type !== "investment" && asset.notes && (
                  <p className="mt-3 text-[12px] text-text-tertiary line-clamp-2">{asset.notes}</p>
                )}

                <div className="mt-3 flex items-center gap-1 text-[12px] text-text-tertiary">
                  <i className="fa-solid fa-arrow-right text-[10px]" />
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
          className="fixed inset-0 z-50 flex items-end justify-center bg-text/20 sm:items-center"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="w-full max-w-lg rounded-t-2xl bg-elevated p-8 shadow-xl sm:rounded-2xl sm:max-h-[90vh] sm:overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-text">
                {editing ? "Edit Asset" : "New Asset"}
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
                <label className="mb-1.5 block text-[13px] font-medium text-text">Asset Name</label>
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
                  onChange={(e) => setForm({ ...form, type: e.target.value as AssetType })}
                  className="w-full rounded-[10px] border-[1.5px] border-border bg-bg px-4 py-3.5 text-[14px] text-text focus:border-teal focus:outline-none"
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
                  <label className="mb-1.5 block text-[13px] font-medium text-text">Current Balance</label>
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
                  <label className="mb-1.5 block text-[13px] font-medium text-text">Currency</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                    className="w-full rounded-[10px] border-[1.5px] border-border bg-bg px-4 py-3.5 text-[14px] text-text focus:border-teal focus:outline-none"
                  />
                </div>
              </div>

              {form.type === "investment" && (
                <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
                  <p className="font-mono text-[11px] uppercase tracking-[1.5px] text-teal">Investment Details</p>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="mb-1.5 block text-[13px] font-medium text-text">
                        Contribution Amount <span className="font-normal text-text-tertiary">(optional)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="500.00"
                        value={form.contributionAmount}
                        onChange={(e) => setForm({ ...form, contributionAmount: e.target.value })}
                        className="w-full rounded-[10px] border-[1.5px] border-border bg-bg px-4 py-3.5 text-[14px] text-text placeholder:text-text-tertiary focus:border-teal focus:outline-none"
                      />
                    </div>
                    <div className="w-36">
                      <label className="mb-1.5 block text-[13px] font-medium text-text">Frequency</label>
                      <select
                        value={form.contributionFrequency}
                        onChange={(e) => setForm({ ...form, contributionFrequency: e.target.value as ContributionFrequency })}
                        className="w-full rounded-[10px] border-[1.5px] border-border bg-bg px-4 py-3.5 text-[14px] text-text focus:border-teal focus:outline-none"
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
                      <label className="mb-1.5 block text-[13px] font-medium text-text">
                        Expected Return <span className="font-normal text-text-tertiary">(% / yr)</span>
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
                          className="w-full rounded-[10px] border-[1.5px] border-border bg-bg px-4 py-3.5 pr-8 text-[14px] text-text placeholder:text-text-tertiary focus:border-teal focus:outline-none"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-text-tertiary">%</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="mb-1.5 block text-[13px] font-medium text-text">
                        Variance <span className="font-normal text-text-tertiary">(±%)</span>
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
                          className="w-full rounded-[10px] border-[1.5px] border-border bg-bg px-4 py-3.5 pr-8 text-[14px] text-text placeholder:text-text-tertiary focus:border-teal focus:outline-none"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-text-tertiary">%</span>
                      </div>
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={form.includeInflation}
                      onChange={(e) => setForm({ ...form, includeInflation: e.target.checked })}
                      className="h-4 w-4 rounded border-border accent-teal"
                    />
                    <span className="text-[13px] font-medium text-text">
                      Track inflation-adjusted value
                      <span className="ml-1 font-normal text-text-tertiary">(3% annual)</span>
                    </span>
                  </label>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-text">
                  Notes <span className="font-normal text-text-tertiary">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Any notes about this asset…"
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
                  {saving ? "Saving…" : editing ? "Save Changes" : "Add Asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-text/20"
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-elevated p-8 shadow-xl">
            <h2 className="font-display text-2xl text-text">Delete asset?</h2>
            <p className="mt-2 text-[14px] text-text-secondary">
              This will permanently remove the asset and its history. This cannot be undone.
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