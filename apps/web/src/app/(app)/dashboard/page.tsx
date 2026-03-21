"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import type { User, RetirementTarget, TargetMode } from "@/types";

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

export default function DashboardPage() {
  const { data: session } = useSession();

  const [user, setUser] = useState<User | null>(null);
  const [target, setTarget] = useState<RetirementTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  // Onboarding form
  const [obDob, setObDob] = useState("");
  const [obAge, setObAge] = useState("");
  const [obSaving, setObSaving] = useState(false);
  const [obDone, setObDone] = useState(false);

  // Target configurator form
  const [mode, setMode] = useState<TargetMode>("fixed");
  const [fixedAmount, setFixedAmount] = useState("");
  const [targetAge, setTargetAge] = useState("");
  const [annualIncome, setAnnualIncome] = useState("");
  const [withdrawalRate, setWithdrawalRate] = useState("4");
  const [expectedReturn, setExpectedReturn] = useState("7");
  const [includeInflation, setIncludeInflation] = useState(false);
  const [inflationRate, setInflationRate] = useState("3");
  const [targetSaving, setTargetSaving] = useState(false);
  const [targetError, setTargetError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [u, t] = await Promise.all([
        apiClient.get<User>("/api/users/me"),
        apiClient.get<RetirementTarget | null>("/api/retirement-target"),
      ]);
      setUser(u);
      setTarget(t);

      if (t) {
        setMode(t.mode);
        setFixedAmount(t.mode === "fixed" ? String(t.targetAmount) : "");
        setTargetAge(String(t.targetAge));
        setAnnualIncome(t.annualIncome != null ? String(t.annualIncome) : "");
        setWithdrawalRate(String((t.withdrawalRate ?? 0.04) * 100));
        setExpectedReturn(String((t.expectedReturn ?? 0.07) * 100));
        setIncludeInflation(t.includeInflation);
        setInflationRate(String((t.inflationRate ?? 0.03) * 100));
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user) loadData();
  }, [session, loadData]);

  const needsOnboarding = user && !obDone && (!user.dateOfBirth || user.retirementAge == null);

  async function saveOnboarding(e: React.FormEvent) {
    e.preventDefault();
    if (!obDob || !obAge) return;
    setObSaving(true);
    try {
      await apiClient.patch("/api/users/me", {
        dateOfBirth: obDob,
        retirementAge: Number(obAge),
      });
      setUser((u) => u ? { ...u, dateOfBirth: obDob, retirementAge: Number(obAge) } : u);
      setObDone(true);
      if (!targetAge) setTargetAge(obAge);
    } catch {
      /* ignore */
    } finally {
      setObSaving(false);
    }
  }

  // Live calculations
  const currentAge = user?.dateOfBirth ? calculateAge(user.dateOfBirth) : null;
  const tAge = Number(targetAge) || 0;
  const yearsRemaining = currentAge != null ? tAge - currentAge : null;

  const portfolioTarget = useMemo(() => {
    if (mode === "fixed") {
      return Number(fixedAmount) || 0;
    }
    const income = Number(annualIncome) || 0;
    const wr = (Number(withdrawalRate) || 4) / 100;
    if (wr === 0) return 0;
    return income / wr;
  }, [mode, fixedAmount, annualIncome, withdrawalRate]);

  const inflationAdjustedTarget = useMemo(() => {
    if (!includeInflation || !yearsRemaining || yearsRemaining <= 0) return portfolioTarget;
    const rate = (Number(inflationRate) || 3) / 100;
    return portfolioTarget * Math.pow(1 + rate, yearsRemaining);
  }, [portfolioTarget, includeInflation, inflationRate, yearsRemaining]);

  const monthlySavings = useMemo(() => {
    if (!yearsRemaining || yearsRemaining <= 0) return 0;
    const ret = (Number(expectedReturn) || 7) / 100;
    return calculateMonthlySavings(inflationAdjustedTarget, ret, yearsRemaining);
  }, [inflationAdjustedTarget, expectedReturn, yearsRemaining]);

  const annualSavings = monthlySavings * 12;

  async function saveTarget(e: React.FormEvent) {
    e.preventDefault();
    setTargetError("");

    const tAmt = inflationAdjustedTarget;
    if (tAmt <= 0) {
      setTargetError("Please enter a valid target amount.");
      return;
    }
    if (tAge < 1 || tAge > 120) {
      setTargetError("Target age must be between 1 and 120.");
      return;
    }
    if (yearsRemaining != null && yearsRemaining <= 0) {
      setTargetError("Target age must be greater than your current age.");
      return;
    }

    setTargetSaving(true);
    try {
      const saved = await apiClient.put<RetirementTarget>("/api/retirement-target", {
        mode,
        targetAmount: tAmt,
        targetAge: tAge,
        annualIncome: mode === "income_replacement" ? Number(annualIncome) || null : null,
        withdrawalRate: (Number(withdrawalRate) || 4) / 100,
        expectedReturn: (Number(expectedReturn) || 7) / 100,
        inflationRate: (Number(inflationRate) || 3) / 100,
        includeInflation,
      });
      setTarget(saved);
      setEditing(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save target";
      setTargetError(msg);
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
      setWithdrawalRate(String((target.withdrawalRate ?? 0.04) * 100));
      setExpectedReturn(String((target.expectedReturn ?? 0.07) * 100));
      setIncludeInflation(target.includeInflation);
      setInflationRate(String((target.inflationRate ?? 0.03) * 100));
    }
    setEditing(true);
  }

  // Summary calculations for saved target
  const savedSummary = useMemo(() => {
    if (!target || !currentAge) return null;
    const years = target.targetAge - currentAge;
    if (years <= 0) return null;
    const monthly = calculateMonthlySavings(
      target.targetAmount,
      target.expectedReturn ?? 0.07,
      years,
    );
    return { years, monthly, annual: monthly * 12 };
  }, [target, currentAge]);

  const showConfigurator = !target || editing;
  const firstName = user?.name?.split(" ")[0] ?? "there";

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <span className="material-symbols-outlined text-primary animate-spin text-[32px]">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      {/* Page header */}
      <div>
        <p className="text-label-sm font-semibold text-on-surface-variant tracking-widest uppercase mb-1">Dashboard</p>
        <h1 className="text-headline-lg font-extrabold text-on-surface tracking-tight">
          Hey {firstName}
        </h1>
      </div>

      {/* Onboarding card */}
      {needsOnboarding && (
        <section className="bg-tertiary-fixed rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/40 flex items-center justify-center">
              <span className="material-symbols-outlined text-on-tertiary-fixed-variant text-[20px]">cake</span>
            </div>
            <div>
              <h2 className="text-title-md font-bold text-on-tertiary-fixed-variant">Two quick things before we start</h2>
              <p className="text-sm text-on-tertiary-fixed-variant/80">We use these to calculate how many years you have to reach your goal</p>
            </div>
          </div>

          <form onSubmit={saveOnboarding} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-on-tertiary-fixed-variant mb-2">Your birthday</label>
                <input
                  type="date"
                  value={obDob}
                  onChange={(e) => setObDob(e.target.value)}
                  required
                  className="w-full bg-white/60 rounded-2xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:bg-white focus:ring-1 focus:ring-tertiary transition-all"
                />
                <p className="text-xs text-on-tertiary-fixed-variant/70 mt-1.5">Used to calculate years until your goal. Never shared.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-on-tertiary-fixed-variant mb-2">Age you&apos;d like to retire</label>
                <input
                  type="number"
                  min={20}
                  max={100}
                  value={obAge}
                  onChange={(e) => setObAge(e.target.value)}
                  placeholder="e.g. 65"
                  required
                  className="w-full bg-white/60 rounded-2xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-white focus:ring-1 focus:ring-tertiary transition-all"
                />
                <p className="text-xs text-on-tertiary-fixed-variant/70 mt-1.5">You can change this anytime in Settings</p>
              </div>
            </div>
            <button
              type="submit"
              disabled={obSaving || !obDob || !obAge}
              className="px-6 py-2.5 rounded-full text-sm font-semibold text-white bg-on-tertiary-fixed-variant hover:scale-105 active:scale-95 transition-all disabled:opacity-60"
            >
              {obSaving ? "Saving…" : "Let's build my plan →"}
            </button>
          </form>
        </section>
      )}

      {/* Financial Independence Target */}
      <section className="bg-surface-container-lowest rounded-2xl p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[20px]">flag</span>
            </div>
            <div>
              <h2 className="text-title-md font-bold text-on-surface">Financial Independence Target</h2>
              <p className="text-sm text-on-surface-variant">Figure out how much you need to save and what it takes to get there</p>
            </div>
          </div>
          {target && !editing && (
            <button
              onClick={startEditing}
              className="px-4 py-2 rounded-full text-sm font-medium text-primary hover:bg-primary-fixed/40 transition-all"
            >
              Edit
            </button>
          )}
        </div>

        {/* Configurator */}
        {showConfigurator && (
          <form onSubmit={saveTarget} className="space-y-6">

            {/* Mode selector */}
            <div>
              <p className="text-sm font-semibold text-on-surface mb-3">How do you think about your goal?</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  {
                    id: "fixed" as TargetMode,
                    icon: "savings",
                    title: "I know my number",
                    desc: 'I have a specific total in mind, like "I want $2 million saved."',
                  },
                  {
                    id: "income_replacement" as TargetMode,
                    icon: "paid",
                    title: "I know my lifestyle",
                    desc: 'I know how much I want to spend in retirement, like "$80,000/year."',
                  },
                ] as const).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMode(opt.id)}
                    className={`text-left p-4 rounded-2xl transition-all ${
                      mode === opt.id
                        ? "bg-primary-fixed"
                        : "bg-surface-container-high hover:bg-surface-container"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`material-symbols-outlined text-[18px] ${mode === opt.id ? "text-primary" : "text-on-surface-variant"}`}>
                        {opt.icon}
                      </span>
                      <span className={`text-sm font-bold ${mode === opt.id ? "text-primary" : "text-on-surface"}`}>
                        {opt.title}
                      </span>
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
                  <label className="block text-sm font-semibold text-on-surface mb-2">
                    How much do you want to have saved?
                  </label>
                  <input
                    type="number"
                    min={1}
                    step="any"
                    value={fixedAmount}
                    onChange={(e) => setFixedAmount(e.target.value)}
                    placeholder="e.g. 2000000"
                    className={INPUT_CLASS}
                  />
                  <FieldHint>
                    Your total investment portfolio target: retirement accounts, index funds, brokerage, etc.
                    Common targets: <strong>$1M</strong> (lean), <strong>$2M</strong> (comfortable), <strong>$3M+</strong> (abundant).
                    Not sure? Try <em>I know my lifestyle</em> mode.
                  </FieldHint>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-on-surface mb-2">
                      How much would you like to spend per year in retirement?
                    </label>
                    <input
                      type="number"
                      min={1}
                      step="any"
                      value={annualIncome}
                      onChange={(e) => setAnnualIncome(e.target.value)}
                      placeholder="e.g. 80000"
                      className={INPUT_CLASS}
                    />
                    <FieldHint>
                      Annual budget in retirement. Think housing, food, healthcare, travel, hobbies.
                    US median: ~$60k/year. Comfortable lifestyle: $80–120k/year.
                    </FieldHint>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-on-surface mb-2 flex items-center">
                      Safe withdrawal rate (%)
                      <InfoTooltip>
                        The percentage of your portfolio you withdraw each year. The widely accepted "4% rule" means your savings should last 30+ years without running out. Lower = more conservative and more savings needed. Higher = more risk.
                      </InfoTooltip>
                    </label>
                    <input
                      type="number"
                      min={0.5}
                      max={20}
                      step="0.1"
                      value={withdrawalRate}
                      onChange={(e) => setWithdrawalRate(e.target.value)}
                      className={INPUT_CLASS}
                    />
                    <FieldHint>
                      At <strong>4%</strong> (the recommended default): $80k/year needs <strong>$2,000,000</strong> saved.
                      At 3%: needs $2.67M. At 5%: needs $1.6M.
                    </FieldHint>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-on-surface mb-2">
                    At what age do you want to reach this goal?
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={targetAge}
                    onChange={(e) => setTargetAge(e.target.value)}
                    placeholder="e.g. 65"
                    className={INPUT_CLASS}
                  />
                  <FieldHint>The age you want to be financially independent. Doesn&apos;t have to be when you stop working.</FieldHint>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-on-surface mb-2 flex items-center">
                    Expected annual return (%)
                    <InfoTooltip>
                      How much you expect your investments to grow each year. Historically, a diversified index fund portfolio has returned ~7% annually after inflation. Conservative estimate: 5–6%. Optimistic: 8–9%.
                    </InfoTooltip>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    step="0.1"
                    value={expectedReturn}
                    onChange={(e) => setExpectedReturn(e.target.value)}
                    className={INPUT_CLASS}
                  />
                  <FieldHint>Default is 7%, the long-term average for a diversified stock portfolio.</FieldHint>
                </div>
              </div>

              {/* Inflation toggle */}
              <div className="bg-surface-container rounded-2xl p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={includeInflation}
                    onClick={() => setIncludeInflation(!includeInflation)}
                    className={`mt-0.5 flex-shrink-0 relative w-11 h-6 rounded-full transition-colors ${
                      includeInflation ? "bg-primary" : "bg-surface-container-highest"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                        includeInflation ? "translate-x-5" : ""
                      }`}
                    />
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">Account for inflation</p>
                    <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                      Prices rise over time. $1M today buys less in 20 years. Recommended for goals 10+ years out.
                    </p>
                  </div>
                </div>
                {includeInflation && (
                  <div className="max-w-48 pl-14">
                    <label className="block text-sm font-semibold text-on-surface mb-2 flex items-center">
                      Inflation rate (%)
                      <InfoTooltip>
                        The expected annual rise in the cost of goods and services. The US long-term average is ~3%. The Fed targets 2%.
                      </InfoTooltip>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      step="0.1"
                      value={inflationRate}
                      onChange={(e) => setInflationRate(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Live summary */}
            <div className="bg-surface-container-low rounded-2xl p-6 space-y-4">
              <div>
                <p className="text-label-sm font-bold text-on-surface-variant tracking-widest uppercase">Your plan at a glance</p>
                <p className="text-xs text-on-surface-variant mt-0.5">Updates live as you fill in the fields above</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-on-surface-variant mb-0.5">Portfolio Target</p>
                  <p className="text-2xl font-extrabold text-on-surface tracking-tight">
                    {inflationAdjustedTarget > 0 ? formatCurrency(inflationAdjustedTarget) : <span className="text-outline-variant">-</span>}
                  </p>
                  {includeInflation && inflationAdjustedTarget > 0 && inflationAdjustedTarget !== portfolioTarget && (
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {formatCurrency(portfolioTarget)} in today&apos;s dollars
                    </p>
                  )}
                  <p className="text-xs text-on-surface-variant mt-0.5">Total you need invested</p>
                </div>
                <div>
                  <p className="text-sm text-on-surface-variant mb-0.5">Years Remaining</p>
                  <p className="text-2xl font-extrabold text-on-surface tracking-tight">
                    {yearsRemaining != null && yearsRemaining > 0 ? yearsRemaining : <span className="text-outline-variant">-</span>}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {currentAge != null && tAge > 0 && yearsRemaining != null && yearsRemaining > 0
                      ? `Age ${currentAge} → Age ${tAge}`
                      : "Enter your age and target above"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-on-surface-variant mb-0.5">Monthly Savings Needed</p>
                  <p className="text-2xl font-extrabold text-primary tracking-tight">
                    {monthlySavings > 0 ? formatFullCurrency(monthlySavings) : <span className="text-outline-variant">-</span>}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-0.5">What to set aside each month</p>
                </div>
                <div>
                  <p className="text-sm text-on-surface-variant mb-0.5">Annual Savings Needed</p>
                  <p className="text-2xl font-extrabold text-primary tracking-tight">
                    {annualSavings > 0 ? formatFullCurrency(annualSavings) : <span className="text-outline-variant">-</span>}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Per year total</p>
                </div>
              </div>
              {yearsRemaining != null && yearsRemaining > 0 && monthlySavings > 0 && (
                <p className="text-xs text-on-surface-variant border-t border-outline-variant/20 pt-3">
                  Based on a <strong>{expectedReturn}%</strong> annual return over <strong>{yearsRemaining} years</strong>
                  {includeInflation ? `, adjusted for ${inflationRate}% annual inflation` : ""}.
                  Projections only. Actual results will vary.
                </p>
              )}
            </div>

            {targetError && <p className="text-sm text-error">{targetError}</p>}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={targetSaving || portfolioTarget <= 0}
                className="px-6 py-2.5 rounded-full text-sm font-semibold text-on-primary bg-gradient-to-r from-primary to-primary-container hover:scale-105 active:scale-95 transition-all disabled:opacity-60"
              >
                {targetSaving ? "Saving…" : target ? "Update Target" : "Save my target"}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 rounded-full text-sm font-medium text-on-surface-variant hover:bg-surface-container-high transition-all"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}

        {/* Static summary card */}
        {target && !editing && savedSummary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-surface-container-low rounded-2xl p-5">
              <p className="text-label-sm font-bold text-on-surface-variant tracking-widest uppercase mb-1">Target</p>
              <p className="text-xl font-extrabold text-on-surface tracking-tight">{formatCurrency(target.targetAmount)}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {target.mode === "income_replacement" ? "Income Replacement" : "Fixed Amount"}
              </p>
            </div>
            <div className="bg-surface-container-low rounded-2xl p-5">
              <p className="text-label-sm font-bold text-on-surface-variant tracking-widest uppercase mb-1">Target Age</p>
              <p className="text-xl font-extrabold text-on-surface tracking-tight">{target.targetAge}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">{savedSummary.years} years away</p>
            </div>
            <div className="bg-surface-container-low rounded-2xl p-5">
              <p className="text-label-sm font-bold text-on-surface-variant tracking-widest uppercase mb-1">Monthly</p>
              <p className="text-xl font-extrabold text-primary tracking-tight">{formatFullCurrency(savedSummary.monthly)}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">savings needed</p>
            </div>
            <div className="bg-surface-container-low rounded-2xl p-5">
              <p className="text-label-sm font-bold text-on-surface-variant tracking-widest uppercase mb-1">Annual</p>
              <p className="text-xl font-extrabold text-primary tracking-tight">{formatCurrency(savedSummary.annual)}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">savings needed</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
