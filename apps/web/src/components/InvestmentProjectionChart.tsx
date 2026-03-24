"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ContributionFrequency, AccountContribution } from "@/types";

const FREQ_MULTIPLIER: Record<ContributionFrequency, number> = {
  weekly: 52,
  biweekly: 26,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};

const INFLATION_RATE = 0.03;

function annualizeContributions(contributions: AccountContribution[]): number {
  return contributions.reduce(
    (sum, c) => sum + c.amount * (FREQ_MULTIPLIER[c.frequency] ?? 12),
    0
  );
}

interface DataPoint {
  year: number;
  expected: number;
  rangeLow: number;
  rangeSize: number;
  inflationAdjusted: number | null;
}

function fv(balance: number, annualContrib: number, r: number, n: number): number {
  if (r === 0) return balance + annualContrib * n;
  return balance * Math.pow(1 + r, n) + annualContrib * ((Math.pow(1 + r, n) - 1) / r);
}

function generateData(
  balance: number,
  contributions: AccountContribution[],
  returnRate: number | null,
  returnRateVariance: number | null,
  includeInflation: boolean,
  years: number
): DataPoint[] {
  const annualContrib = annualizeContributions(contributions);
  const r = (returnRate ?? 0) / 100;
  const v = (returnRateVariance ?? 0) / 100;
  const rLow = Math.max(0, r - v);
  const rHigh = r + v;

  return Array.from({ length: years + 1 }, (_, n) => {
    const expected = fv(balance, annualContrib, r, n);
    const low = v > 0 ? fv(balance, annualContrib, rLow, n) : expected;
    const high = v > 0 ? fv(balance, annualContrib, rHigh, n) : expected;
    return {
      year: n,
      expected: Math.round(expected),
      rangeLow: Math.round(low),
      rangeSize: Math.round(high - low),
      inflationAdjusted: includeInflation
        ? Math.round(expected / Math.pow(1 + INFLATION_RATE, n))
        : null,
    };
  });
}

function formatK(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

function CustomTooltip({
  active,
  payload,
  label,
  includeInflation,
  hasVariance,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; dataKey: string }>;
  label?: number;
  includeInflation: boolean;
  hasVariance: boolean;
}) {
  if (!active || !payload?.length) return null;

  const byKey: Record<string, number> = {};
  payload.forEach((p) => { byKey[p.dataKey] = p.value; });

  const expected = byKey["expected"];
  const rangeLow = byKey["rangeLow"];
  const rangeSize = byKey["rangeSize"];
  const rangeHigh = rangeLow != null && rangeSize != null ? rangeLow + rangeSize : null;
  const inflAdj = byKey["inflationAdjusted"];

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

  return (
    <div className="rounded-xl bg-surface-container-lowest px-4 py-3 shadow-lg text-[13px]">
      <p className="text-[11px] uppercase tracking-[1px] text-on-surface-variant mb-2">
        Year {label}
      </p>
      {expected != null && (
        <p className="font-semibold text-on-surface">Expected: <span className="text-primary">{fmt(expected)}</span></p>
      )}
      {hasVariance && rangeLow != null && rangeHigh != null && (
        <p className="text-on-surface-variant mt-1">Range: {fmt(rangeLow)} – {fmt(rangeHigh)}</p>
      )}
      {includeInflation && inflAdj != null && (
        <p className="text-on-surface-variant mt-1">Inflation-adj: {fmt(inflAdj)}</p>
      )}
    </div>
  );
}

interface Props {
  balance: number;
  contributions: AccountContribution[];
  returnRate: number | null;
  returnRateVariance: number | null;
  includeInflation: boolean;
  years: number;
}

export default function InvestmentProjectionChart({
  balance,
  contributions,
  returnRate,
  returnRateVariance,
  includeInflation,
  years,
}: Props) {
  const data = generateData(
    balance,
    contributions,
    returnRate,
    returnRateVariance,
    includeInflation,
    years
  );

  const hasVariance = (returnRateVariance ?? 0) > 0;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" strokeOpacity={0.6} />
        <XAxis
          dataKey="year"
          tick={{ fontFamily: "Manrope", fontSize: 11, fill: "var(--color-on-surface-variant)" }}
          tickFormatter={(v) => `Y${v}`}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontFamily: "Manrope", fontSize: 11, fill: "var(--color-on-surface-variant)" }}
          tickFormatter={formatK}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <Tooltip
          content={
            <CustomTooltip
              includeInflation={includeInflation}
              hasVariance={hasVariance}
            />
          }
        />

        {/* Range band: stacked areas (rangeLow transparent + rangeSize teal-light) */}
        {hasVariance && (
          <>
            <Area
              dataKey="rangeLow"
              stackId="range"
              fill="transparent"
              stroke="transparent"
              isAnimationActive={false}
            />
            <Area
              dataKey="rangeSize"
              stackId="range"
              fill="var(--color-primary-fixed)"
              stroke="transparent"
              fillOpacity={0.7}
              isAnimationActive={false}
            />
          </>
        )}

        {/* Inflation-adjusted dashed line */}
        {includeInflation && (
          <Line
            dataKey="inflationAdjusted"
            stroke="var(--color-on-surface-variant)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            name="Inflation-adjusted"
            isAnimationActive={false}
          />
        )}

        {/* Main expected value line */}
        <Line
          dataKey="expected"
          stroke="var(--color-primary)"
          strokeWidth={2.5}
          dot={false}
          name="Expected"
          activeDot={{ r: 5, fill: "var(--color-primary)", stroke: "var(--color-surface-container-lowest)", strokeWidth: 2 }}
        />


      </ComposedChart>
    </ResponsiveContainer>
  );
}
