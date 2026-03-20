"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import type { Asset, AssetType, ContributionFrequency, Scenario } from "@/types";
import InvestmentProjectionChart from "@/components/InvestmentProjectionChart";

const TYPE_LABELS: Record<AssetType, string> = {
  investment: "Investment",
  savings: "Savings",
  hsa: "HSA",
  property: "Property",
  other: "Other",
};

const TYPE_ICONS: Record<AssetType, string> = {
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

  // What-if scenario state
  const [extraOneOff, setExtraOneOff] = useState("");
  const [extraMonthly, setExtraMonthly] = useState("");
  const [extraYearly, setExtraYearly] = useState("");
  const [scenarioActive, setScenarioActive] = useState(false);

  // Saved scenarios
  const [savedScenarios, setSavedScenarios] = useState<Scenario[]>([]);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  const [savingScenario, setSavingScenario] = useState(false);

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

  async function fetchScenarios() {
    try {
      const data = await apiClient.get<Scenario[]>(`/api/assets/${id}/scenarios`);
      setSavedScenarios(data);
    } catch { /* ignore */ }
  }

  useEffect(() => { fetchAsset(); fetchScenarios(); }, [id]);

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

  function clearScenario() {
    setExtraOneOff("");
    setExtraMonthly("");
    setExtraYearly("");
    setScenarioActive(false);
  }

  function loadScenario(scenario: Scenario) {
    setExtraOneOff(scenario.lumpSumPayment > 0 ? String(scenario.lumpSumPayment) : "");
    setExtraMonthly(scenario.extraMonthlyPayment > 0 ? String(scenario.extraMonthlyPayment) : "");
    setExtraYearly(scenario.extraYearlyPayment > 0 ? String(scenario.extraYearlyPayment) : "");
    setScenarioActive(true);
  }

  async function handleSaveScenario() {
    if (!scenarioName.trim()) return;
    setSavingScenario(true);
    try {
      await apiClient.post(`/api/assets/${id}/scenarios`, {
        name: scenarioName.trim(),
        extraMonthlyPayment: extraMonthly ? Number(extraMonthly) : 0,
        extraYearlyPayment: extraYearly ? Number(extraYearly) : 0,
        lumpSumPayment: extraOneOff ? Number(extraOneOff) : 0,
        lumpSumMonth: 1,
      });
      setSaveModalOpen(false);
      setScenarioName("");
      await fetchScenarios();
    } finally {
      setSavingScenario(false);
    }
  }

  async function handleDeleteScenario(scenarioId: string) {
    await apiClient.delete(`/api/assets/${id}/scenarios/${scenarioId}`);
    await fetchScenarios();
  }

  const hasScenarioInputs = !!(extraOneOff || extraMonthly || extraYearly);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setScenarioActive(hasScenarioInputs); }, [extraOneOff, extraMonthly, extraYearly]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[14px] text-on-surface-variant">Loading…</p>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-[14px] text-on-surface-variant">Asset not found.</p>
        <button onClick={() => router.push("/assets")} className="text-[13px] text-primary underline">
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
    <div className="min-h-screen p-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/assets")}
          className="flex items-center gap-2 text-[13px] text-on-surface-variant hover:text-on-surface"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Assets
        </button>
        <div className="flex gap-2">
          <button
            onClick={openEdit}
            className="flex items-center gap-2 rounded-full bg-surface-container-low px-4 py-2.5 text-[13px] font-medium text-on-surface-variant hover:text-on-surface"
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

      {/* Asset header */}
      <div className="mt-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-fixed/30">
            <span className="material-symbols-outlined text-[18px] text-primary">{TYPE_ICONS[asset.type]}</span>
          </div>
          <span className="text-[11px] uppercase tracking-[1.5px] text-on-surface-variant">
            {TYPE_LABELS[asset.type]}
          </span>
        </div>
        <h1 className="mt-3 font-headline font-extrabold text-4xl text-on-surface">{asset.name}</h1>
        <p className="mt-2 text-5xl font-bold tracking-tight text-on-surface">
          {formatCurrency(asset.balance, asset.currency)}
        </p>
      </div>

      {/* Investment-specific content */}
      {asset.type === "investment" && (
        <>
          {/* Key metrics */}
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {annualContrib != null && (
              <div className="rounded-xl bg-surface-container-lowest p-5">
                <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">Annual Contribution</p>
                <p className="mt-2 text-xl font-bold text-on-surface">
                  {formatCurrency(annualContrib, asset.currency)}
                </p>
                {asset.contributionFrequency && (
                  <p className="mt-1 text-[12px] text-on-surface-variant">
                    {formatCurrency(asset.contributionAmount!, asset.currency)} {FREQ_LABELS[asset.contributionFrequency].toLowerCase()}
                  </p>
                )}
              </div>
            )}
            {asset.returnRate != null && (
              <div className="rounded-xl bg-surface-container-lowest p-5">
                <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">Expected Return</p>
                <p className="mt-2 text-xl font-bold text-on-surface">{asset.returnRate}%</p>
                <p className="mt-1 text-[12px] text-on-surface-variant">per year</p>
              </div>
            )}
            {asset.returnRateVariance != null && asset.returnRateVariance > 0 && (
              <div className="rounded-xl bg-surface-container-lowest p-5">
                <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">Variance</p>
                <p className="mt-2 text-xl font-bold text-on-surface">±{asset.returnRateVariance}%</p>
                <p className="mt-1 text-[12px] text-on-surface-variant">
                  {(asset.returnRate ?? 0) - (asset.returnRateVariance ?? 0)}% – {(asset.returnRate ?? 0) + (asset.returnRateVariance ?? 0)}%
                </p>
              </div>
            )}
            {projectedValue != null && (
              <div className="rounded-xl bg-surface-container-lowest p-5">
                <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">
                  In {horizon.years} Year{horizon.years > 1 ? "s" : ""}
                </p>
                <p className="mt-2 text-xl font-bold text-secondary">
                  {formatCurrency(projectedValue, asset.currency)}
                </p>
                {gain != null && gain > 0 && (
                  <p className="mt-1 text-[12px] text-secondary">
                    +{formatCurrency(gain, asset.currency)}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Projection chart */}
          <div className="mt-8 rounded-2xl bg-surface-container-lowest p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[2px] text-primary">Projection</p>
                <h2 className="mt-1 text-xl font-bold text-on-surface">Portfolio Growth</h2>
              </div>
              <div className="flex items-center gap-4">
                {/* Inflation toggle */}
                <label className="flex cursor-pointer items-center gap-2">
                  <div
                    onClick={() => setShowInflation(!showInflation)}
                    className={[
                      "relative h-5 w-9 rounded-full transition-colors",
                      showInflation ? "bg-primary" : "bg-surface-container-highest",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                        showInflation ? "translate-x-4" : "translate-x-0.5",
                      ].join(" ")}
                    />
                  </div>
                  <span className="text-[12px] font-medium text-on-surface-variant">Inflation-adjusted</span>
                </label>

                {/* Time horizon selector */}
                <div className="flex rounded-full bg-surface-container-low p-0.5">
                  {HORIZON_OPTIONS.map((h) => (
                    <button
                      key={h.years}
                      onClick={() => setHorizon(h)}
                      className={[
                        "rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors",
                        horizon.years === h.years
                          ? "bg-surface-container-lowest text-on-surface shadow-sm"
                          : "text-on-surface-variant hover:text-on-surface",
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
            <div className="mt-4 flex flex-wrap gap-4 text-[12px] text-on-surface-variant">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-5 rounded bg-primary" />
                Expected value
              </span>
              {(asset.returnRateVariance ?? 0) > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-5 rounded bg-primary-fixed/30" />
                  Uncertainty range (±{asset.returnRateVariance}%)
                </span>
              )}
              {showInflation && (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-5 rounded border-t border-dashed border-on-surface-variant" />
                  Inflation-adjusted (3% / yr)
                </span>
              )}
            </div>
          </div>

          {/* What-If Scenario Panel */}
          <div className="mt-8 rounded-2xl bg-surface-container-lowest p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[2px] text-primary">What If</p>
                <h2 className="mt-1 text-xl font-bold text-on-surface">Extra Contribution Scenarios</h2>
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
                      className="flex items-center gap-2 rounded-full bg-surface-container-low px-4 py-2.5 text-[13px] font-medium text-on-surface-variant hover:text-on-surface"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                      Discard
                    </button>
                  </>
                )}
              </div>
            </div>

            <p className="mt-3 text-[14px] text-on-surface-variant">
              See how extra contributions affect your portfolio growth over time.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-on-surface">
                  Extra Monthly Contribution
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
                <p className="mt-1 text-[11px] text-on-surface-variant">Added to every month&apos;s contribution</p>
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-on-surface">
                  Extra Annual Contribution
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
                <p className="mt-1 text-[11px] text-on-surface-variant">One extra contribution each year</p>
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-on-surface">
                  One-Off Contribution
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-on-surface-variant">$</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="5000"
                    value={extraOneOff}
                    onChange={(e) => setExtraOneOff(e.target.value)}
                    className="w-full rounded-[10px] bg-surface-container-high pl-7 pr-4 py-3.5 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                  />
                </div>
                <p className="mt-1 text-[11px] text-on-surface-variant">Added to your balance immediately</p>
              </div>
            </div>

            {/* Scenario impact summary */}
            {scenarioActive && (() => {
              const r = (asset.returnRate ?? 0) / 100;
              const baseContrib = (asset.contributionAmount ?? 0) * (FREQ_MULTIPLIER[asset.contributionFrequency ?? "monthly"] ?? 12);
              const scenarioContrib = baseContrib + (Number(extraMonthly) || 0) * 12 + (Number(extraYearly) || 0);
              const oneOff = Number(extraOneOff) || 0;
              const scenarioBalance = asset.balance + oneOff;

              const baseFV = r === 0
                ? asset.balance + baseContrib * horizon.years
                : asset.balance * Math.pow(1 + r, horizon.years) + baseContrib * ((Math.pow(1 + r, horizon.years) - 1) / r);
              const scenarioFV = r === 0
                ? scenarioBalance + scenarioContrib * horizon.years
                : scenarioBalance * Math.pow(1 + r, horizon.years) + scenarioContrib * ((Math.pow(1 + r, horizon.years) - 1) / r);
              const extraGain = scenarioFV - baseFV;

              return (
                <div className="mt-6 grid grid-cols-1 gap-4 rounded-xl bg-secondary-fixed/30 p-6 sm:grid-cols-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">Scenario Value ({horizon.years}Y)</p>
                    <p className="mt-1 text-xl font-bold text-secondary">
                      {formatCurrency(scenarioFV, asset.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">Extra Growth</p>
                    <p className="mt-1 text-xl font-bold text-secondary">
                      +{formatCurrency(extraGain, asset.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">New Annual Contribution</p>
                    <p className="mt-1 text-xl font-bold text-on-surface">
                      {formatCurrency(scenarioContrib, asset.currency)}
                    </p>
                    <p className="mt-0.5 text-[12px] text-on-surface-variant">
                      was {formatCurrency(baseContrib, asset.currency)}
                    </p>
                  </div>
                </div>
              );
            })()}
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
                          <span>+{formatCurrency(scenario.extraMonthlyPayment, asset.currency)}/mo</span>
                        )}
                        {scenario.extraYearlyPayment > 0 && (
                          <span>+{formatCurrency(scenario.extraYearlyPayment, asset.currency)}/yr</span>
                        )}
                        {scenario.lumpSumPayment > 0 && (
                          <span>+{formatCurrency(scenario.lumpSumPayment, asset.currency)} one-off</span>
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
        </>
      )}

      {/* Notes */}
      {asset.notes && (
        <div className="mt-6 rounded-xl bg-surface-container-lowest p-6">
          <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">Notes</p>
          <p className="mt-2 text-[14px] text-on-surface-variant">{asset.notes}</p>
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
              <h2 className="font-headline font-extrabold text-2xl text-on-surface">Edit Asset</h2>
              <button
                onClick={() => setEditOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Asset Name</label>
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
                <div className="w-24">
                  <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Currency</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                    className="w-full rounded-[10px] bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {form.type === "investment" && (
                <div className="rounded-xl bg-surface-container-low p-4 space-y-4">
                  <p className="text-[11px] uppercase tracking-[1.5px] text-primary">Investment Details</p>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Contribution Amount</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="500.00"
                        value={form.contributionAmount}
                        onChange={(e) => setForm({ ...form, contributionAmount: e.target.value })}
                        className="w-full rounded-[10px] bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="w-36">
                      <label className="mb-1.5 block text-[13px] font-medium text-on-surface">Frequency</label>
                      <select
                        value={form.contributionFrequency}
                        onChange={(e) => setForm({ ...form, contributionFrequency: e.target.value as ContributionFrequency })}
                        className="w-full rounded-[10px] bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
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
                          className="w-full rounded-[10px] bg-surface-container-high px-4 py-3.5 pr-8 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
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
                          className="w-full rounded-[10px] bg-surface-container-high px-4 py-3.5 pr-8 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
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
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-[10px] bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="flex-1 rounded-full bg-surface-container-low py-3 text-[14px] font-semibold text-on-surface-variant"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-full bg-gradient-to-r from-primary to-primary-container py-3 text-[14px] font-semibold text-on-primary disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
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
              autoFocus
              placeholder="e.g. Max out contributions"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              className="mt-4 w-full rounded-[10px] bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
            />
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setSaveModalOpen(false)}
                className="flex-1 rounded-full bg-surface-container-low py-3 text-[14px] font-semibold text-on-surface-variant"
              >
                Cancel
              </button>
              <button
                disabled={!scenarioName.trim() || savingScenario}
                onClick={handleSaveScenario}
                className="flex-1 rounded-full bg-gradient-to-r from-primary to-primary-container py-3 text-[14px] font-semibold text-on-primary disabled:opacity-50"
              >
                {savingScenario ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/20"
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(false); }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-surface-container-lowest/80 backdrop-blur-[20px] p-8 shadow-xl">
            <h2 className="font-headline font-extrabold text-2xl text-on-surface">Delete asset?</h2>
            <p className="mt-2 text-[14px] text-on-surface-variant">
              This will permanently remove <strong>{asset.name}</strong> and its history. This cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 rounded-full bg-surface-container-low py-3 text-[14px] font-semibold text-on-surface-variant"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 rounded-full bg-error py-3 text-[14px] font-semibold text-on-primary"
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
