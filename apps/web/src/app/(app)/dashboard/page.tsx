"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import type { User, RetirementTarget, TargetMode, Asset, BalanceUpdate, AccountContribution, Debt } from "@/types";
import type { SavingsStrategy, StrategyParams } from "@/lib/retirement-strategies";
import {
  getExtendedSchedule,
  calculateStartingMonthly,
} from "@/lib/retirement-strategies";
import {
  projectAsset,
  mergeProjections,
  projectDebt,
  mergeDebtProjections,
  buildDashboardChartData,
  calculateOnTrackStatus,
  type AssetProjectionResult,
  type DebtProjectionResult,
  type DashboardChartPoint,
  type OnTrackInfo,
} from "@/lib/asset-projections";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

// ─── Formatters ──────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `$${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatFullCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function calculateMonthlySavings(target: number, annualReturn: number, years: number): number {
  if (years <= 0) return 0;
  const n = years * 12;
  if (annualReturn === 0) return target / n;
  const r = annualReturn / 12;
  return (target * r) / (Math.pow(1 + r, n) - 1);
}

const INFLATION_RATE = 0.03;

// ─── Edit Target Form Helpers ────────────────────────────────────────────────

const INPUT_CLASS =
  "w-full bg-surface-container-high rounded-2xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary transition-all";

function InfoTooltip({ children }: { children: string }) {
  return (
    <span className="relative group inline-flex items-center ml-1 align-middle cursor-help">
      <span className="material-symbols-outlined text-[14px] text-on-surface-variant">info</span>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 z-20 mb-2 w-64 rounded-xl bg-on-surface px-3 py-2.5 text-xs leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {children}
      </span>
    </span>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">{children}</p>
  );
}

function PrefixedInput({
  prefix,
  suffix,
  children,
}: {
  prefix?: string;
  suffix?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex items-center">
      {prefix && (
        <span className="pointer-events-none absolute left-4 text-sm font-medium text-on-surface-variant select-none">
          {prefix}
        </span>
      )}
      <div className={["w-full", prefix ? "[&_input]:pl-8" : "", suffix ? "[&_input]:pr-10" : ""].join(" ")}>
        {children}
      </div>
      {suffix && (
        <span className="pointer-events-none absolute right-4 text-sm font-medium text-on-surface-variant select-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

function NumericInput({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const displayValue =
    !focused && value ? parseInt(value, 10).toLocaleString("en-US") : value;
  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={(e) => {
        const raw = e.target.value.replace(/,/g, "");
        if (raw === "" || /^\d+$/.test(raw)) onChange(raw);
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className={className}
      placeholder={placeholder}
    />
  );
}

// ─── On-Track Badge ──────────────────────────────────────────────────────────

function OnTrackBadge({ info }: { info: OnTrackInfo }) {
  const config = {
    ahead: { icon: "trending_up", bg: "bg-secondary-container", text: "text-secondary", iconColor: "text-secondary" },
    on_track: { icon: "check_circle", bg: "bg-secondary-container", text: "text-secondary", iconColor: "text-secondary" },
    slightly_behind: { icon: "trending_down", bg: "bg-tertiary-fixed", text: "text-on-tertiary-fixed-variant", iconColor: "text-tertiary" },
    behind: { icon: "warning", bg: "bg-error-container", text: "text-on-error-container", iconColor: "text-error" },
    no_data: { icon: "remove_circle_outline", bg: "bg-surface-container-high", text: "text-on-surface-variant", iconColor: "text-on-surface-variant" },
  };
  const c = config[info.status];

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${c.bg}`}>
      <span className={`material-symbols-outlined text-[16px] ${c.iconColor}`}>{c.icon}</span>
      <span className={`text-xs font-semibold ${c.text}`}>{info.label}</span>
      {info.status !== "no_data" && (
        <span className={`text-xs ${c.text} opacity-70`}>
          ({Math.round(info.ratio * 100)}%)
        </span>
      )}
    </div>
  );
}

// ─── Chart Time Window ───────────────────────────────────────────────────────

type TimeWindow = "focused" | "custom" | "all";
type ChartMode = "summary" | "detailed";

const YEAR_RANGE_OPTIONS = [5, 10, 15, 20, 25];

// ─── Asset Data Fetching ─────────────────────────────────────────────────────

interface AssetWithDetails {
  asset: Asset;
  history: BalanceUpdate[];
  contributions: AccountContribution[];
}

async function fetchAssetDetails(assets: Asset[]): Promise<AssetWithDetails[]> {
  const results = await Promise.all(
    assets.map(async (asset) => {
      const [history, contributions] = await Promise.all([
        apiClient.get<BalanceUpdate[]>(`/api/assets/${asset.id}/history`),
        apiClient.get<AccountContribution[]>(`/api/assets/${asset.id}/contributions`),
      ]);
      return { asset, history, contributions };
    }),
  );
  return results;
}

// ─── Liability Data Fetching ─────────────────────────────────────────────────

interface DebtWithDetails {
  debt: Debt;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [target, setTarget] = useState<RetirementTarget | null>(null);
  const [assets, setAssets] = useState<AssetWithDetails[]>([]);
  const [debts, setDebts] = useState<DebtWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("focused");
  const [customYears, setCustomYears] = useState(15);
  const [chartMode, setChartMode] = useState<ChartMode>("summary");
  const [showYearMenu, setShowYearMenu] = useState(false);

  // Target configurator form state
  const [mode, setMode] = useState<TargetMode>("income_replacement");
  const [fixedAmount, setFixedAmount] = useState("");
  const [targetAge, setTargetAge] = useState("");
  const [annualIncome, setAnnualIncome] = useState("");
  const [incomeValueType, setIncomeValueType] = useState<"present" | "future">("present");
  const [withdrawalRate, setWithdrawalRate] = useState("4");
  const [expectedReturn, setExpectedReturn] = useState("7");
  const [targetSaving, setTargetSaving] = useState(false);
  const [targetError, setTargetError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [u, t, assetList, debtList] = await Promise.all([
        apiClient.get<User>("/api/users/me"),
        apiClient.get<RetirementTarget | null>("/api/retirement-target"),
        apiClient.get<Asset[]>("/api/assets"),
        apiClient.get<Debt[]>("/api/liabilities"),
      ]);

      if ((!u.dateOfBirth || u.retirementAge == null) && !t) {
        router.replace("/getting-started");
        return;
      }

      setUser(u);
      setTarget(t);

      if (t) {
        setMode(t.mode);
        setFixedAmount(t.mode === "fixed" ? String(t.targetAmount) : "");
        setTargetAge(String(t.targetAge));
        setAnnualIncome(t.annualIncome != null ? String(t.annualIncome) : "");
        setWithdrawalRate(String((t.withdrawalRate ?? 0.04) * 100));
        setExpectedReturn(String((t.expectedReturn ?? 0.07) * 100));
      }

      // Fetch details for all assets
      if (assetList.length > 0) {
        const details = await fetchAssetDetails(assetList);
        setAssets(details);
      }

      // Set liability data
      if (debtList.length > 0) {
        setDebts(debtList.map((debt) => ({ debt })));
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (session?.user) loadData();
  }, [session, loadData]);

  // ─── Derived State ─────────────────────────────────────────────────────────

  const currentAge = user?.dateOfBirth ? calculateAge(user.dateOfBirth) : null;
  const currentYear = new Date().getFullYear();
  const tAge = Number(targetAge) || 0;
  const yearsRemaining = currentAge != null ? tAge - currentAge : null;
  const firstName = user?.name?.split(" ")[0] ?? "there";

  // Total current asset value
  const totalAssets = useMemo(
    () => assets.reduce((sum, a) => sum + a.asset.balance, 0),
    [assets],
  );

  // Total current liability value
  const totalLiabilities = useMemo(
    () => debts.reduce((sum, d) => sum + d.debt.balance, 0),
    [debts],
  );

  const netWorth = totalAssets - totalLiabilities;

  // ─── Edit Mode Calculations ────────────────────────────────────────────────

  const annualIncomeInFutureDollars = useMemo(() => {
    const income = Number(annualIncome) || 0;
    if (incomeValueType === "future" || !yearsRemaining || yearsRemaining <= 0) return income;
    return income * Math.pow(1 + INFLATION_RATE, yearsRemaining);
  }, [annualIncome, incomeValueType, yearsRemaining]);

  const portfolioTarget = useMemo(() => {
    if (mode === "fixed") return Number(fixedAmount) || 0;
    const income = annualIncomeInFutureDollars;
    const wr = (Number(withdrawalRate) || 4) / 100;
    if (wr === 0) return 0;
    return income / wr;
  }, [mode, fixedAmount, annualIncomeInFutureDollars, withdrawalRate]);

  const inflationAdjustedTarget = useMemo(() => {
    if (mode === "income_replacement") return portfolioTarget;
    if (!yearsRemaining || yearsRemaining <= 0) return portfolioTarget;
    return portfolioTarget * Math.pow(1 + INFLATION_RATE, yearsRemaining);
  }, [mode, portfolioTarget, yearsRemaining]);

  const monthlySavings = useMemo(() => {
    if (!yearsRemaining || yearsRemaining <= 0) return 0;
    const ret = (Number(expectedReturn) || 7) / 100;
    return calculateMonthlySavings(inflationAdjustedTarget, ret, yearsRemaining);
  }, [inflationAdjustedTarget, expectedReturn, yearsRemaining]);

  const annualSavings = monthlySavings * 12;

  // ─── Saved Summary + Plan Chart Data ───────────────────────────────────────

  const savedSummary = useMemo(() => {
    if (!target || !currentAge) return null;
    const years = target.targetAge - currentAge;
    if (years <= 0) return null;
    const rawTarget = target.targetAmount;
    const monthly = calculateMonthlySavings(rawTarget, target.expectedReturn ?? 0.07, years);

    const strategy = (target.savingsStrategy ?? "traditional") as SavingsStrategy;
    const params: StrategyParams = {
      strategy,
      targetAmount: rawTarget,
      years,
      annualReturn: target.expectedReturn ?? 0.07,
      annualChangeRate: target.strategyAnnualChangeRate ?? undefined,
      phase1Years: target.strategyPhase1Years ?? undefined,
      phase2Monthly: target.strategyPhase2Monthly ?? undefined,
    };

    const startMonthly = target.strategyPhase1Monthly ?? calculateStartingMonthly(params);
    const projectionEndAge = user?.projectionEndAge ?? 100;
    const chartData = getExtendedSchedule(
      params,
      startMonthly,
      currentAge,
      currentYear,
      target.targetAge,
      projectionEndAge,
    );

    return { years, monthly, annual: monthly * 12, targetAmount: rawTarget, chartData, retirementAge: target.targetAge };
  }, [target, currentAge, currentYear, user?.projectionEndAge]);

  // ─── Asset Projections ─────────────────────────────────────────────────────

  const assetProjections: AssetProjectionResult[] = useMemo(() => {
    if (!currentAge) return [];
    const yearsForward = (user?.projectionEndAge ?? 100) - currentAge;
    return assets.map((a) =>
      projectAsset(a.asset, a.history, a.contributions, yearsForward, currentAge, currentYear),
    );
  }, [assets, currentAge, currentYear, user?.projectionEndAge]);

  const mergedAssetProjection = useMemo(() => {
    if (!currentAge) return [];
    const yearsForward = (user?.projectionEndAge ?? 100) - currentAge;
    return mergeProjections(assetProjections, yearsForward, currentAge, currentYear);
  }, [assetProjections, currentAge, currentYear, user?.projectionEndAge]);

  // ─── Liability Projections ─────────────────────────────────────────────────

  const debtProjections: DebtProjectionResult[] = useMemo(() => {
    if (!currentAge) return [];
    const yearsForward = (user?.projectionEndAge ?? 100) - currentAge;
    return debts.map((d) =>
      projectDebt(d.debt, yearsForward, currentAge, currentYear),
    );
  }, [debts, currentAge, currentYear, user?.projectionEndAge]);

  const mergedDebtProjection = useMemo(() => {
    if (!currentAge) return [];
    const yearsForward = (user?.projectionEndAge ?? 100) - currentAge;
    return mergeDebtProjections(debtProjections, yearsForward, currentAge, currentYear);
  }, [debtProjections, currentAge, currentYear, user?.projectionEndAge]);

  // ─── Combined Chart Data ───────────────────────────────────────────────────

  const dashboardChartData: DashboardChartPoint[] = useMemo(() => {
    if (!savedSummary?.chartData || !currentAge) return [];
    return buildDashboardChartData(savedSummary.chartData, mergedAssetProjection, mergedDebtProjection, currentAge);
  }, [savedSummary, mergedAssetProjection, mergedDebtProjection, currentAge]);

  // Filter chart data by time window
  const visibleChartData = useMemo(() => {
    if (!currentAge || dashboardChartData.length === 0) return dashboardChartData;

    switch (timeWindow) {
      case "focused": {
        const minAge = currentAge - 5;
        const maxAge = currentAge + 10;
        return dashboardChartData.filter((d) => d.age >= minAge && d.age <= maxAge);
      }
      case "custom": {
        const minAge = currentAge - 2;
        const maxAge = currentAge + customYears;
        return dashboardChartData.filter((d) => d.age >= minAge && d.age <= maxAge);
      }
      case "all":
        return dashboardChartData;
    }
  }, [dashboardChartData, currentAge, timeWindow, customYears]);

  // ─── On-Track Status ───────────────────────────────────────────────────────

  const onTrackInfo: OnTrackInfo = useMemo(() => {
    if (!savedSummary?.chartData || !currentAge) {
      return { status: "no_data", label: "No data yet", ratio: 0, planValue: 0, actualValue: 0 };
    }
    const planPoint = savedSummary.chartData.find((d) => d.age === currentAge);
    const planValue = planPoint?.portfolioValue ?? 0;
    return calculateOnTrackStatus(planValue, netWorth);
  }, [savedSummary, currentAge, netWorth]);

  // ─── Save / Edit Handlers ──────────────────────────────────────────────────

  async function saveTarget(e: React.FormEvent) {
    e.preventDefault();
    setTargetError("");

    if (portfolioTarget <= 0) { setTargetError("Please enter a valid target amount."); return; }
    if (tAge < 1 || tAge > 120) { setTargetError("Target age must be between 1 and 120."); return; }
    if (yearsRemaining != null && yearsRemaining <= 0) { setTargetError("Target age must be greater than your current age."); return; }

    setTargetSaving(true);
    try {
      const saved = await apiClient.put<RetirementTarget>("/api/retirement-target", {
        mode,
        targetAmount: portfolioTarget,
        targetAge: tAge,
        annualIncome: mode === "income_replacement" ? Number(annualIncome) || null : null,
        withdrawalRate: (Number(withdrawalRate) || 4) / 100,
        expectedReturn: (Number(expectedReturn) || 7) / 100,
        inflationRate: INFLATION_RATE,
        includeInflation: true,
      });
      setTarget(saved);
      setEditing(false);
    } catch (err: unknown) {
      setTargetError(err instanceof Error ? err.message : "Failed to save target");
    } finally {
      setTargetSaving(false);
    }
  }

  function startEditing() {
    if (target) {
      setMode(target.mode);
      setFixedAmount(target.mode === "fixed" ? String(target.targetAmount) : "");
      setTargetAge(String(target.targetAge));
      setAnnualIncome(target.annualIncome != null ? String(target.annualIncome) : "");
      setIncomeValueType("present");
      setWithdrawalRate(String((target.withdrawalRate ?? 0.04) * 100));
      setExpectedReturn(String((target.expectedReturn ?? 0.07) * 100));
    }
    setEditing(true);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <span className="material-symbols-outlined text-primary animate-spin text-[32px]">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* ── Hero Header ────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-fixed/40 via-surface-container-lowest to-secondary-fixed/30 rounded-2xl p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-fixed/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary-fixed/25 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-label-sm font-semibold text-on-surface-variant tracking-widest uppercase">Dashboard</p>
            <h1 className="text-headline-lg font-extrabold text-on-surface tracking-tight">
              Hey {firstName}
            </h1>
            {savedSummary && <OnTrackBadge info={onTrackInfo} />}
          </div>
          {target && !editing && (
            <button
              onClick={startEditing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-primary hover:bg-primary-fixed/40 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
              Edit Target
            </button>
          )}
        </div>
      </div>

      {/* ── Edit Target Modal ──────────────────────────────────────────── */}
      {editing && (
        <section className="bg-surface-container-lowest rounded-2xl p-8 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[20px]">flag</span>
            </div>
            <h2 className="text-title-md font-bold text-on-surface">Edit Financial Independence Target</h2>
          </div>

          <form onSubmit={saveTarget} className="space-y-6">
            {/* Mode selector */}
            <div>
              <p className="text-sm font-semibold text-on-surface mb-1">How do you want to describe your goal?</p>
              <p className="text-xs text-on-surface-variant mb-3">Choose the approach that feels more natural to you.</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { id: "income_replacement" as TargetMode, icon: "paid", title: "I know my lifestyle", desc: "Tell us your desired annual spending and we'll calculate the total you need to save." },
                  { id: "fixed" as TargetMode, icon: "savings", title: "I know my number", desc: "You already have a total portfolio target in mind and want to work backward from it." },
                ] as const).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMode(opt.id)}
                    className={`text-left p-4 rounded-2xl transition-all ${mode === opt.id ? "bg-primary-fixed" : "bg-surface-container-high hover:bg-surface-container"}`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`material-symbols-outlined text-[18px] ${mode === opt.id ? "text-primary" : "text-on-surface-variant"}`}>{opt.icon}</span>
                      <span className={`text-sm font-bold ${mode === opt.id ? "text-primary" : "text-on-surface"}`}>{opt.title}</span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-5">
              {mode === "fixed" ? (
                <div>
                  <label className="block text-sm font-semibold text-on-surface mb-2">What is your total savings target?</label>
                  <PrefixedInput prefix="$">
                    <NumericInput value={fixedAmount} onChange={setFixedAmount} placeholder="2,000,000" className={INPUT_CLASS} />
                  </PrefixedInput>
                  <FieldHint>The total amount you want invested across all accounts when you reach your goal. We&apos;ll adjust this for inflation automatically.</FieldHint>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-on-surface mb-2">How much do you want to spend per year in retirement?</label>
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <PrefixedInput prefix="$">
                          <NumericInput value={annualIncome} onChange={setAnnualIncome} placeholder="80,000" className={INPUT_CLASS} />
                        </PrefixedInput>
                      </div>
                      <div className="flex rounded-xl overflow-hidden border border-outline-variant/30 flex-shrink-0">
                        {([
                          { key: "present" as const, label: "Today" },
                          { key: "future" as const, label: "Future" },
                        ]).map(({ key, label }) => (
                          <button key={key} type="button" onClick={() => setIncomeValueType(key)}
                            className={`px-3 py-2.5 text-xs font-semibold transition-colors ${incomeValueType === key ? "bg-primary text-white" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container"}`}
                          >{label}</button>
                        ))}
                      </div>
                    </div>
                    <FieldHint>{incomeValueType === "present" ? "In today's dollars. We'll inflate this forward automatically." : "Already adjusted for inflation."}</FieldHint>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-on-surface mb-2 flex items-center">
                      Safe withdrawal rate
                      <InfoTooltip>The percentage of your portfolio you withdraw each year. The widely accepted "4% rule" means your savings should last 30+ years.</InfoTooltip>
                    </label>
                    <PrefixedInput suffix="%">
                      <input type="number" min={0.5} max={20} step="0.1" value={withdrawalRate} onChange={(e) => setWithdrawalRate(e.target.value)} className={INPUT_CLASS} />
                    </PrefixedInput>
                    <FieldHint>Default 4%: designed to last 30+ years.</FieldHint>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-on-surface mb-2">Target age</label>
                  <PrefixedInput suffix="yrs">
                    <input type="number" min={1} max={120} value={targetAge} onChange={(e) => setTargetAge(e.target.value)} placeholder="65" className={INPUT_CLASS} />
                  </PrefixedInput>
                  <FieldHint>The age you want to be financially independent.</FieldHint>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-on-surface mb-2 flex items-center">
                    Expected annual return
                    <InfoTooltip>How much you expect your investments to grow each year on average. 7% is the long-term historical average for diversified stock portfolios.</InfoTooltip>
                  </label>
                  <PrefixedInput suffix="%">
                    <input type="number" min={0} max={30} step="0.1" value={expectedReturn} onChange={(e) => setExpectedReturn(e.target.value)} className={INPUT_CLASS} />
                  </PrefixedInput>
                  <FieldHint>Default is 7%.</FieldHint>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-on-surface-variant bg-surface-container rounded-2xl px-4 py-3">
                <span className="material-symbols-outlined text-[14px] flex-shrink-0">info</span>
                <span>A 3% annual inflation rate is automatically applied.</span>
              </div>
            </div>

            {/* Live summary */}
            <div className="bg-surface-container-low rounded-2xl p-6 space-y-4">
              <p className="text-label-sm font-bold text-on-surface-variant tracking-widest uppercase">Preview</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-on-surface-variant mb-0.5">Portfolio Target</p>
                  <p className="text-lg font-extrabold text-on-surface tracking-tight">
                    {inflationAdjustedTarget > 0 ? formatCurrency(inflationAdjustedTarget) : <span className="text-outline-variant">-</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant mb-0.5">Years Remaining</p>
                  <p className="text-lg font-extrabold text-on-surface tracking-tight">
                    {yearsRemaining != null && yearsRemaining > 0 ? yearsRemaining : <span className="text-outline-variant">-</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant mb-0.5">Monthly Savings</p>
                  <p className="text-lg font-extrabold text-primary tracking-tight">
                    {monthlySavings > 0 ? formatFullCurrency(monthlySavings) : <span className="text-outline-variant">-</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant mb-0.5">Annual Savings</p>
                  <p className="text-lg font-extrabold text-primary tracking-tight">
                    {annualSavings > 0 ? formatFullCurrency(annualSavings) : <span className="text-outline-variant">-</span>}
                  </p>
                </div>
              </div>
            </div>

            {targetError && <p className="text-sm text-error">{targetError}</p>}

            <div className="flex items-center gap-3">
              <button type="submit" disabled={targetSaving || portfolioTarget <= 0}
                className="px-6 py-2.5 rounded-full text-sm font-semibold text-on-primary bg-gradient-to-r from-primary to-primary-container hover:scale-105 active:scale-95 transition-all disabled:opacity-60">
                {targetSaving ? "Saving\u2026" : "Update Target"}
              </button>
              <button type="button" onClick={() => setEditing(false)}
                className="px-4 py-2 rounded-full text-sm font-medium text-on-surface-variant hover:bg-surface-container-high transition-all">
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ── Key Metrics Strip ──────────────────────────────────────────── */}
      {savedSummary && !editing && (
        <div className="space-y-4">
          {/* Primary row: plan metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-surface-container-lowest rounded-2xl p-5">
              <p className="text-label-sm font-bold text-on-surface-variant tracking-widest uppercase mb-1">Target</p>
              <p className="text-xl font-extrabold text-on-surface tracking-tight">{formatCurrency(savedSummary.targetAmount)}</p>
            </div>
            <div className="bg-surface-container-lowest rounded-2xl p-5">
              <p className="text-label-sm font-bold text-on-surface-variant tracking-widest uppercase mb-1">Target Age</p>
              <p className="text-xl font-extrabold text-on-surface tracking-tight">{target?.targetAge}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">{savedSummary.years} years away</p>
            </div>
            <div className="bg-surface-container-lowest rounded-2xl p-5">
              <p className="text-label-sm font-bold text-on-surface-variant tracking-widest uppercase mb-1">Monthly</p>
              <p className="text-xl font-extrabold text-primary tracking-tight">{formatFullCurrency(savedSummary.monthly)}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">savings needed</p>
            </div>
            <div className="bg-surface-container-lowest rounded-2xl p-5">
              <p className="text-label-sm font-bold text-on-surface-variant tracking-widest uppercase mb-1">Annual</p>
              <p className="text-xl font-extrabold text-primary tracking-tight">{formatFullCurrency(savedSummary.annual)}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">savings needed</p>
            </div>
          </div>

          {/* Secondary row: current position */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface-container-lowest rounded-2xl p-5">
              <p className="text-label-sm font-bold text-on-surface-variant tracking-widest uppercase mb-1">Net Worth</p>
              <p className={`text-xl font-extrabold tracking-tight ${netWorth >= 0 ? "text-on-surface" : "text-error"}`}>
                {netWorth < 0 ? `-${formatCurrency(Math.abs(netWorth))}` : formatCurrency(netWorth)}
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5">assets minus liabilities</p>
            </div>
            <div className="bg-surface-container-lowest rounded-2xl p-5">
              <p className="text-label-sm font-bold text-on-surface-variant tracking-widest uppercase mb-1">Total Assets</p>
              <p className="text-xl font-extrabold text-secondary tracking-tight">{formatCurrency(totalAssets)}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">{assets.length} account{assets.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="bg-surface-container-lowest rounded-2xl p-5">
              <p className="text-label-sm font-bold text-on-surface-variant tracking-widest uppercase mb-1">Total Liabilities</p>
              <p className={`text-xl font-extrabold tracking-tight ${totalLiabilities > 0 ? "text-error" : "text-on-surface"}`}>
                {totalLiabilities > 0 ? formatCurrency(totalLiabilities) : "$0"}
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5">{debts.length} liabilit{debts.length !== 1 ? "ies" : "y"}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Position Summary (shows without target too) ────────────────── */}
      {!editing && (assets.length > 0 || debts.length > 0) && !savedSummary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-surface-container-lowest rounded-2xl p-5">
            <p className="text-label-sm font-bold text-on-surface-variant tracking-widest uppercase mb-1">Net Worth</p>
            <p className={`text-xl font-extrabold tracking-tight ${netWorth >= 0 ? "text-on-surface" : "text-error"}`}>
              {netWorth < 0 ? `-${formatCurrency(Math.abs(netWorth))}` : formatCurrency(netWorth)}
            </p>
            <p className="text-xs text-on-surface-variant mt-0.5">assets minus liabilities</p>
          </div>
          <div className="bg-surface-container-lowest rounded-2xl p-5">
            <p className="text-label-sm font-bold text-on-surface-variant tracking-widest uppercase mb-1">Total Assets</p>
            <p className="text-xl font-extrabold text-secondary tracking-tight">{formatCurrency(totalAssets)}</p>
            <p className="text-xs text-on-surface-variant mt-0.5">{assets.length} account{assets.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="bg-surface-container-lowest rounded-2xl p-5">
            <p className="text-label-sm font-bold text-on-surface-variant tracking-widest uppercase mb-1">Total Liabilities</p>
            <p className={`text-xl font-extrabold tracking-tight ${totalLiabilities > 0 ? "text-error" : "text-on-surface"}`}>
              {totalLiabilities > 0 ? formatCurrency(totalLiabilities) : "$0"}
            </p>
            <p className="text-xs text-on-surface-variant mt-0.5">{debts.length} liabilit{debts.length !== 1 ? "ies" : "y"}</p>
          </div>
        </div>
      )}

      {/* ── Hero Chart ─────────────────────────────────────────────────── */}
      {savedSummary && !editing && visibleChartData.length > 1 && (
        <section className="bg-surface-container-lowest rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">show_chart</span>
              Savings Trajectory
            </h2>
            <div className="flex items-center gap-2">
              {/* Chart mode toggle */}
              <div className="flex items-center gap-1 bg-surface-container rounded-full p-0.5">
                <button
                  onClick={() => setChartMode("summary")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    chartMode === "summary"
                      ? "bg-surface-container-lowest text-on-surface shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setChartMode("detailed")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    chartMode === "detailed"
                      ? "bg-surface-container-lowest text-on-surface shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Detailed
                </button>
              </div>

              {/* Time range controls */}
              <div className="flex items-center gap-1 bg-surface-container rounded-full p-0.5">
                <button
                  onClick={() => setTimeWindow("focused")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    timeWindow === "focused"
                      ? "bg-surface-container-lowest text-on-surface shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Focused
                </button>
                <div className="relative">
                  {/* Split button: label selects, chevron opens dropdown */}
                  <div className={`flex items-center rounded-full text-xs font-semibold transition-all ${
                    timeWindow === "custom"
                      ? "bg-surface-container-lowest text-on-surface shadow-sm"
                      : "text-on-surface-variant"
                  }`}>
                    <button
                      onClick={() => setTimeWindow("custom")}
                      className="pl-3 pr-1 py-1 hover:text-on-surface transition-colors"
                    >
                      {customYears} Years
                    </button>
                    <button
                      onClick={() => setShowYearMenu((v) => !v)}
                      className="pr-2 py-1 hover:text-on-surface transition-colors"
                    >
                      <span className="material-symbols-outlined text-[13px] leading-none">
                        {showYearMenu ? "expand_less" : "expand_more"}
                      </span>
                    </button>
                  </div>
                  {showYearMenu && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setShowYearMenu(false)} />
                      <div className="absolute top-full right-0 mt-1 z-30 bg-surface-container-lowest rounded-xl shadow-lg overflow-hidden border border-outline-variant/20 min-w-[110px]">
                      {YEAR_RANGE_OPTIONS.map((yr) => (
                        <button
                          key={yr}
                          onClick={() => {
                            setCustomYears(yr);
                            setTimeWindow("custom");
                            setShowYearMenu(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-xs font-semibold transition-colors ${
                            customYears === yr && timeWindow === "custom"
                              ? "bg-primary-fixed text-primary"
                              : "text-on-surface hover:bg-surface-container"
                          }`}
                        >
                          {yr} Years
                        </button>
                      ))}
                    </div>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setTimeWindow("all")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    timeWindow === "all"
                      ? "bg-surface-container-lowest text-on-surface shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Full Plan
                </button>
              </div>
            </div>
          </div>

          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={visibleChartData} margin={{ top: 30, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="planGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#006761" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#006761" stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="assetGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2c6956" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#2c6956" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="liabilityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ba1a1a" stopOpacity={0.10} />
                    <stop offset="95%" stopColor="#ba1a1a" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#96f3e9" stopOpacity={0.55} />
                    <stop offset="95%" stopColor="#96f3e9" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#bdc9c7" strokeOpacity={0.3} />
                <XAxis
                  dataKey="age"
                  tick={{ fill: "#3e4947", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: "Age", position: "insideBottom", offset: -2, fill: "#3e4947", fontSize: 11 }}
                />
                <YAxis
                  tickFormatter={(v: number) => formatCurrency(v)}
                  tick={{ fill: "#3e4947", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const d = payload[0]?.payload as DashboardChartPoint;
                    return (
                      <div className="bg-on-surface rounded-xl px-4 py-3 shadow-lg text-white text-xs space-y-1.5 max-w-xs">
                        <p className="font-semibold">
                          Age {d.age} ({d.year})
                          {d.age === savedSummary.retirementAge && <span className="ml-1 text-tertiary-fixed">Retirement</span>}
                        </p>
                        {d.planValue != null && (
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#006761" }} />
                            <span>Plan: {formatFullCurrency(d.planValue)}</span>
                          </div>
                        )}
                        {d.netWorth != null && (
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#006761", border: "2px solid #96f3e9" }} />
                            <span className="font-semibold">Net Worth: {d.netWorth < 0 ? `-${formatFullCurrency(Math.abs(d.netWorth))}` : formatFullCurrency(d.netWorth)}</span>
                          </div>
                        )}
                        {d.projectedTotal != null && (
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#2c6956" }} />
                            <span>Assets: {formatFullCurrency(d.projectedTotal)}</span>
                          </div>
                        )}
                        {d.liabilityTotal != null && d.liabilityTotal > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ba1a1a" }} />
                            <span>Liabilities: {formatFullCurrency(d.liabilityTotal)}</span>
                          </div>
                        )}
                        {d.planValue != null && d.netWorth != null && d.planValue > 0 && (
                          <div className="border-t border-white/20 pt-1 mt-1">
                            <p className="text-white/70">
                              {d.netWorth >= d.planValue
                                ? `${formatFullCurrency(d.netWorth - d.planValue)} ahead of plan`
                                : `${formatFullCurrency(d.planValue - d.netWorth)} behind plan`}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />

                {/* Retirement age marker */}
                {savedSummary.retirementAge && (
                  <ReferenceLine
                    x={savedSummary.retirementAge}
                    stroke="#805200"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    label={{
                      value: `Retire ${savedSummary.retirementAge}`,
                      position: "insideTopRight",
                      fill: "#805200",
                      fontSize: 11,
                      fontWeight: 700,
                      dy: -10,
                    }}
                  />
                )}

                {/* Today marker */}
                {currentAge && (
                  <ReferenceLine
                    x={currentAge}
                    stroke="#3e4947"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    label={{
                      value: "Today",
                      position: "insideTopLeft",
                      fill: "#3e4947",
                      fontSize: 10,
                      fontWeight: 600,
                      dy: -10,
                    }}
                  />
                )}

                {/* Plan area: always visible */}
                <Area
                  type="monotone"
                  dataKey="planValue"
                  name="Savings Plan"
                  stroke="#006761"
                  strokeWidth={2.5}
                  fill="url(#planGradient)"
                  connectNulls
                />

                {/* Summary mode: Net Worth as an area fill */}
                {chartMode === "summary" && (assets.length > 0 || debts.length > 0) && (
                  <Area
                    type="monotone"
                    dataKey="netWorth"
                    name="Net Worth"
                    stroke="#006761"
                    strokeWidth={2.5}
                    strokeDasharray="0"
                    fill="url(#netWorthGradient)"
                    connectNulls
                    dot={false}
                    activeDot={{ r: 5, fill: "#006761", stroke: "#ffffff", strokeWidth: 2 }}
                  />
                )}

                {/* Detailed mode: individual asset and liability areas */}
                {chartMode === "detailed" && assets.length > 0 && (
                  <Area
                    type="monotone"
                    dataKey="projectedTotal"
                    name="Assets"
                    stroke="#2c6956"
                    strokeWidth={1.5}
                    strokeDasharray="6 3"
                    fill="url(#assetGradient)"
                    connectNulls
                  />
                )}

                {chartMode === "detailed" && debts.length > 0 && (
                  <Area
                    type="monotone"
                    dataKey="liabilityTotal"
                    name="Liabilities"
                    stroke="#ba1a1a"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    fill="url(#liabilityGradient)"
                    connectNulls={false}
                  />
                )}

                {/* Detailed mode: Net Worth as a line on top */}
                {chartMode === "detailed" && (assets.length > 0 || debts.length > 0) && (
                  <Line
                    type="monotone"
                    dataKey="netWorth"
                    name="Net Worth"
                    stroke="#006761"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: "#006761", stroke: "#ffffff", strokeWidth: 2 }}
                    connectNulls
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-on-surface-variant">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span>Savings Plan</span>
            </div>
            {(assets.length > 0 || debts.length > 0) && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" style={{ border: "2px solid #96f3e9" }} />
                <span>Net Worth</span>
              </div>
            )}
            {chartMode === "detailed" && assets.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: "#2c6956" }} />
                <span>Assets</span>
              </div>
            )}
            {chartMode === "detailed" && debts.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: "#ba1a1a" }} />
                <span>Liabilities</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-tertiary" style={{ opacity: 0.6 }} />
              <span>Retirement</span>
            </div>
            <p className="ml-auto text-xs text-on-surface-variant">
              {((target?.expectedReturn ?? 0.07) * 100).toFixed(1)}% return. Projections only.
            </p>
          </div>
        </section>
      )}

      {/* ── No target prompt ───────────────────────────────────────────── */}
      {!target && !editing && (
        <section className="bg-surface-container-lowest rounded-2xl p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-primary-fixed flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-primary text-[28px]">flag</span>
          </div>
          <h2 className="text-title-md font-bold text-on-surface">Set your financial independence target</h2>
          <p className="text-sm text-on-surface-variant max-w-md mx-auto">
            Define how much you need to save and by when. This becomes the benchmark shown on your dashboard chart.
          </p>
          <button
            onClick={startEditing}
            className="px-6 py-2.5 rounded-full text-sm font-semibold text-on-primary bg-gradient-to-r from-primary to-primary-container hover:scale-105 active:scale-95 transition-all"
          >
            Set a Target
          </button>
        </section>
      )}

      {/* ── Asset Cards ────────────────────────────────────────────────── */}
      {!editing && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary-fixed/60 flex items-center justify-center">
                <span className="material-symbols-outlined text-[14px] text-primary">account_balance</span>
              </div>
              Your Assets
            </h2>
            <Link
              href="/assets"
              className="text-xs font-semibold text-primary hover:underline"
            >
              View all
            </Link>
          </div>

          {assets.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-2xl p-6 text-center">
              <p className="text-sm text-on-surface-variant mb-3">No assets yet. Add your first account to start tracking progress against your plan.</p>
              <Link
                href="/assets"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-on-primary bg-gradient-to-r from-primary to-primary-container hover:scale-105 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Add Asset
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {assets.map(({ asset }) => {
                const isInvestment = asset.type === "investment";
                return (
                  <Link
                    key={asset.id}
                    href={`/assets/${asset.id}`}
                    className="group bg-surface-container-lowest rounded-2xl p-5 hover:bg-surface-container-low transition-all"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isInvestment ? "bg-primary-fixed" : "bg-surface-container-high"}`}>
                        <span className={`material-symbols-outlined text-[16px] ${isInvestment ? "text-primary" : "text-on-surface-variant"}`}>
                          {isInvestment ? "trending_up" : "account_balance_wallet"}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold tracking-widest uppercase text-on-surface-variant">
                        {isInvestment ? "Investment" : "Simple"}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-on-surface truncate">{asset.name}</p>
                    <p className="text-lg font-extrabold text-on-surface tracking-tight mt-0.5">
                      {formatCurrency(asset.balance)}
                    </p>
                    {isInvestment && asset.returnRate != null && (
                      <p className="text-xs text-on-surface-variant mt-1">
                        {asset.returnRate}% expected return
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── Liability Cards ────────────────────────────────────────────── */}
      {!editing && debts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-error-container/60 flex items-center justify-center">
                <span className="material-symbols-outlined text-[14px] text-on-error-container">credit_card</span>
              </div>
              Your Liabilities
            </h2>
            <Link
              href="/liabilities"
              className="text-xs font-semibold text-primary hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {debts.map(({ debt }) => {
              const typeConfig: Record<string, { icon: string; label: string }> = {
                simple: { icon: "receipt_long", label: "Simple Debt" },
                mortgage: { icon: "home", label: "Mortgage" },
                auto: { icon: "directions_car", label: "Auto Loan" },
                loan: { icon: "account_balance", label: "Loan" },
                student_loan: { icon: "school", label: "Student Loan" },
                credit_card: { icon: "credit_card", label: "Credit Card" },
                other: { icon: "receipt", label: "Other" },
              };
              const config = typeConfig[debt.type] ?? typeConfig.other;

              return (
                <Link
                  key={debt.id}
                  href={`/liabilities/${debt.id}`}
                  className="group bg-surface-container-lowest rounded-2xl p-5 hover:bg-surface-container-low transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-error-container">
                      <span className="material-symbols-outlined text-[16px] text-on-error-container">
                        {config.icon}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold tracking-widest uppercase text-on-surface-variant">
                      {config.label}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-on-surface truncate">{debt.name}</p>
                  <p className="text-lg font-extrabold text-on-surface tracking-tight mt-0.5">
                    {formatCurrency(debt.balance)}
                  </p>
                  {debt.interestRate != null && debt.interestRate > 0 && (
                    <p className="text-xs text-on-surface-variant mt-1">
                      {debt.interestRate}% interest
                      {debt.minimumPayment ? ` \u00b7 ${formatFullCurrency(debt.minimumPayment)}/mo` : ""}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
