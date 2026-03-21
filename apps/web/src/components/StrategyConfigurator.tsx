"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  STRATEGY_LIST,
  calculateStartingMonthly,
  getStrategyDefaults,
  getScheduleWithOverride,
  getFinalValue,
  type SavingsStrategy,
  type StrategyParams,
  type YearlyDataPoint,
} from "@/lib/retirement-strategies";

// ─── Shared formatting ──────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
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

// ─── Sub-components ─────────────────────────────────────────────────────────

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

function SliderInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  prefix,
  tooltip,
  onReset,
  defaultValue,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  prefix?: string;
  tooltip?: string;
  onReset?: () => void;
  defaultValue?: number;
  hint?: string;
}) {
  const showReset = onReset && defaultValue != null && Math.abs(value - defaultValue) > step * 0.5;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-on-surface-variant flex items-center">
          {label}
          {tooltip && <InfoTooltip>{tooltip}</InfoTooltip>}
        </label>
        {showReset && (
          <button
            type="button"
            onClick={onReset}
            className="text-[10px] font-medium text-primary hover:text-primary-container transition-colors flex items-center gap-0.5"
          >
            <span className="material-symbols-outlined text-[12px]">restart_alt</span>
            Reset
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-2 rounded-full appearance-none bg-surface-container-highest cursor-pointer accent-primary"
        />
        <div className="relative w-24 flex-shrink-0">
          {prefix && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant">
              {prefix}
            </span>
          )}
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={Math.round(value * (suffix === "%" ? 100 : 1)) / (suffix === "%" ? 100 : 1)}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v >= min && v <= max) onChange(v);
            }}
            className={`w-full bg-surface-container-high rounded-xl py-2 text-center text-sm font-bold text-on-surface focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary transition-all ${
              prefix ? "pl-6 pr-8" : suffix ? "pr-8" : ""
            }`}
          />
          {suffix && (
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant">
              {suffix}
            </span>
          )}
        </div>
      </div>
      {hint && <p className="text-[11px] text-on-surface-variant leading-relaxed">{hint}</p>}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export interface StrategyConfig {
  strategy: SavingsStrategy;
  phase1Monthly: number;
  phase1Years: number;
  phase2Monthly: number;
  annualChangeRate: number;
}

interface StrategyConfiguratorProps {
  strategy: SavingsStrategy;
  targetAmount: number;
  years: number;
  annualReturn: number;
  inflationRate: number;
  currentAge: number;
  retirementAge: number;
  onConfigChange: (config: StrategyConfig) => void;
  onBack: () => void;
}

const CURRENT_YEAR = new Date().getFullYear();

export default function StrategyConfigurator({
  strategy,
  targetAmount,
  years,
  annualReturn,
  inflationRate,
  currentAge,
  retirementAge,
  onConfigChange,
  onBack,
}: StrategyConfiguratorProps) {
  const meta = STRATEGY_LIST.find((s) => s.id === strategy)!;

  // Calculate defaults for this strategy
  const defaults = useMemo(
    () => getStrategyDefaults(targetAmount, years, annualReturn),
    [targetAmount, years, annualReturn]
  );

  // Auto-calculate starting monthly for the current strategy
  const autoStartMonthly = useMemo(() => {
    return calculateStartingMonthly({
      strategy,
      targetAmount,
      years,
      annualReturn,
      annualChangeRate: defaults.annualChangeRate,
      phase1Years: defaults.phase1Years,
      phase2Monthly: defaults.phase2Monthly,
    });
  }, [strategy, targetAmount, years, annualReturn, defaults]);

  // State for user-adjustable parameters
  const [phase1Monthly, setPhase1Monthly] = useState(Math.round(autoStartMonthly));
  const [phase1Years, setPhase1Years] = useState(defaults.phase1Years);
  const [phase2Monthly, setPhase2Monthly] = useState(defaults.phase2Monthly);
  const [annualChangeRate, setAnnualChangeRate] = useState(
    Math.round(defaults.annualChangeRate * 100)
  );

  // Recalculate when strategy changes
  const [prevStrategy, setPrevStrategy] = useState(strategy);
  if (strategy !== prevStrategy) {
    setPrevStrategy(strategy);
    const newAuto = calculateStartingMonthly({
      strategy,
      targetAmount,
      years,
      annualReturn,
      annualChangeRate: defaults.annualChangeRate,
      phase1Years: defaults.phase1Years,
      phase2Monthly: defaults.phase2Monthly,
    });
    setPhase1Monthly(Math.round(newAuto));
    setPhase1Years(defaults.phase1Years);
    setPhase2Monthly(defaults.phase2Monthly);
    setAnnualChangeRate(Math.round(defaults.annualChangeRate * 100));
  }

  // Build strategy params from current state
  const strategyParams: StrategyParams = useMemo(
    () => ({
      strategy,
      targetAmount,
      years,
      annualReturn,
      annualChangeRate: annualChangeRate / 100,
      phase1Years,
      phase2Monthly,
    }),
    [strategy, targetAmount, years, annualReturn, annualChangeRate, phase1Years, phase2Monthly]
  );

  // Generate chart data with current phase1Monthly
  const scheduleData = useMemo(
    () => getScheduleWithOverride(strategyParams, phase1Monthly, currentAge, CURRENT_YEAR),
    [strategyParams, phase1Monthly, currentAge]
  );

  // Calculate where the portfolio ends up with current settings
  const finalPortfolioValue = useMemo(
    () => getFinalValue(strategyParams, phase1Monthly),
    [strategyParams, phase1Monthly]
  );

  const onTrack = finalPortfolioValue >= targetAmount * 0.95;
  const surplusDeficit = finalPortfolioValue - targetAmount;

  // Emit config changes
  const emitConfig = useCallback(() => {
    onConfigChange({
      strategy,
      phase1Monthly,
      phase1Years,
      phase2Monthly,
      annualChangeRate: annualChangeRate / 100,
    });
  }, [strategy, phase1Monthly, phase1Years, phase2Monthly, annualChangeRate, onConfigChange]);

  // Reset to defaults
  const resetAll = useCallback(() => {
    setPhase1Monthly(Math.round(autoStartMonthly));
    setPhase1Years(defaults.phase1Years);
    setPhase2Monthly(defaults.phase2Monthly);
    setAnnualChangeRate(Math.round(defaults.annualChangeRate * 100));
  }, [autoStartMonthly, defaults]);

  // Max slider values
  const maxMonthly = Math.max(Math.round(autoStartMonthly * 3), 20000);
  const maxPhase2 = Math.max(Math.round(defaults.traditionalMonthly * 2), 5000);

  // Contribution schedule summary
  const lastDataPoint = scheduleData[scheduleData.length - 1];
  const firstYearContribution = scheduleData.length > 1 ? scheduleData[1]?.monthlyContribution ?? 0 : 0;
  const lastYearContribution = lastDataPoint?.monthlyContribution ?? 0;

  return (
    <div className="space-y-6">
      {/* Strategy header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-[20px]">{meta.icon}</span>
          </div>
          <div>
            <h2 className="text-title-md font-bold text-on-surface">{meta.name}</h2>
            <p className="text-sm text-on-surface-variant">{meta.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetAll}
            className="px-3 py-1.5 rounded-full text-xs font-medium text-on-surface-variant hover:bg-surface-container-high transition-all flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">restart_alt</span>
            Reset all
          </button>
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-1.5 rounded-full text-xs font-medium text-primary hover:bg-primary-fixed/40 transition-all flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
            Change strategy
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Controls */}
        <div className="lg:col-span-2 space-y-5">
          {/* Strategy-specific sliders */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">tune</span>
                Strategy Controls
              </h3>
            </div>

            {/* Starting monthly contribution (all strategies except traditional) */}
            {strategy !== "traditional" && (
              <SliderInput
                label={
                  strategy === "coast_fire" || strategy === "barista_fire"
                    ? "Phase 1 monthly savings"
                    : "Starting monthly savings"
                }
                value={phase1Monthly}
                onChange={setPhase1Monthly}
                min={100}
                max={maxMonthly}
                step={50}
                prefix="$"
                tooltip={
                  strategy === "front_loaded"
                    ? "Your monthly contribution in year 1. This amount decreases each year by the change rate below."
                    : strategy === "coast_fire"
                    ? "Monthly contribution during the aggressive accumulation phase. After this phase, contributions drop to $0."
                    : strategy === "barista_fire"
                    ? "Monthly contribution during the aggressive accumulation phase. After this phase, you switch to the reduced amount below."
                    : "Your monthly contribution in year 1. This amount increases each year by the change rate below."
                }
                onReset={() => setPhase1Monthly(Math.round(autoStartMonthly))}
                defaultValue={Math.round(autoStartMonthly)}
                hint={`Auto-calculated: ${formatFullCurrency(Math.round(autoStartMonthly))}/mo to reach your goal`}
              />
            )}

            {/* Traditional: show calculated amount (read-only style) */}
            {strategy === "traditional" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-on-surface-variant flex items-center">
                  Monthly savings
                  <InfoTooltip>
                    With the traditional approach, you save the same amount every month. This is calculated using the PMT formula based on your target, return rate, and timeline.
                  </InfoTooltip>
                </label>
                <div className="bg-surface-container-high rounded-xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-primary tracking-tight">
                    {formatFullCurrency(Math.round(autoStartMonthly))}
                    <span className="text-sm font-medium text-on-surface-variant">/mo</span>
                  </p>
                  <p className="text-[11px] text-on-surface-variant mt-1">
                    Same amount every month for {years} years
                  </p>
                </div>
              </div>
            )}

            {/* Phase 1 duration (coast/barista) */}
            {(strategy === "coast_fire" || strategy === "barista_fire") && (
              <SliderInput
                label="Aggressive phase duration"
                value={phase1Years}
                onChange={(v) => {
                  setPhase1Years(v);
                  // Recalculate phase1 monthly for new duration
                  const newAuto = calculateStartingMonthly({
                    strategy,
                    targetAmount,
                    years,
                    annualReturn,
                    phase1Years: v,
                    phase2Monthly: strategy === "barista_fire" ? phase2Monthly : 0,
                  });
                  setPhase1Monthly(Math.round(newAuto));
                }}
                min={2}
                max={Math.max(3, years - 2)}
                step={1}
                suffix="yrs"
                tooltip={
                  strategy === "coast_fire"
                    ? "How many years you save aggressively before stopping entirely. After this, compound growth carries your portfolio to the goal."
                    : "How many years you save aggressively before switching to reduced contributions."
                }
                onReset={() => {
                  setPhase1Years(defaults.phase1Years);
                  setPhase1Monthly(Math.round(autoStartMonthly));
                }}
                defaultValue={defaults.phase1Years}
                hint={`After ${phase1Years} years, you'll be age ${currentAge + phase1Years}`}
              />
            )}

            {/* Phase 2 monthly (barista only) */}
            {strategy === "barista_fire" && (
              <SliderInput
                label="Reduced phase monthly savings"
                value={phase2Monthly}
                onChange={(v) => {
                  setPhase2Monthly(v);
                  const newAuto = calculateStartingMonthly({
                    strategy,
                    targetAmount,
                    years,
                    annualReturn,
                    phase1Years,
                    phase2Monthly: v,
                  });
                  setPhase1Monthly(Math.round(newAuto));
                }}
                min={0}
                max={maxPhase2}
                step={25}
                prefix="$"
                tooltip="Monthly contribution after the aggressive phase ends. This is the lower amount you maintain for the remaining years."
                onReset={() => {
                  setPhase2Monthly(defaults.phase2Monthly);
                  setPhase1Monthly(Math.round(autoStartMonthly));
                }}
                defaultValue={defaults.phase2Monthly}
                hint="Consider what you'd contribute from part-time or passion work"
              />
            )}

            {/* Annual change rate (front-loaded / back-loaded) */}
            {(strategy === "front_loaded" || strategy === "back_loaded") && (
              <SliderInput
                label={strategy === "front_loaded" ? "Annual decrease rate" : "Annual increase rate"}
                value={annualChangeRate}
                onChange={(v) => {
                  setAnnualChangeRate(v);
                  const newAuto = calculateStartingMonthly({
                    strategy,
                    targetAmount,
                    years,
                    annualReturn,
                    annualChangeRate: v / 100,
                  });
                  setPhase1Monthly(Math.round(newAuto));
                }}
                min={1}
                max={20}
                step={1}
                suffix="%"
                tooltip={
                  strategy === "front_loaded"
                    ? "How much your monthly contribution decreases each year. Higher rate means more savings upfront and a steeper decline."
                    : "How much your monthly contribution increases each year. Higher rate means lower starting amount but steeper ramp-up."
                }
                onReset={() => {
                  setAnnualChangeRate(Math.round(defaults.annualChangeRate * 100));
                  setPhase1Monthly(Math.round(autoStartMonthly));
                }}
                defaultValue={Math.round(defaults.annualChangeRate * 100)}
                hint={
                  strategy === "front_loaded"
                    ? `At ${annualChangeRate}%, year 1 is ${formatFullCurrency(phase1Monthly)}/mo, year ${years} is ~${formatFullCurrency(Math.round(phase1Monthly * Math.pow(1 - annualChangeRate / 100, years - 1)))}/mo`
                    : `At ${annualChangeRate}%, year 1 is ${formatFullCurrency(phase1Monthly)}/mo, year ${years} is ~${formatFullCurrency(Math.round(phase1Monthly * Math.pow(1 + annualChangeRate / 100, years - 1)))}/mo`
                }
              />
            )}
          </div>

          {/* Assumptions */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 space-y-3">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">settings</span>
              Assumptions
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-container-low rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-on-surface">{(annualReturn * 100).toFixed(1)}%</p>
                <p className="text-[10px] text-on-surface-variant">Expected return</p>
              </div>
              <div className="bg-surface-container-low rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-on-surface">{(inflationRate * 100).toFixed(1)}%</p>
                <p className="text-[10px] text-on-surface-variant">Inflation rate</p>
              </div>
            </div>
            <p className="text-[11px] text-on-surface-variant">
              You can adjust these in the previous step or later in Settings.
            </p>
          </div>
        </div>

        {/* Right: Chart + Summary */}
        <div className="lg:col-span-3 space-y-5">
          {/* Chart */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">show_chart</span>
                Your projection
              </h3>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={scheduleData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="configGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#006761" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#006761" stopOpacity={0.05} />
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
                    yAxisId="portfolio"
                    tickFormatter={(v: number) => formatCurrency(v)}
                    tick={{ fill: "#3e4947", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={70}
                  />
                  <YAxis
                    yAxisId="contribution"
                    orientation="right"
                    tickFormatter={(v: number) => formatCurrency(v)}
                    tick={{ fill: "#805200", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                  />
                  <RechartsTooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const data = payload[0]?.payload as YearlyDataPoint;
                      return (
                        <div className="bg-on-surface rounded-xl px-4 py-3 shadow-lg text-white text-xs space-y-1.5">
                          <p className="font-semibold">Age {label} ({data.year})</p>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <span>Portfolio: {formatFullCurrency(data.portfolioValue)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-tertiary" />
                            <span>Monthly contribution: {formatFullCurrency(data.monthlyContribution)}</span>
                          </div>
                          <div className="border-t border-white/20 pt-1 mt-1 space-y-0.5">
                            <p className="text-white/70">Total contributed: {formatFullCurrency(data.cumulativeContributions)}</p>
                            <p className="text-white/70">Growth earned: {formatFullCurrency(data.cumulativeGrowth)}</p>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={30}
                    formatter={(value: string) => (
                      <span className="text-xs text-on-surface-variant">{value}</span>
                    )}
                  />
                  <Area
                    yAxisId="portfolio"
                    type="monotone"
                    dataKey="portfolioValue"
                    name="Portfolio value"
                    stroke="#006761"
                    strokeWidth={2}
                    fill="url(#configGradient)"
                  />
                  <Line
                    yAxisId="contribution"
                    type="stepAfter"
                    dataKey="monthlyContribution"
                    name="Monthly contribution"
                    stroke="#805200"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Target comparison */}
            <div
              className={`rounded-xl p-3 flex items-center gap-3 ${
                onTrack ? "bg-secondary-fixed/30" : "bg-error-container/30"
              }`}
            >
              <span
                className={`material-symbols-outlined text-[18px] ${
                  onTrack ? "text-secondary" : "text-error"
                }`}
              >
                {onTrack ? "check_circle" : "warning"}
              </span>
              <div className="flex-1">
                <p className={`text-xs font-semibold ${onTrack ? "text-secondary" : "text-on-error-container"}`}>
                  {onTrack
                    ? `On track: portfolio reaches ${formatCurrency(finalPortfolioValue)} at age ${retirementAge}`
                    : `Under target by ${formatCurrency(Math.abs(surplusDeficit))}`}
                </p>
                <p className="text-[11px] text-on-surface-variant">
                  Target: {formatCurrency(targetAmount)}
                  {!onTrack && ". Increase your contributions or adjust the strategy parameters."}
                </p>
              </div>
            </div>
          </div>

          {/* Live summary */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 space-y-4">
            <p className="text-label-sm font-bold text-on-surface-variant tracking-widest uppercase">
              Plan Summary
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-container-low rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-primary tracking-tight">
                  {formatFullCurrency(firstYearContribution)}
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {strategy === "traditional" ? "monthly, every month" : "year 1 monthly"}
                </p>
              </div>
              <div className="bg-surface-container-low rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-on-surface tracking-tight">
                  {strategy === "traditional"
                    ? formatFullCurrency(firstYearContribution)
                    : formatFullCurrency(lastYearContribution)}
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {strategy === "coast_fire"
                    ? `after year ${phase1Years}`
                    : strategy === "barista_fire"
                    ? "reduced phase monthly"
                    : strategy === "traditional"
                    ? "monthly (same)"
                    : "final year monthly"}
                </p>
              </div>
              <div className="bg-surface-container-low rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-on-surface tracking-tight">
                  {formatCurrency(finalPortfolioValue)}
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5">projected total</p>
              </div>
              <div className="bg-surface-container-low rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-on-surface tracking-tight">
                  {currentAge} → {retirementAge}
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5">{years} years</p>
              </div>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              <span className="material-symbols-outlined text-[12px] align-middle mr-0.5">info</span>
              Based on {(annualReturn * 100).toFixed(1)}% annual return and {(inflationRate * 100).toFixed(1)}% inflation.
              These are projections, not guarantees. You can refine these numbers anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
