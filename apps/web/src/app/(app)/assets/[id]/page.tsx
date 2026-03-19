"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import type { Asset, AssetType, ContributionFrequency } from "@/types";
import InvestmentProjectionChart from "@/components/InvestmentProjectionChart";

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

const HORIZON_OPTIONS = [
  { label: "1Y", years: 1 },
  { label: "5Y", years: 5 },
  { label: "10Y", years: 10 },
  { label: "20Y", years: 20 },
  { label: "30Y", years: 30 },
];

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

function projectValue(asset: Asset, years: number): number {
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

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [horizon, setHorizon] = useState(HORIZON_OPTIONS[1]);
  const [showInflation, setShowInflation] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  async function fetchAsset() {
    setLoading(true);
    try {
      const data = await apiClient.get<Asset>(`/api/assets/${id}`);
      setAsset(data);
      setShowInflation(data.includeInflation);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAsset(); }, [id]);

  function openEdit() {
    if (!asset) return;
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
    setEditOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !asset) return;
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
      await apiClient.put(`/api/assets/${asset.id}`, payload);
      setEditOpen(false);
      await fetchAsset();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!asset) return;
    await apiClient.delete(`/api/assets/${asset.id}`);
    router.push("/assets");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[14px] text-text-tertiary">Loading…</p>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-[14px] text-text-secondary">Asset not found.</p>
        <button onClick={() => router.push("/assets")} className="text-[13px] text-teal underline">
          Back to Assets
        </button>
      </div>
    );
  }

  const annualContrib =
    asset.contributionAmount != null && asset.contributionFrequency
      ? asset.contributionAmount * FREQ_MULTIPLIER[asset.contributionFrequency]
      : null;

  const projectedValue = asset.type === "investment" ? projectValue(asset, horizon.years) : null;
  const gain = projectedValue != null ? projectedValue - asset.balance : null;

  return (
    <div className="min-h-screen p-12">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/assets")}
          className="flex items-center gap-2 text-[13px] text-text-secondary hover:text-text"
        >
          <i className="fa-solid fa-arrow-left text-[12px]" />
          Assets
        </button>
        <div className="flex gap-2">
          <button
            onClick={openEdit}
            className="flex items-center gap-2 rounded-[10px] border border-border px-4 py-2.5 text-[13px] font-medium text-text-secondary hover:bg-surface hover:text-text"
          >
            <i className="fa-solid fa-pen text-[12px]" />
            Edit
          </button>
          <button
            onClick={() => setDeleteConfirm(true)}
            className="flex items-center gap-2 rounded-[10px] border border-border px-4 py-2.5 text-[13px] font-medium text-text-secondary hover:bg-red-light hover:border-red hover:text-red"
          >
            <i className="fa-solid fa-trash text-[12px]" />
            Delete
          </button>
        </div>
      </div>

      {/* Asset header */}
      <div className="mt-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-light">
            <i className={`fa-solid ${TYPE_ICONS[asset.type]} text-[16px] text-teal`} />
          </div>
          <span className="font-mono text-[11px] uppercase tracking-[1.5px] text-text-tertiary">
            {TYPE_LABELS[asset.type]}
          </span>
        </div>
        <h1 className="mt-3 font-display text-4xl text-text">{asset.name}</h1>
        <p className="mt-2 font-heading text-5xl font-bold tracking-tight text-text">
          {formatCurrency(asset.balance, asset.currency)}
        </p>
      </div>

      {/* Investment-specific content */}
      {asset.type === "investment" && (
        <>
          {/* Key metrics */}
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {annualContrib != null && (
              <div className="rounded-xl border border-border bg-elevated p-5">
                <p className="font-mono text-[10px] uppercase tracking-[1.2px] text-text-tertiary">Annual Contribution</p>
                <p className="mt-2 font-heading text-xl font-bold text-text">
                  {formatCurrency(annualContrib, asset.currency)}
                </p>
                {asset.contributionFrequency && (
                  <p className="mt-1 text-[12px] text-text-tertiary">
                    {formatCurrency(asset.contributionAmount!, asset.currency)} {FREQ_LABELS[asset.contributionFrequency].toLowerCase()}
                  </p>
                )}
              </div>
            )}
            {asset.returnRate != null && (
              <div className="rounded-xl border border-border bg-elevated p-5">
                <p className="font-mono text-[10px] uppercase tracking-[1.2px] text-text-tertiary">Expected Return</p>
                <p className="mt-2 font-heading text-xl font-bold text-text">{asset.returnRate}%</p>
                <p className="mt-1 text-[12px] text-text-tertiary">per year</p>
              </div>
            )}
            {asset.returnRateVariance != null && asset.returnRateVariance > 0 && (
              <div className="rounded-xl border border-border bg-elevated p-5">
                <p className="font-mono text-[10px] uppercase tracking-[1.2px] text-text-tertiary">Variance</p>
                <p className="mt-2 font-heading text-xl font-bold text-text">±{asset.returnRateVariance}%</p>
                <p className="mt-1 text-[12px] text-text-tertiary">
                  {(asset.returnRate ?? 0) - (asset.returnRateVariance ?? 0)}% – {(asset.returnRate ?? 0) + (asset.returnRateVariance ?? 0)}%
                </p>
              </div>
            )}
            {projectedValue != null && (
              <div className="rounded-xl border border-border bg-elevated p-5">
                <p className="font-mono text-[10px] uppercase tracking-[1.2px] text-text-tertiary">
                  In {horizon.years} Year{horizon.years > 1 ? "s" : ""}
                </p>
                <p className="mt-2 font-heading text-xl font-bold text-green">
                  {formatCurrency(projectedValue, asset.currency)}
                </p>
                {gain != null && gain > 0 && (
                  <p className="mt-1 text-[12px] text-green">
                    +{formatCurrency(gain, asset.currency)}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Projection chart */}
          <div className="mt-8 rounded-2xl border border-border bg-elevated p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[2px] text-teal">Projection</p>
                <h2 className="mt-1 font-heading text-xl font-bold text-text">Portfolio Growth</h2>
              </div>
              <div className="flex items-center gap-4">
                {/* Inflation toggle */}
                <label className="flex cursor-pointer items-center gap-2">
                  <div
                    onClick={() => setShowInflation(!showInflation)}
                    className={[
                      "relative h-5 w-9 rounded-full transition-colors",
                      showInflation ? "bg-teal" : "bg-border",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                        showInflation ? "translate-x-4" : "translate-x-0.5",
                      ].join(" ")}
                    />
                  </div>
                  <span className="text-[12px] font-medium text-text-secondary">Inflation-adjusted</span>
                </label>

                {/* Time horizon selector */}
                <div className="flex rounded-[10px] border border-border bg-surface p-0.5">
                  {HORIZON_OPTIONS.map((h) => (
                    <button
                      key={h.years}
                      onClick={() => setHorizon(h)}
                      className={[
                        "rounded-lg px-3 py-1.5 font-mono text-[11px] font-medium transition-colors",
                        horizon.years === h.years
                          ? "bg-elevated text-text shadow-sm"
                          : "text-text-tertiary hover:text-text-secondary",
                      ].join(" ")}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <InvestmentProjectionChart
                balance={asset.balance}
                contributionAmount={asset.contributionAmount}
                contributionFrequency={asset.contributionFrequency}
                returnRate={asset.returnRate}
                returnRateVariance={asset.returnRateVariance}
                includeInflation={showInflation}
                years={horizon.years}
              />
            </div>

            {/* Chart legend / notes */}
            <div className="mt-4 flex flex-wrap gap-4 text-[12px] text-text-secondary">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-5 rounded bg-teal" />
                Expected value
              </span>
              {(asset.returnRateVariance ?? 0) > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-5 rounded bg-teal-light" />
                  Uncertainty range (±{asset.returnRateVariance}%)
                </span>
              )}
              {showInflation && (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-5 rounded border-t border-dashed border-text-tertiary" />
                  Inflation-adjusted (3% / yr)
                </span>
              )}
            </div>
          </div>
        </>
      )}

      {/* Notes */}
      {asset.notes && (
        <div className="mt-6 rounded-xl border border-border bg-elevated p-6">
          <p className="font-mono text-[10px] uppercase tracking-[1.2px] text-text-tertiary">Notes</p>
          <p className="mt-2 text-[14px] text-text-secondary">{asset.notes}</p>
        </div>
      )}

      {/* Edit Modal */}
      {editOpen && form && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-text/20 sm:items-center"
          onClick={(e) => { if (e.target === e.currentTarget) setEditOpen(false); }}
        >
          <div className="w-full max-w-lg rounded-t-2xl bg-elevated p-8 shadow-xl sm:rounded-2xl sm:max-h-[90vh] sm:overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-text">Edit Asset</h2>
              <button
                onClick={() => setEditOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary hover:bg-surface hover:text-text"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-text">Asset Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-[10px] border-[1.5px] border-border bg-bg px-4 py-3.5 text-[14px] text-text focus:border-teal focus:outline-none"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1.5 block text-[13px] font-medium text-text">Balance</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={form.balance}
                    onChange={(e) => setForm({ ...form, balance: e.target.value })}
                    className="w-full rounded-[10px] border-[1.5px] border-border bg-bg px-4 py-3.5 font-heading text-[15px] font-bold text-text focus:border-teal focus:outline-none"
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
                      <label className="mb-1.5 block text-[13px] font-medium text-text">Contribution Amount</label>
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
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-[10px] border-[1.5px] border-border bg-bg px-4 py-3.5 text-[14px] text-text placeholder:text-text-tertiary focus:border-teal focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="flex-1 rounded-[10px] border-[1.5px] border-border py-3 text-[14px] font-semibold text-text-secondary hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-[10px] bg-text py-3 text-[14px] font-semibold text-bg disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save Changes"}
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
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(false); }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-elevated p-8 shadow-xl">
            <h2 className="font-display text-2xl text-text">Delete asset?</h2>
            <p className="mt-2 text-[14px] text-text-secondary">
              This will permanently remove <strong>{asset.name}</strong> and its history. This cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 rounded-[10px] border-[1.5px] border-border py-3 text-[14px] font-semibold text-text-secondary hover:bg-surface"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
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
