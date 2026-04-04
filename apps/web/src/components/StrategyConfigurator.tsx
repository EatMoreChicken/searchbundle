"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
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
  Legend,
} from "recharts";
import {
  STRATEGY_LIST,
  calculateStartingMonthly,
  getStrategyDefaults,
  getExtendedSchedule,
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
      <i className="fa-solid fa-circle-info text-[14px] text-text-secondary" />
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 z-20 mb-2 w-64 rounded-xl bg-text-primary px-3 py-2.5 text-xs leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
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
  const [inputRaw, setInputRaw] = useState(String(value));
  const [inputError, setInputError] = useState(false);

  useEffect(() => {
    setInputRaw(String(value));
    setInputError(false);
  }, [value]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-text-secondary flex items-center">
          {label}
          {tooltip && <InfoTooltip>{tooltip}</InfoTooltip>}
        </label>
        {showReset && (
          <button
            type="button"
            onClick={onReset}
            className="text-[10px] font-medium text-accent hover:text-accent-container transition-colors flex items-center gap-0.5"
          >
            <i className="fa-solid fa-rotate text-[12px]" />
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
          className="flex-1 h-2 rounded-full appearance-none bg-surface-altest cursor-pointer accent-primary"
        />
        <div className="relative w-24 flex-shrink-0">
          {prefix && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary">
              {prefix}
            </span>
          )}
          <input
            type="text"
            inputMode="numeric"
            value={inputRaw}
            onChange={(e) => {
              setInputRaw(e.target.value.replace(/[^0-9]/g, ""));
              setInputError(false);
            }}
            onBlur={() => {
              const v = Number(inputRaw);
              if (!inputRaw || isNaN(v) || v < min || v > max) {
                setInputError(true);
              } else {
                setInputError(false);
                onChange(v);
              }
            }}
            className={`w-full bg-surface-alt rounded-xl py-2 text-center text-sm font-bold text-text-primary focus:outline-none focus:bg-white focus:ring-1 transition-all ${
              prefix ? "pl-6" : ""
            } ${suffix ? "pr-6" : ""} ${inputError ? "ring-1 ring-error" : "focus:ring-accent"}`}
          />
          {suffix && (
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-secondary">
              {suffix}
            </span>
          )}
        </div>
      </div>
      {inputError && <p className="text-[11px] text-error">Enter a value between {min} and {max}</p>}
      {!inputError && hint && <p className="text-[11px] text-text-secondary leading-relaxed">{hint}</p>}
    </div>
  );
}

function CurrencyInput({
  label,
  value,
  onChange,
  min,
  max,
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
  tooltip?: string;
  onReset?: () => void;
  defaultValue?: number;
  hint?: string;
}) {
  const [raw, setRaw] = useState(String(value));
  const [error, setError] = useState(false);
  const showReset = onReset && defaultValue != null && Math.abs(value - defaultValue) > 50;

  useEffect(() => {
    setRaw(String(value));
    setError(false);
  }, [value]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-text-secondary flex items-center">
          {label}
          {tooltip && <InfoTooltip>{tooltip}</InfoTooltip>}
        </label>
        {showReset && (
          <button
            type="button"
            onClick={onReset}
            className="text-[10px] font-medium text-accent hover:text-accent-container transition-colors flex items-center gap-0.5"
          >
            <i className="fa-solid fa-rotate text-[12px]" />
            Reset
          </button>
        )}
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-text-secondary">$</span>
        <input
          type="text"
          inputMode="numeric"
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value.replace(/[^0-9]/g, ""));
            setError(false);
          }}
          onBlur={() => {
            const v = Number(raw);
            if (!raw || isNaN(v) || v < min || v > max) {
              setError(true);
            } else {
              setError(false);
              onChange(v);
            }
          }}
          className={`w-full bg-surface-alt rounded-xl py-3 pl-8 pr-4 text-base font-bold text-text-primary focus:outline-none focus:bg-white focus:ring-1 transition-all ${
            error ? "ring-1 ring-error" : "focus:ring-accent"
          }`}
        />
      </div>
      {error && (
        <p className="text-[11px] text-error">Enter a monthly amount between ${min.toLocaleString()} and ${max.toLocaleString()}</p>
      )}
      {!error && hint && <p className="text-[11px] text-text-secondary leading-relaxed">{hint}</p>}
    </div>
  );
}

function AssumptionStepper({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  const STEP = 0.001;
  const canDecrease = value > min + STEP * 0.5;
  const canIncrease = value < max - STEP * 0.5;

  return (
    <div className="bg-surface-alt rounded-xl p-3 text-center">
      <div className="flex items-center justify-center gap-2 mb-1">
        <button
          type="button"
          onClick={() => onChange(Math.round((value - STEP) * 10000) / 10000)}
          disabled={!canDecrease}
          className="w-7 h-7 rounded-full bg-surface-alt hover:bg-surface-alt transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
          aria-label={`Decrease ${label}`}
        >
          <i className="fa-solid fa-chevron-down text-[16px] text-text-secondary" />
        </button>
        <p className="text-lg font-bold text-text-primary w-14 text-center tabular-nums">
          {(value * 100).toFixed(1)}%
        </p>
        <button
          type="button"
          onClick={() => onChange(Math.round((value + STEP) * 10000) / 10000)}
          disabled={!canIncrease}
          className="w-7 h-7 rounded-full bg-surface-alt hover:bg-surface-alt transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
          aria-label={`Increase ${label}`}
        >
          <i className="fa-solid fa-chevron-up text-[16px] text-text-secondary" />
        </button>
      </div>
      <p className="text-[10px] text-text-secondary">{label}</p>
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
  withdrawalRate: number;
  currentAge: number;
  retirementAge: number;
  projectionEndAge?: number;
  onConfigChange: (config: StrategyConfig) => void;
  onRetirementAgeChange: (age: number) => void;
  onAnnualReturnChange: (rate: number) => void;
  onInflationRateChange: (rate: number) => void;
  onBack: () => void;
}

const CURRENT_YEAR = new Date().getFullYear();

export default function StrategyConfigurator({
  strategy,
  targetAmount,
  years,
  annualReturn,
  inflationRate,
  withdrawalRate,
  currentAge,
  retirementAge,
  projectionEndAge = 100,
  onConfigChange,
  onRetirementAgeChange,
  onAnnualReturnChange,
  onInflationRateChange,
  onBack,
}: StrategyConfiguratorProps) {
  const meta = STRATEGY_LIST.find((s) => s.id === strategy)!;
  const [localAnnualReturn, setLocalAnnualReturn] = useState(annualReturn);
  const [localInflationRate, setLocalInflationRate] = useState(inflationRate);

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
      annualReturn: localAnnualReturn,
      annualChangeRate: defaults.annualChangeRate,
      phase1Years: defaults.phase1Years,
      phase2Monthly: defaults.phase2Monthly,
    });
  }, [strategy, targetAmount, years, localAnnualReturn, defaults]);

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
      annualReturn: localAnnualReturn,
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
      annualReturn: localAnnualReturn,
      annualChangeRate: annualChangeRate / 100,
      phase1Years,
      phase2Monthly,
    }),
    [strategy, targetAmount, years, localAnnualReturn, annualChangeRate, phase1Years, phase2Monthly]
  );

  // Generate chart data with current phase1Monthly (extended to projection end age)
  const scheduleData = useMemo(
    () => getExtendedSchedule(strategyParams, phase1Monthly, currentAge, CURRENT_YEAR, retirementAge, projectionEndAge),
    [strategyParams, phase1Monthly, currentAge, retirementAge, projectionEndAge]
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

  // Keep parent in sync whenever config values change
  useEffect(() => {
    emitConfig();
  }, [emitConfig]);

  // Propagate assumption changes back to the parent
  useEffect(() => {
    onAnnualReturnChange(localAnnualReturn);
  }, [localAnnualReturn, onAnnualReturnChange]);

  useEffect(() => {
    onInflationRateChange(localInflationRate);
  }, [localInflationRate, onInflationRateChange]);

  // Purchasing power calculations
  const yearsToRetirement = retirementAge - currentAge;
  const inflationMultiplier = Math.pow(1 + localInflationRate, yearsToRetirement);
  const todaysDollars = finalPortfolioValue / inflationMultiplier;
  const annualWithdrawal = finalPortfolioValue * withdrawalRate;
  const monthlyWithdrawal = annualWithdrawal / 12;
  const annualWithdrawalToday = annualWithdrawal / inflationMultiplier;
  const monthlyWithdrawalToday = monthlyWithdrawal / inflationMultiplier;
  const [showPurchasingPower, setShowPurchasingPower] = useState(false);

  // Draggable retirement age state
  const chartRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragAge, setDragAge] = useState<number | null>(null);

  const handleChartMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging || !chartRef.current) return;
      const rect = chartRef.current.getBoundingClientRect();
      const chartLeft = 80;
      const chartRight = 60;
      const chartWidth = rect.width - chartLeft - chartRight;
      const x = e.clientX - rect.left - chartLeft;
      const ratio = Math.max(0, Math.min(1, x / chartWidth));
      const minAge = currentAge;
      const maxAge = 100;
      const newAge = Math.round(minAge + ratio * (maxAge - minAge));
      const clampedAge = Math.max(currentAge + 2, Math.min(99, newAge));
      setDragAge(clampedAge);
    },
    [isDragging, currentAge]
  );

  const handleChartMouseUp = useCallback(() => {
    if (isDragging && dragAge != null) {
      onRetirementAgeChange(dragAge);
    }
    setIsDragging(false);
    setDragAge(null);
  }, [isDragging, dragAge, onRetirementAgeChange]);

  useEffect(() => {
    if (!isDragging) return;
    const handleUp = () => {
      if (isDragging && dragAge != null) {
        onRetirementAgeChange(dragAge);
      }
      setIsDragging(false);
      setDragAge(null);
    };
    window.addEventListener("mouseup", handleUp);
    return () => window.removeEventListener("mouseup", handleUp);
  }, [isDragging, dragAge, onRetirementAgeChange]);

  const displayRetirementAge = dragAge ?? retirementAge;

  // Reset to defaults
  const resetAll = useCallback(() => {
    const resetAuto = calculateStartingMonthly({
      strategy,
      targetAmount,
      years,
      annualReturn,
      annualChangeRate: defaults.annualChangeRate,
      phase1Years: defaults.phase1Years,
      phase2Monthly: defaults.phase2Monthly,
    });
    setPhase1Monthly(Math.round(resetAuto));
    setPhase1Years(defaults.phase1Years);
    setPhase2Monthly(defaults.phase2Monthly);
    setAnnualChangeRate(Math.round(defaults.annualChangeRate * 100));
    setLocalAnnualReturn(annualReturn);
    setLocalInflationRate(inflationRate);
  }, [strategy, targetAmount, years, annualReturn, inflationRate, defaults]);

  // Contribution schedule summary
  const lastDataPoint = scheduleData[scheduleData.length - 1];
  const firstYearContribution = scheduleData.length > 1 ? scheduleData[1]?.monthlyContribution ?? 0 : 0;
  const lastYearContribution = lastDataPoint?.monthlyContribution ?? 0;

  return (
    <div className="space-y-6">
      {/* Strategy header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent-light flex items-center justify-center">
            <i className={`fa-solid ${meta.icon} text-accent text-[20px]`} />
          </div>
          <div>
            <h2 className="text-title-md font-bold text-text-primary">{meta.name}</h2>
            <p className="text-sm text-text-secondary">{meta.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetAll}
            className="px-3 py-1.5 rounded-full text-xs font-medium text-text-secondary hover:bg-surface-alt transition-all flex items-center gap-1"
          >
            <i className="fa-solid fa-rotate text-[14px]" />
            Reset all
          </button>
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-1.5 rounded-full text-xs font-medium text-accent hover:bg-accent-light/40 transition-all flex items-center gap-1"
          >
            <i className="fa-solid fa-right-left text-[14px]" />
            Change strategy
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Controls */}
        <div className="lg:col-span-2 space-y-5">
          {/* Strategy-specific sliders */}
          <div className="bg-surface rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <i className="fa-solid fa-sliders text-[18px] text-text-secondary" />
                Strategy Controls
              </h3>
            </div>

            {/* Starting monthly contribution (all strategies except traditional) */}
            {strategy !== "traditional" && (
              <CurrencyInput
                label={
                  strategy === "coast_fire" || strategy === "barista_fire"
                    ? "Phase 1 monthly savings"
                    : "Starting monthly savings"
                }
                value={phase1Monthly}
                onChange={setPhase1Monthly}
                min={100}
                max={99999}
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
                <label className="text-xs font-semibold text-text-secondary flex items-center">
                  Monthly savings
                  <InfoTooltip>
                    With the traditional approach, you save the same amount every month. This is calculated using the PMT formula based on your target, return rate, and timeline.
                  </InfoTooltip>
                </label>
                <div className="bg-surface-alt rounded-xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-accent tracking-tight">
                    {formatFullCurrency(Math.round(autoStartMonthly))}
                    <span className="text-sm font-medium text-text-secondary">/mo</span>
                  </p>
                  <p className="text-[11px] text-text-secondary mt-1">
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
                    annualReturn: localAnnualReturn,
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
              <CurrencyInput
                label="Reduced phase monthly savings"
                value={phase2Monthly}
                onChange={(v) => {
                  setPhase2Monthly(v);
                  const newAuto = calculateStartingMonthly({
                    strategy,
                    targetAmount,
                    years,
                    annualReturn: localAnnualReturn,
                    phase1Years,
                    phase2Monthly: v,
                  });
                  setPhase1Monthly(Math.round(newAuto));
                }}
                min={0}
                max={99999}
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
                    annualReturn: localAnnualReturn,
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
          <div className="bg-surface rounded-xl p-6 space-y-3">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <i className="fa-solid fa-gear text-[18px] text-text-secondary" />
              Assumptions
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <AssumptionStepper
                label="Expected return"
                value={localAnnualReturn}
                onChange={setLocalAnnualReturn}
                min={0.01}
                max={0.20}
              />
              <AssumptionStepper
                label="Inflation rate"
                value={localInflationRate}
                onChange={setLocalInflationRate}
                min={0}
                max={0.10}
              />
            </div>
            <p className="text-[11px] text-text-secondary">
              Tap ± to adjust by 0.1% and see how it affects your projection.
            </p>
          </div>
        </div>

        {/* Right: Chart + Summary */}
        <div className="lg:col-span-3 space-y-5">
          {/* Chart */}
          <div className="bg-surface rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <i className="fa-solid fa-chart-line text-[18px] text-accent" />
                Your projection
              </h3>
              {isDragging && dragAge != null && (
                <span className="text-xs font-semibold text-warning">
                  Retire at {dragAge}
                </span>
              )}
            </div>

            <div
              ref={chartRef}
              className={`h-72 ${isDragging ? "cursor-ew-resize select-none" : ""}`}
              onMouseMove={handleChartMouseMove}
              onMouseUp={handleChartMouseUp}
            >
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
                      const isPostRetirement = data.age > displayRetirementAge;
                      return (
                        <div className="bg-text-primary rounded-xl px-4 py-3 shadow-lg text-white text-xs space-y-1.5">
                          <p className="font-semibold">
                            Age {label} ({data.year})
                            {data.age === displayRetirementAge && (
                              <span className="ml-1 text-warning-fixed">Retirement</span>
                            )}
                            {isPostRetirement && (
                              <span className="ml-1 text-white/50">Post-retirement</span>
                            )}
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-accent" />
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
                      <span className="text-xs text-text-secondary">{value}</span>
                    )}
                  />
                  <ReferenceLine
                    x={displayRetirementAge}
                    yAxisId="portfolio"
                    stroke="#805200"
                    strokeWidth={isDragging ? 3 : 2}
                    strokeDasharray={isDragging ? "" : "6 4"}
                    label={{
                      value: `Retire ${displayRetirementAge}`,
                      position: "top",
                      fill: "#805200",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
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

            {/* Drag handle hint */}
            <div className="flex items-center justify-center">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                  setDragAge(retirementAge);
                }}
                className="text-[11px] text-text-secondary hover:text-warning transition-colors flex items-center gap-1 cursor-ew-resize px-2 py-1 rounded-full hover:bg-warning-light/30"
              >
                <i className="fa-solid fa-grip-vertical text-[14px]" />
                Drag the retirement line to adjust your target age
              </button>
            </div>

            {/* Target comparison */}
            <div
              className={`rounded-xl p-3 flex items-center gap-3 ${
                onTrack ? "bg-success-light/30" : "bg-error-light/30"
              }`}
            >
              <i
                className={`fa-solid ${onTrack ? "fa-circle-check" : "fa-triangle-exclamation"} text-[18px] ${
                  onTrack ? "text-success" : "text-error"
                }`}
              />
              <div className="flex-1">
                <p className={`text-xs font-semibold ${onTrack ? "text-success" : "text-error"}`}>
                  {onTrack
                    ? `On track: portfolio reaches ${formatCurrency(finalPortfolioValue)} at age ${retirementAge}`
                    : `Under target by ${formatCurrency(Math.abs(surplusDeficit))}`}
                </p>
                <p className="text-[11px] text-text-secondary">
                  Target: {formatCurrency(targetAmount)}
                  {!onTrack && ". Increase your contributions or adjust the strategy parameters."}
                </p>
              </div>
            </div>
          </div>

          {/* Live summary */}
          <div className="bg-surface rounded-xl p-6 space-y-4">
            <p className="text-label-sm font-bold text-text-secondary tracking-widest uppercase">
              Plan Summary
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-alt rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-accent tracking-tight">
                  {formatFullCurrency(firstYearContribution)}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {strategy === "traditional" ? "monthly, every month" : "year 1 monthly"}
                </p>
              </div>
              <div className="bg-surface-alt rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-text-primary tracking-tight">
                  {strategy === "traditional"
                    ? formatFullCurrency(firstYearContribution)
                    : formatFullCurrency(lastYearContribution)}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {strategy === "coast_fire"
                    ? `after year ${phase1Years}`
                    : strategy === "barista_fire"
                    ? "reduced phase monthly"
                    : strategy === "traditional"
                    ? "monthly (same)"
                    : "final year monthly"}
                </p>
              </div>
              <div className="bg-surface-alt rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-text-primary tracking-tight">
                  {formatCurrency(finalPortfolioValue)}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">projected total</p>
              </div>
              <div className="bg-surface-alt rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-text-primary tracking-tight">
                  {currentAge} → {retirementAge}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">{years} years</p>
              </div>
            </div>

            {/* Purchasing power details (collapsible) */}
            <button
              type="button"
              onClick={() => setShowPurchasingPower(!showPurchasingPower)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-surface-alt transition-colors"
            >
              <span className="text-xs font-semibold text-accent flex items-center gap-1.5">
                <i className="fa-solid fa-credit-card text-[16px]" />
                See purchasing power details
              </span>
              <i className={`fa-solid fa-chevron-down text-[18px] text-text-secondary transition-transform ${showPurchasingPower ? "rotate-180" : ""}`} />
            </button>

            {showPurchasingPower && (
              <div className="bg-surface-alt rounded-xl p-5 space-y-4">
                <p className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                  <i className="fa-solid fa-arrow-trend-down text-[14px] text-warning" />
                  What {formatCurrency(finalPortfolioValue)} really buys at age {retirementAge}
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <p className="text-lg font-extrabold text-text-primary tracking-tight">{formatFullCurrency(todaysDollars)}</p>
                    <p className="text-[11px] text-text-secondary">In today&apos;s dollars</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-lg font-extrabold text-text-primary tracking-tight">{formatFullCurrency(finalPortfolioValue)}</p>
                    <p className="text-[11px] text-text-secondary">Nominal (future) value</p>
                  </div>
                </div>

                <div className="border-t border-surface-alt pt-3 space-y-1">
                  <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                    Annual withdrawal at {(withdrawalRate * 100).toFixed(0)}% rate
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-0.5">
                      <p className="text-base font-bold text-accent">{formatFullCurrency(annualWithdrawalToday)}<span className="text-xs font-medium text-text-secondary">/yr</span></p>
                      <p className="text-[11px] text-text-secondary">In today&apos;s dollars</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-base font-bold text-text-primary">{formatFullCurrency(annualWithdrawal)}<span className="text-xs font-medium text-text-secondary">/yr</span></p>
                      <p className="text-[11px] text-text-secondary">Nominal</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-surface-alt pt-3 space-y-1">
                  <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                    Monthly spending
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-0.5">
                      <p className="text-base font-bold text-accent">{formatFullCurrency(monthlyWithdrawalToday)}<span className="text-xs font-medium text-text-secondary">/mo</span></p>
                      <p className="text-[11px] text-text-secondary">In today&apos;s dollars</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-base font-bold text-text-primary">{formatFullCurrency(monthlyWithdrawal)}<span className="text-xs font-medium text-text-secondary">/mo</span></p>
                      <p className="text-[11px] text-text-secondary">Nominal</p>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-text-secondary leading-relaxed">
                  <i className="fa-solid fa-circle-info text-[10px] align-middle mr-0.5" />
                  &quot;Today&apos;s dollars&quot; adjusts for {(localInflationRate * 100).toFixed(1)}% annual inflation over {yearsToRetirement} years.
                  The {(withdrawalRate * 100).toFixed(0)}% withdrawal rate is applied to your projected portfolio.
                </p>
              </div>
            )}

            <p className="text-xs text-text-secondary leading-relaxed">
              <i className="fa-solid fa-circle-info text-[12px] align-middle mr-0.5" />
              Based on {(localAnnualReturn * 100).toFixed(1)}% annual return and {(localInflationRate * 100).toFixed(1)}% inflation.
              These are projections, not guarantees. You can refine these numbers anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
