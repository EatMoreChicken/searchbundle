"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  AreaChart,
  Area,
  Line,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  STRATEGY_LIST,
  getMiniChartData,
  getStrategySummary,
  type SavingsStrategy,
} from "@/lib/retirement-strategies";

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

interface MiniChartProps {
  strategy: SavingsStrategy;
  years: number;
}

function MiniChart({ strategy, years }: MiniChartProps) {
  const data = useMemo(() => getMiniChartData(strategy, years), [strategy, years]);

  return (
    <div className="h-16 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={`miniGrad-${strategy}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#006761" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#006761" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="portfolio"
            stroke="#006761"
            strokeWidth={1.5}
            fill={`url(#miniGrad-${strategy})`}
            isAnimationActive={false}
          />
          <Line
            type="stepAfter"
            dataKey="contribution"
            stroke="#805200"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// recharts LineChart needs Line imported but we're using it inside AreaChart.
// Actually AreaChart can only have Area children. Let's use a ComposedChart.
// Fixing: use ComposedChart to support both Area and Line with shared tooltip.
function MiniChartDual({ strategy, years }: MiniChartProps) {
  const data = useMemo(() => getMiniChartData(strategy, years), [strategy, years]);

  return (
    <div className="h-16 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={`miniGrad-${strategy}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#006761" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#006761" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <RechartsTooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const d = payload[0]?.payload as { t: number; portfolio: number; contribution: number };
              const pct = Math.round(d.t * 100);
              return (
                <div className="bg-text-primary rounded-lg px-2.5 py-1.5 shadow-lg text-white text-[10px] space-y-0.5 pointer-events-none">
                  <p className="font-semibold">{pct}% through</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <span>Portfolio: {Math.round(d.portfolio * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                    <span>Contrib: {Math.round(d.contribution * 100)}%</span>
                  </div>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="portfolio"
            stroke="#006761"
            strokeWidth={1.5}
            fill={`url(#miniGrad-${strategy})`}
            isAnimationActive={false}
          />
          <Line
            type="stepAfter"
            dataKey="contribution"
            stroke="#805200"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="4 2"
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

interface StrategySelectionProps {
  targetAmount: number;
  years: number;
  annualReturn: number;
  selected: SavingsStrategy | null;
  onSelect: (strategy: SavingsStrategy) => void;
}

export default function StrategySelection({
  targetAmount,
  years,
  annualReturn,
  selected,
  onSelect,
}: StrategySelectionProps) {
  return (
    <div className="space-y-6">
      {/* Intro note */}
      <div className="bg-surface-alt rounded-xl p-5 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-warning-light flex items-center justify-center flex-shrink-0 mt-0.5">
          <i className="fa-solid fa-lightbulb text-warning text-[18px]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary mb-1">Choose a savings path to start with</p>
          <p className="text-xs text-text-secondary leading-relaxed">
            This is just a starting point. On the next page, you can customize every parameter: adjust sliders,
            change the target, and see exactly how the numbers shift. Nothing is locked in.
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0.5 bg-accent rounded-full" />
          <span className="text-xs text-text-secondary">Portfolio growth</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0.5 bg-tertiary rounded-full" style={{ borderTop: "1.5px dashed #805200", height: 0 }} />
          <span className="text-xs text-text-secondary">Monthly contribution</span>
        </div>
      </div>

      {/* Strategy cards */}
      <div className="space-y-3">
        {STRATEGY_LIST.map((meta, idx) => (
          <StrategyCard
            key={meta.id}
            meta={meta}
            rank={idx + 1}
            targetAmount={targetAmount}
            years={years}
            annualReturn={annualReturn}
            isSelected={selected === meta.id}
            onSelect={() => onSelect(meta.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface StrategyCardProps {
  meta: (typeof STRATEGY_LIST)[number];
  rank: number;
  targetAmount: number;
  years: number;
  annualReturn: number;
  isSelected: boolean;
  onSelect: () => void;
}

function StrategyCard({
  meta,
  rank,
  targetAmount,
  years,
  annualReturn,
  isSelected,
  onSelect,
}: StrategyCardProps) {
  const summary = useMemo(
    () => getStrategySummary(meta.id, targetAmount, years, annualReturn),
    [meta.id, targetAmount, years, annualReturn]
  );

  const hasValidNumbers = targetAmount > 0 && years > 0 && summary.firstYearMonthly > 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-xl p-6 transition-all ${
        isSelected
          ? "bg-accent-light ring-2 ring-primary/20"
          : "bg-surface hover:bg-surface-alt"
      }`}
    >
      <div className="flex items-start gap-5">
        {/* Left: icon and rank */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center ${
              isSelected ? "bg-accent text-white" : "bg-surface-alt text-text-secondary"
            }`}
          >
            <i className={`fa-solid ${meta.icon} text-[22px]`} />
          </div>
          {rank === 1 && (
            <span className="text-[10px] font-bold text-accent uppercase tracking-wide">Best</span>
          )}
        </div>

        {/* Center: text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className={`text-title-md font-bold ${isSelected ? "text-accent" : "text-text-primary"}`}>
              {meta.name}
            </h3>
            <span className="text-xs text-text-secondary">{meta.subtitle}</span>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed mb-3">{meta.description}</p>

          {/* Monthly preview */}
          {hasValidNumbers && (
            <div className="flex items-center gap-4 text-xs">
              <div>
                <span className="text-text-secondary">Year 1: </span>
                <span className="font-bold text-text-primary">{formatCurrency(summary.firstYearMonthly)}/mo</span>
              </div>
              {summary.firstYearMonthly !== summary.lastYearMonthly && (
                <>
                  <span className="text-text-secondary">→</span>
                  <div>
                    <span className="text-text-secondary">
                      {meta.id === "coast_fire" ? `After ${summary.phase1Years ?? "?"} yrs: ` : "Final year: "}
                    </span>
                    <span className="font-bold text-text-primary">
                      {summary.lastYearMonthly === 0 ? "$0/mo" : `${formatCurrency(summary.lastYearMonthly)}/mo`}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Best for tag */}
          <div className="flex items-center gap-1.5 mt-2">
            <i className="fa-solid fa-user text-[12px] text-text-secondary" />
            <span className="text-xs text-text-secondary italic">{meta.bestFor}</span>
          </div>
        </div>

        {/* Right: mini chart */}
        <div className="w-32 flex-shrink-0">
          <MiniChartDual strategy={meta.id} years={years} />
        </div>
      </div>
    </button>
  );
}
