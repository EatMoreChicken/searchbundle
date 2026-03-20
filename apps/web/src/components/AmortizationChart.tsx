"use client";

import {
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface AmortizationPoint {
  month: number;
  balance: number;
  principal: number;
  interest: number;
  cumulativeInterest: number;
}

export interface AmortizationResult {
  schedule: AmortizationPoint[];
  totalInterest: number;
  totalPaid: number;
  payoffMonths: number;
}

export function calculateAmortization(
  balance: number,
  annualRate: number,
  monthlyPayment: number,
  remainingMonths: number | null,
  extraMonthly = 0,
  extraYearly = 0,
  lumpSum = 0,
  lumpSumMonth = 1
): AmortizationResult {
  const monthlyRate = annualRate / 100 / 12;
  let currentBalance = balance;
  let cumulativeInterest = 0;
  let totalPaid = 0;
  const schedule: AmortizationPoint[] = [];
  const maxMonths = remainingMonths ?? 360;

  schedule.push({
    month: 0,
    balance: currentBalance,
    principal: 0,
    interest: 0,
    cumulativeInterest: 0,
  });

  for (let m = 1; m <= maxMonths && currentBalance > 0.01; m++) {
    const interestPayment = currentBalance * monthlyRate;
    let payment = monthlyPayment + extraMonthly;

    if (extraYearly > 0 && m % 12 === 0) {
      payment += extraYearly;
    }

    if (lumpSum > 0 && m === lumpSumMonth) {
      payment += lumpSum;
    }

    if (payment > currentBalance + interestPayment) {
      payment = currentBalance + interestPayment;
    }

    const principalPayment = payment - interestPayment;
    currentBalance = Math.max(0, currentBalance - principalPayment);
    cumulativeInterest += interestPayment;
    totalPaid += payment;

    schedule.push({
      month: m,
      balance: Math.round(currentBalance * 100) / 100,
      principal: Math.round(principalPayment * 100) / 100,
      interest: Math.round(interestPayment * 100) / 100,
      cumulativeInterest: Math.round(cumulativeInterest * 100) / 100,
    });

    if (currentBalance <= 0.01) break;
  }

  return {
    schedule,
    totalInterest: Math.round(cumulativeInterest * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    payoffMonths: schedule.length - 1,
  };
}

function formatK(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: number;
}) {
  if (!active || !payload?.length) return null;

  const byKey: Record<string, number> = {};
  payload.forEach((p) => { byKey[p.dataKey] = p.value; });

  const years = Math.floor((label ?? 0) / 12);
  const months = (label ?? 0) % 12;
  const timeLabel = years > 0 ? `${years}y ${months}m` : `${months}m`;

  return (
    <div className="rounded-xl bg-surface-container-lowest px-4 py-3 shadow-lg text-[13px]">
      <p className="text-[11px] uppercase tracking-[1px] text-on-surface-variant mb-2">
        Month {label} ({timeLabel})
      </p>
      {byKey["balance"] != null && (
        <p className="font-semibold text-on-surface">Balance: <span className="text-error">{formatCurrency(byKey["balance"])}</span></p>
      )}
      {byKey["principal"] != null && (
        <p className="text-on-surface-variant mt-1">Principal: {formatCurrency(byKey["principal"])}</p>
      )}
      {byKey["interest"] != null && (
        <p className="text-on-surface-variant mt-1">Interest: {formatCurrency(byKey["interest"])}</p>
      )}
      {byKey["cumulativeInterest"] != null && (
        <p className="text-tertiary mt-1">Total Interest: {formatCurrency(byKey["cumulativeInterest"])}</p>
      )}
    </div>
  );
}

interface Props {
  schedule: AmortizationPoint[];
  comparisonSchedule?: AmortizationPoint[];
  height?: number;
}

export default function AmortizationChart({ schedule, comparisonSchedule, height = 320 }: Props) {
  const yearlyData = schedule.filter((_, i) => i === 0 || i % 12 === 0 || i === schedule.length - 1);

  const merged = yearlyData.map((point) => {
    const comp = comparisonSchedule?.find((c) => c.month === point.month);
    return {
      ...point,
      compBalance: comp?.balance,
      compCumulativeInterest: comp?.cumulativeInterest,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={merged} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" strokeOpacity={0.6} />
        <XAxis
          dataKey="month"
          tick={{ fontFamily: "Manrope", fontSize: 11, fill: "var(--color-on-surface-variant)" }}
          tickFormatter={(v) => `Y${Math.round(v / 12)}`}
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
        <Tooltip content={<CustomTooltip />} />

        <Area
          dataKey="cumulativeInterest"
          fill="var(--color-tertiary-fixed)"
          stroke="var(--color-tertiary)"
          strokeWidth={1.5}
          fillOpacity={0.5}
          name="Total Interest"
          dot={false}
        />

        {comparisonSchedule && (
          <Line
            dataKey="compBalance"
            stroke="var(--color-secondary)"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            name="Scenario Balance"
          />
        )}

        <Line
          dataKey="balance"
          stroke="var(--color-error)"
          strokeWidth={2.5}
          dot={false}
          name="Balance"
          activeDot={{ r: 5, fill: "var(--color-error)", stroke: "var(--color-surface-container-lowest)", strokeWidth: 2 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
