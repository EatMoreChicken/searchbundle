"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import type { Asset, BalanceUpdate, AccountNote, AccountContribution, User, ContributionFrequency } from "@/types";
import PlannedContributions from "@/components/PlannedContributions";
import InvestmentProjectionChart from "@/components/InvestmentProjectionChart";
import {
  AreaChart,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

const TYPE_LABELS: Record<string, string> = {
  simple: "Simple Account",
  investment: "Investment",
  savings: "Savings",
  hsa: "HSA",
  property: "Property",
  other: "Other",
};

const TYPE_ICONS: Record<string, string> = {
  simple: "fa-wallet",
  investment: "fa-arrow-trend-up",
  savings: "fa-piggy-bank",
  hsa: "fa-heart",
  property: "fa-house",
  other: "fa-circle-dot",
};

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrencyFull(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateStr: string | Date) {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string | Date) {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Math expression support: full expressions only, e.g. 100+200 or -100+50
// A leading minus on its own (e.g. "-100") is treated as a negative number, not an expression.
const FULL_EXPR_PATTERN = /^(-?\d+\.?\d*)\s*([+\-*/])\s*(-?\d+\.?\d*)$/;

function isExpression(value: string): boolean {
  const trimmed = value.trim();
  const m = trimmed.match(FULL_EXPR_PATTERN);
  if (!m) return false;
  // The operator must appear after position 0 so that a bare negative number ("-100") is never an expression
  return trimmed.indexOf(m[2], 1) > 0;
}

function applyExpression(input: string): number | null {
  const trimmed = input.trim();
  const m = trimmed.match(FULL_EXPR_PATTERN);
  if (!m) return null;
  const left = parseFloat(m[1]);
  const right = parseFloat(m[3]);
  if (isNaN(left) || isNaN(right)) return null;
  switch (m[2]) {
    case "+": return left + right;
    case "-": return left - right;
    case "*": return left * right;
    case "/": return right === 0 ? null : left / right;
    default: return null;
  }
}

function parseBalanceValue(input: string): { value: number } | { error: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (isExpression(trimmed)) {
    const result = applyExpression(trimmed);
    if (result === null) return { error: "Invalid expression. Try something like 8500+200." };
    return { value: Math.round(result * 100) / 100 };
  }

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return { value: Math.round(parseFloat(trimmed) * 100) / 100 };
  }

  return { error: "Enter a valid number or math expression (e.g., 8500+200)" };
}

interface ChartDataPoint {
  idx: number;
  date: string;
  value: number;
  label: string;
}

interface EditFormState {
  name: string;
  notes: string;
  returnRate: string;
  returnRateVariance: string;
}

type TimelineEntry =
  | { type: "update"; data: BalanceUpdate; createdAt: string }
  | { type: "note"; data: AccountNote; createdAt: string };

interface CombinedChartPoint {
  x: number;
  label: string;
  historyValue: number | null;
  projectedExpected: number | null;
  projectedLow: number | null;
  projectedRangeSize: number | null;
}

const PROJECTION_YEAR_OPTIONS = [5, 10, 15, 20, 30, 40, 50];
const FREQ_MULTIPLIER: Record<ContributionFrequency, number> = {
  weekly: 52, biweekly: 26, monthly: 12, quarterly: 4, yearly: 1,
};

function fvProjection(balance: number, annualContrib: number, rate: number, n: number): number {
  if (rate === 0) return balance + annualContrib * n;
  return balance * Math.pow(1 + rate, n) + annualContrib * ((Math.pow(1 + rate, n) - 1) / rate);
}

function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [history, setHistory] = useState<BalanceUpdate[]>([]);
  const [notes, setNotes] = useState<AccountNote[]>([]);
  const [contributions, setContributions] = useState<AccountContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Inline balance editor
  const [balanceEditing, setBalanceEditing] = useState(false);
  const [balanceInput, setBalanceInput] = useState("");
  const [balanceSaving, setBalanceSaving] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const balanceInputRef = useRef<HTMLInputElement>(null);

  // Activity input (combined balance + note)
  const [activityBalance, setActivityBalance] = useState("");
  const [activityNote, setActivityNote] = useState("");
  const [activitySaving, setActivitySaving] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [hoveredMarker, setHoveredMarker] = useState<string | null>(null);

  // Projection years (for investment combined chart)
  const [projectionYears, setProjectionYears] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sb-projection-years");
      if (stored) return parseInt(stored, 10) || 30;
    }
    return 30;
  });

  const fetchAsset = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<Asset>(`/api/assets/${id}`);
      setAsset(data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchHistory = useCallback(async () => {
    try {
      const data = await apiClient.get<BalanceUpdate[]>(`/api/assets/${id}/history`);
      setHistory(data);
    } catch {
      /* ignore */
    }
  }, [id]);

  const fetchNotes = useCallback(async () => {
    try {
      const data = await apiClient.get<AccountNote[]>(`/api/assets/${id}/notes`);
      setNotes(data);
    } catch {
      /* ignore */
    }
  }, [id]);

  const fetchContributions = useCallback(async () => {
    try {
      const data = await apiClient.get<AccountContribution[]>(`/api/assets/${id}/contributions`);
      setContributions(data);
    } catch {
      /* ignore */
    }
  }, [id]);

  useEffect(() => {
    fetchAsset();
    fetchHistory();
    fetchNotes();
    fetchContributions();
    // Fetch user profile for default projection years
    if (!localStorage.getItem("sb-projection-years")) {
      apiClient.get<User>("/api/users/me").then((user) => {
        if (user.projectionEndAge && user.projectionEndAge !== 100) {
          setProjectionYears(user.projectionEndAge);
        }
      }).catch(() => { /* ignore */ });
    }
  }, [fetchAsset, fetchHistory, fetchNotes, fetchContributions]);

  function openBalanceEditor() {
    if (!asset) return;
    setBalanceInput(String(asset.balance));
    setBalanceEditing(true);
    setBalanceError(null);
    setTimeout(() => {
      const el = balanceInputRef.current;
      if (!el) return;
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }, 50);
  }

  async function submitBalanceUpdate() {
    if (!asset || balanceSaving) return;

    const trimmed = balanceInput.trim();
    if (!trimmed) {
      setBalanceEditing(false);
      setBalanceError(null);
      return;
    }

    const parsed = parseBalanceValue(trimmed);
    if (parsed === null) {
      setBalanceEditing(false);
      setBalanceError(null);
      return;
    }
    if ("error" in parsed) {
      setBalanceError(parsed.error);
      return;
    }

    setBalanceSaving(true);
    setBalanceError(null);
    try {
      await apiClient.post(`/api/assets/${id}/history`, { newBalance: parsed.value });
      await Promise.all([fetchAsset(), fetchHistory()]);
      setBalanceEditing(false);
    } finally {
      setBalanceSaving(false);
    }
  }

  function handleBalanceKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      submitBalanceUpdate();
    } else if (e.key === "Escape") {
      setBalanceEditing(false);
      setBalanceError(null);
    }
  }

  function openEdit() {
    if (!asset) return;
    setEditForm({
      name: asset.name,
      notes: asset.notes ?? "",
      returnRate: asset.returnRate != null ? String(asset.returnRate) : "",
      returnRateVariance: asset.returnRateVariance != null ? String(asset.returnRateVariance) : "",
    });
    setEditOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm || !asset) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: editForm.name,
        notes: editForm.notes || null,
      };
      if (asset.type === "investment") {
        payload.returnRate = editForm.returnRate ? parseFloat(editForm.returnRate) : null;
        payload.returnRateVariance = editForm.returnRateVariance ? parseFloat(editForm.returnRateVariance) : null;
      }
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

  async function submitActivity() {
    if (!asset || activitySaving) return;

    const balanceParsed = parseBalanceValue(activityBalance);
    if (balanceParsed && "error" in balanceParsed) {
      setActivityError(balanceParsed.error);
      return;
    }

    const hasBalance = balanceParsed !== null;
    const hasNote = activityNote.trim().length > 0;
    if (!hasBalance && !hasNote) return;

    setActivitySaving(true);
    setActivityError(null);
    try {
      if (hasBalance) {
        await apiClient.post(`/api/assets/${id}/history`, {
          newBalance: balanceParsed.value,
          note: hasNote ? activityNote.trim() : undefined,
        });
      } else {
        await apiClient.post(`/api/assets/${id}/notes`, { content: activityNote.trim() });
      }
      setActivityBalance("");
      setActivityNote("");
      await Promise.all([fetchAsset(), fetchHistory(), fetchNotes()]);
    } finally {
      setActivitySaving(false);
    }
  }

  async function deleteNote(noteId: string) {
    await apiClient.delete(`/api/assets/${id}/notes/${noteId}`);
    await fetchNotes();
  }

  function scrollToEntry(elementId: string) {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-tertiary");
      setTimeout(() => el.classList.remove("ring-2", "ring-tertiary"), 2000);
    }
  }

  // Build chart data from history (reversed so oldest is first) + current balance
  const chartData: ChartDataPoint[] = (() => {
    if (!asset) return [];

    // History is descending; reverse for chronological
    const chronological = [...history].reverse();

    if (chronological.length === 0) {
      // Just the current value
      return [
        {
          idx: 0,
          date: new Date().toISOString(),
          value: asset.balance,
          label: formatDate(new Date()),
        },
      ];
    }

    const points: ChartDataPoint[] = [];

    // First point: initial balance (before any recorded updates)
    const firstUpdate = chronological[0];
    points.push({
      idx: 0,
      date: firstUpdate.createdAt,
      value: firstUpdate.previousBalance,
      label: formatDate(firstUpdate.createdAt),
    });

    // Each update's new balance
    for (const update of chronological) {
      points.push({
        idx: points.length,
        date: update.createdAt,
        value: update.newBalance,
        label: formatDate(update.createdAt),
      });
    }

    return points;
  })();

  // Chart note markers: collect from standalone notes AND balance updates with notes
  // x = idx for simple charts; timeX = fractional year offset for combined chart
  const allNoteMarkers = (() => {
    if (chartData.length <= 1) return [];

    const earliestMs = new Date(chartData[0].date).getTime();
    const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

    function findClosestIdx(createdAt: string) {
      const time = new Date(createdAt).getTime();
      let closest = 0;
      for (let i = 0; i < chartData.length; i++) {
        if (new Date(chartData[i].date).getTime() <= time) closest = i;
      }
      return closest;
    }

    function computeTimeX(closestIdx: number) {
      const ptMs = new Date(chartData[closestIdx].date).getTime();
      return Math.round(((ptMs - earliestMs) / MS_PER_YEAR) * 100) / 100;
    }

    const markers: { id: string; content: string; x: number; timeX: number; scrollTarget: string }[] = [];

    for (const note of notes) {
      const idx = findClosestIdx(note.createdAt);
      markers.push({
        id: `n-${note.id}`,
        content: note.content,
        x: chartData[idx].idx,
        timeX: computeTimeX(idx),
        scrollTarget: `note-${note.id}`,
      });
    }

    for (const update of history) {
      if (!update.note) continue;
      const idx = findClosestIdx(update.createdAt);
      markers.push({
        id: `u-${update.id}`,
        content: update.note,
        x: chartData[idx].idx,
        timeX: computeTimeX(idx),
        scrollTarget: `update-${update.id}`,
      });
    }

    return markers;
  })();

  // Build unified timeline
  const timeline: TimelineEntry[] = (() => {
    const entries: TimelineEntry[] = [
      ...history.map((u) => ({ type: "update" as const, data: u, createdAt: u.createdAt })),
      ...notes.map((n) => ({ type: "note" as const, data: n, createdAt: n.createdAt })),
    ];
    entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return entries;
  })();

  // Compute net change stats
  const netChange = history.length > 0 ? asset!.balance - history[history.length - 1].previousBalance : 0;
  const totalUpdates = history.length;

  // Combined history + projection chart data (investment accounts only)
  // Uses time-based x-axis: history dates map to fractional year offsets,
  // projection years continue from "year 0" (today) to avoid visual spike.
  const combinedChartData = (() => {
    if (!asset || asset.type !== "investment") return null;

    const currentBalance = asset.balance;
    const annualContrib = contributions.reduce(
      (sum, c) => sum + c.amount * (FREQ_MULTIPLIER[c.frequency] ?? 12), 0
    );
    const r = (asset.returnRate ?? 0) / 100;
    const v = (asset.returnRateVariance ?? 0) / 100;
    const rLow = Math.max(0, r - v);
    const rHigh = r + v;
    const hasVariance = v > 0;

    const points: CombinedChartPoint[] = [];

    // Compute time-based x-values for history
    // Map dates to fractional years relative to the earliest data point
    const nowMs = Date.now();
    const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
    const earliestMs = chartData.length > 0
      ? new Date(chartData[0].date).getTime()
      : nowMs;
    const historySpanYears = (nowMs - earliestMs) / MS_PER_YEAR;

    // bridgeX = the x-value for "today" (where history ends and projection starts)
    const bridgeX = Math.round(historySpanYears * 100) / 100;

    // History portion: x based on actual date offset in years
    for (const pt of chartData) {
      const ptMs = new Date(pt.date).getTime();
      const yearOffset = (ptMs - earliestMs) / MS_PER_YEAR;
      points.push({
        x: Math.round(yearOffset * 100) / 100,
        label: pt.label,
        historyValue: pt.value,
        projectedExpected: null,
        projectedLow: null,
        projectedRangeSize: null,
      });
    }

    // Bridge point: last history point also starts projection
    const lastHistIdx = points.length - 1;
    if (lastHistIdx >= 0) {
      points[lastHistIdx].projectedExpected = currentBalance;
      if (hasVariance) {
        points[lastHistIdx].projectedLow = currentBalance;
        points[lastHistIdx].projectedRangeSize = 0;
      }
    }

    // Projection portion (yearly increments from bridgeX)
    for (let n = 1; n <= projectionYears; n++) {
      const expected = fvProjection(currentBalance, annualContrib, r, n);
      const low = hasVariance ? fvProjection(currentBalance, annualContrib, rLow, n) : expected;
      const high = hasVariance ? fvProjection(currentBalance, annualContrib, rHigh, n) : expected;

      points.push({
        x: Math.round((bridgeX + n) * 100) / 100,
        label: n % 5 === 0 || n === 1 ? `+${n}yr` : "",
        historyValue: null,
        projectedExpected: Math.round(expected),
        projectedLow: hasVariance ? Math.round(low) : null,
        projectedRangeSize: hasVariance ? Math.round(high - low) : null,
      });
    }

    return { points, bridgeX, hasVariance };
  })();

  function handleProjectionYearsChange(years: number) {
    setProjectionYears(years);
    localStorage.setItem("sb-projection-years", String(years));
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[14px] text-text-secondary">Loading…</p>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-[14px] text-text-secondary">Asset not found.</p>
        <button onClick={() => router.push("/assets")} className="text-[13px] text-accent underline">
          Back to Assets
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/assets")}
          className="flex items-center gap-2 text-[13px] text-text-secondary hover:text-accent"
        >
          <i className="fa-solid fa-arrow-left text-[16px]" />
          Assets
        </button>
        <div className="flex gap-2">
          <button
            onClick={openEdit}
            className="flex items-center gap-2 rounded-full bg-surface-alt px-4 py-2.5 text-[13px] font-medium text-text-secondary hover:text-accent"
          >
            <i className="fa-solid fa-pen text-[16px]" />
            Edit
          </button>
          <button
            onClick={() => setDeleteConfirm(true)}
            className="flex items-center gap-2 rounded-full bg-surface-alt px-4 py-2.5 text-[13px] font-medium text-text-secondary hover:bg-error-light hover:text-error"
          >
            <i className="fa-solid fa-trash text-[16px]" />
            Delete
          </button>
        </div>
      </div>

      {/* Asset header */}
      <div className="mt-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-light/30">
            <span className="fa-solid text-[18px] text-accent">
              {TYPE_ICONS[asset.type] ?? "fa-wallet"}
            </span>
          </div>
          <span className="text-[11px] uppercase tracking-[1.5px] text-text-secondary">
            {TYPE_LABELS[asset.type] ?? asset.type}
          </span>
        </div>
        <h1 className="mt-3 font-headline font-extrabold text-4xl text-text-primary">{asset.name}</h1>

        {/* Large clickable balance */}
        {balanceEditing ? (
          <div className="mt-2">
            <input
              ref={balanceInputRef}
              type="text"
              value={balanceInput}
              onChange={(e) => { setBalanceInput(e.target.value); setBalanceError(null); }}
              onKeyDown={handleBalanceKeyDown}
              onBlur={() => submitBalanceUpdate()}
              disabled={balanceSaving}
              autoFocus
              className={[
                "w-full max-w-md rounded-xl bg-surface-alt px-4 py-3 text-4xl font-bold tracking-tight text-text-primary focus:outline-none focus:ring-2",
                balanceError ? "focus:ring-error" : "focus:ring-accent",
              ].join(" ")}
            />
            {(() => {
              const trimmed = balanceInput.trim();
              if (!trimmed || !isExpression(trimmed)) return null;
              const result = applyExpression(trimmed);
              if (result === null) return null;
              const rounded = Math.round(result * 100) / 100;
              return (
                <div className="mt-2 flex items-center gap-2">
                  <i className="fa-solid fa-arrow-right text-[14px] text-accent" />
                  <span className="text-[13px] font-semibold text-accent">
                    {formatCurrency(rounded, asset.currency)}
                  </span>
                </div>
              );
            })()}
            {balanceError && (
              <div className="mt-2 flex items-center gap-2">
                <i className="fa-solid fa-circle-exclamation text-[14px] text-error" />
                <span className="text-[12px] text-error">{balanceError}</span>
              </div>
            )}
            <p className="mt-1.5 text-[11px] text-text-secondary">
              Enter a value or use math: 8500+200, 8500-100. Press Enter to save, Escape to cancel.
            </p>
          </div>
        ) : (
          <button
            onClick={openBalanceEditor}
            className="group/balance mt-2 flex flex-col items-start gap-1 text-left"
            title="Click to update balance"
          >
            <div className="flex items-center gap-2">
              <p className="text-5xl font-bold tracking-tight text-text-primary group-hover/balance:text-accent transition-colors">
                {formatCurrency(asset.balance, asset.currency)}
              </p>
              <i className="fa-solid fa-pen text-[18px] text-text-secondary/50 group-hover/balance:text-accent group-hover/balance:opacity-100 transition-colors" />
            </div>
            <span className="text-[11px] text-text-secondary/60 group-hover/balance:text-accent transition-colors">
              Click to update balance
            </span>
          </button>
        )}
      </div>

      {/* Asset description */}
      {asset.notes && (
        <p className="mt-3 text-[14px] text-text-secondary">{asset.notes}</p>
      )}

      {/* Quick stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-surface p-5">
          <p className="text-[10px] uppercase tracking-[1.2px] text-text-secondary">Net Change</p>
          <p className={[
            "mt-2 text-xl font-bold",
            netChange > 0 ? "text-success" : netChange < 0 ? "text-error" : "text-text-primary",
          ].join(" ")}>
            {netChange > 0 ? "+" : ""}{formatCurrency(netChange, asset.currency)}
          </p>
          <p className="mt-1 text-[11px] text-text-secondary">since first recorded</p>
        </div>
        <div className="rounded-xl bg-surface p-5">
          <p className="text-[10px] uppercase tracking-[1.2px] text-text-secondary">Updates</p>
          <p className="mt-2 text-xl font-bold text-text-primary">{totalUpdates}</p>
          <p className="mt-1 text-[11px] text-text-secondary">balance changes</p>
        </div>
        <div className="rounded-xl bg-surface p-5">
          <p className="text-[10px] uppercase tracking-[1.2px] text-text-secondary">Last Updated</p>
          <p className="mt-2 text-[15px] font-bold text-text-primary">
            {formatDate(asset.updatedAt)}
          </p>
          <p className="mt-1 text-[11px] text-text-secondary">
            created {formatDate(asset.createdAt)}
          </p>
        </div>
        {asset.type === "investment" && asset.returnRate != null && (
          <div className="rounded-xl bg-surface p-5">
            <p className="text-[10px] uppercase tracking-[1.2px] text-text-secondary">Expected Return</p>
            <p className="mt-2 text-xl font-bold text-accent">{asset.returnRate}%</p>
            <p className="mt-1 text-[11px] text-text-secondary">
              {asset.returnRateVariance ? `+/- ${asset.returnRateVariance}% variance` : "annual"}
            </p>
          </div>
        )}
      </div>

      {/* Balance History Chart */}
      <div className="mt-8 rounded-xl bg-surface p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[2px] text-accent">
              {asset.type === "investment" ? "History & Projection" : "History"}
            </p>
            <h2 className="mt-1 text-xl font-bold text-text-primary">Balance Over Time</h2>
          </div>
          {asset.type === "investment" && chartData.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-text-secondary">Project</label>
              <select
                value={projectionYears}
                onChange={(e) => handleProjectionYearsChange(Number(e.target.value))}
                className="cursor-pointer rounded-xl bg-surface-alt px-3 py-1.5 text-[12px] text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {PROJECTION_YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y} years</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {chartData.length <= 1 ? (
          <div className="mt-6 flex flex-col items-center py-12 text-center">
            <i className="fa-solid fa-chart-line text-[28px] text-text-secondary/40" />
            <p className="mt-3 text-[13px] text-text-secondary">
              Update the balance to start building a history chart.
            </p>
          </div>
        ) : asset.type === "investment" && combinedChartData ? (
          /* Combined history + projection chart for investment accounts */
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={combinedChartData.points} margin={{ top: 28, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="projectionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.08} />
                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="4 4"
                  stroke="var(--color-text-disabled)"
                  strokeOpacity={0.3}
                  vertical={false}
                />
                <XAxis
                  dataKey="x"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                  tickFormatter={(x: number) => {
                    if (Math.abs(x - combinedChartData.bridgeX) < 0.05) return "Now";
                    const pt = combinedChartData.points.find((d) => d.x === x);
                    if (!pt) return "";
                    return pt.label;
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatCompact}
                  width={70}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const byKey: Record<string, number> = {};
                    payload.forEach((p) => {
                      if (p.dataKey && p.value != null) byKey[String(p.dataKey)] = Number(p.value);
                    });
                    const isProjection = (label as number) > combinedChartData.bridgeX;
                    const histVal = byKey["historyValue"];
                    const projVal = byKey["projectedExpected"];
                    const rLow = byKey["projectedLow"];
                    const rSize = byKey["projectedRangeSize"];
                    const inflAdj = byKey["inflationAdjusted"];
                    const fmt = (v: number) => formatCurrencyFull(v, asset.currency);
                    return (
                      <div className="rounded-xl bg-text-primary px-4 py-3 shadow-lg text-[13px] text-white">
                        <p className="text-[11px] uppercase tracking-[1px] text-white/70 mb-2">
                          {isProjection
                            ? `Year ${Math.round((label as number) - combinedChartData.bridgeX)}`
                            : combinedChartData.points.find((p) => p.x === label)?.label ?? ""}
                        </p>
                        {histVal != null && (
                          <p className="font-semibold">Balance: <span className="text-accent-fixed">{fmt(histVal)}</span></p>
                        )}
                        {projVal != null && (
                          <p className="font-semibold">Expected: <span className="text-accent-fixed">{fmt(projVal)}</span></p>
                        )}
                        {combinedChartData.hasVariance && rLow != null && rSize != null && (
                          <p className="text-white/70 mt-1">Range: {fmt(rLow)} – {fmt(rLow + rSize)}</p>
                        )}
                        {inflAdj != null && (
                          <p className="text-white/70 mt-1">Inflation-adj: {fmt(inflAdj)}</p>
                        )}
                      </div>
                    );
                  }}
                />

                {/* Variance bands (projection only) */}
                {combinedChartData.hasVariance && (
                  <>
                    <Area
                      dataKey="projectedLow"
                      stackId="range"
                      fill="transparent"
                      stroke="transparent"
                      isAnimationActive={false}
                      connectNulls={false}
                    />
                    <Area
                      dataKey="projectedRangeSize"
                      stackId="range"
                      fill="var(--color-accent-light)"
                      stroke="transparent"
                      fillOpacity={0.25}
                      isAnimationActive={false}
                      connectNulls={false}
                    />
                  </>
                )}

                {/* History area (solid) */}
                <Area
                  type="monotone"
                  dataKey="historyValue"
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                  fill="url(#balanceGradient)"
                  dot={{ r: 4, fill: "var(--color-accent)", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "var(--color-accent)", strokeWidth: 2, stroke: "white" }}
                  connectNulls={false}
                  isAnimationActive={false}
                />

                {/* Projected expected line (dashed) */}
                <Line
                  type="monotone"
                  dataKey="projectedExpected"
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  activeDot={{ r: 5, fill: "var(--color-accent)", stroke: "var(--color-surface)", strokeWidth: 2 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />

                {/* Inflation-adjusted line removed — will be a chart-level toggle in the future */}

                {/* "Today" divider */}
                <ReferenceLine
                  x={combinedChartData.bridgeX}
                  stroke="var(--color-warning)"
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                  label={{
                    value: "Today",
                    position: "top",
                    fill: "var(--color-warning)",
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />

                {/* Note markers (history portion only) */}
                {allNoteMarkers.map((marker) => (
                  <ReferenceLine
                    key={marker.id}
                    x={marker.timeX}
                    stroke="var(--color-warning)"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                    strokeOpacity={0.35}
                    label={({ viewBox }: { viewBox?: { x?: number } }) => {
                      const cx = viewBox?.x ?? 0;
                      const isHovered = hoveredMarker === marker.id;
                      return (
                        <g>
                          <circle
                            cx={cx}
                            cy={9}
                            r={7}
                            fill={isHovered ? "var(--color-warning)" : "var(--color-warning)"}
                            style={{ cursor: "pointer", transition: "fill 0.15s" }}
                            onClick={() => scrollToEntry(marker.scrollTarget)}
                            onMouseEnter={() => setHoveredMarker(marker.id)}
                            onMouseLeave={() => setHoveredMarker(null)}
                          />
                          <path
                            d={`M${cx - 4},14 Q${cx},22 ${cx + 4},14`}
                            fill={isHovered ? "var(--color-warning)" : "var(--color-warning)"}
                            style={{ cursor: "pointer", transition: "fill 0.15s" }}
                          />
                          <text
                            x={cx}
                            y={12}
                            textAnchor="middle"
                            fill="white"
                            fontSize={9}
                            fontWeight={700}
                            style={{ pointerEvents: "none" }}
                          >
                            ✦
                          </text>
                          <rect
                            x={cx - 14}
                            y={0}
                            width={28}
                            height={24}
                            fill="transparent"
                            style={{ cursor: "pointer" }}
                            onClick={() => scrollToEntry(marker.scrollTarget)}
                            onMouseEnter={() => setHoveredMarker(marker.id)}
                            onMouseLeave={() => setHoveredMarker(null)}
                          />
                          {isHovered && (
                            <foreignObject
                              x={cx - 110}
                              y={24}
                              width={220}
                              height={60}
                              style={{ pointerEvents: "none", overflow: "visible" }}
                            >
                              <div
                                style={{
                                  background: "var(--color-text-primary)",
                                  color: "white",
                                  borderRadius: 8,
                                  padding: "6px 10px",
                                  fontSize: 11,
                                  lineHeight: "1.4",
                                  maxWidth: 200,
                                  margin: "0 auto",
                                  overflow: "hidden",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical" as const,
                                  textOverflow: "ellipsis",
                                  wordBreak: "break-word",
                                }}
                              >
                                {marker.content}
                              </div>
                            </foreignObject>
                          )}
                        </g>
                      );
                    }}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          /* Simple history-only chart for non-investment accounts */
          <div className="mt-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 28, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="balanceGradientSimple" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="4 4"
                  stroke="var(--color-text-disabled)"
                  strokeOpacity={0.3}
                  vertical={false}
                />
                <XAxis
                  dataKey="idx"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                  tickFormatter={(idx: number) => {
                    const pt = chartData.find((d) => d.idx === idx);
                    return pt ? pt.label : "";
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => formatCurrency(v)}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-text-primary)",
                    border: "none",
                    borderRadius: "12px",
                    padding: "8px 14px",
                    fontSize: "12px",
                    color: "white",
                  }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [formatCurrencyFull(Number(value)), "Balance"]}
                  labelStyle={{ color: "rgba(255,255,255,0.7)", fontSize: "11px" }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                  fill="url(#balanceGradientSimple)"
                  dot={{ r: 4, fill: "var(--color-accent)", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "var(--color-accent)", strokeWidth: 2, stroke: "white" }}
                />
                {allNoteMarkers.map((marker) => (
                  <ReferenceLine
                    key={marker.id}
                    x={marker.x}
                    stroke="var(--color-warning)"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                    strokeOpacity={0.35}
                    label={({ viewBox }: { viewBox?: { x?: number } }) => {
                      const cx = viewBox?.x ?? 0;
                      const isHovered = hoveredMarker === marker.id;
                      return (
                        <g>
                          <circle
                            cx={cx}
                            cy={9}
                            r={7}
                            fill={isHovered ? "var(--color-warning)" : "var(--color-warning)"}
                            style={{ cursor: "pointer", transition: "fill 0.15s" }}
                            onClick={() => scrollToEntry(marker.scrollTarget)}
                            onMouseEnter={() => setHoveredMarker(marker.id)}
                            onMouseLeave={() => setHoveredMarker(null)}
                          />
                          <path
                            d={`M${cx - 4},14 Q${cx},22 ${cx + 4},14`}
                            fill={isHovered ? "var(--color-warning)" : "var(--color-warning)"}
                            style={{ cursor: "pointer", transition: "fill 0.15s" }}
                          />
                          <text
                            x={cx}
                            y={12}
                            textAnchor="middle"
                            fill="white"
                            fontSize={9}
                            fontWeight={700}
                            style={{ pointerEvents: "none" }}
                          >
                            ✦
                          </text>
                          <rect
                            x={cx - 14}
                            y={0}
                            width={28}
                            height={24}
                            fill="transparent"
                            style={{ cursor: "pointer" }}
                            onClick={() => scrollToEntry(marker.scrollTarget)}
                            onMouseEnter={() => setHoveredMarker(marker.id)}
                            onMouseLeave={() => setHoveredMarker(null)}
                          />
                          {isHovered && (
                            <foreignObject
                              x={cx - 110}
                              y={24}
                              width={220}
                              height={60}
                              style={{ pointerEvents: "none", overflow: "visible" }}
                            >
                              <div
                                style={{
                                  background: "var(--color-text-primary)",
                                  color: "white",
                                  borderRadius: 8,
                                  padding: "6px 10px",
                                  fontSize: 11,
                                  lineHeight: "1.4",
                                  maxWidth: 200,
                                  margin: "0 auto",
                                  overflow: "hidden",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical" as const,
                                  textOverflow: "ellipsis",
                                  wordBreak: "break-word",
                                }}
                              >
                                {marker.content}
                              </div>
                            </foreignObject>
                          )}
                        </g>
                      );
                    }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Planned Contributions */}
      <div className="mt-8">
        <PlannedContributions
          assetId={asset.id}
          contributions={contributions}
          onUpdate={fetchContributions}
        />
      </div>

      {/* Projection Chart (simple accounts only; investment accounts use combined chart above) */}
      {asset.type !== "investment" && contributions.length > 0 && (
        <div className="mt-8 rounded-xl bg-surface p-8">
          <div>
            <p className="text-[11px] uppercase tracking-[2px] text-accent">Projection</p>
            <h2 className="mt-1 text-xl font-bold text-text-primary">Balance Projection</h2>
            <p className="mt-1 text-[12px] text-text-secondary">
              Projected balance based on your planned contributions over 10 years
            </p>
          </div>
          <div className="mt-6">
            <InvestmentProjectionChart
              balance={asset.balance}
              contributions={contributions}
              returnRate={0}
              returnRateVariance={null}
              includeInflation={false}
              years={10}
            />
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      <div className="mt-8 rounded-xl bg-surface p-8">
        <div>
          <p className="text-[11px] uppercase tracking-[2px] text-accent">Activity</p>
          <h2 className="mt-1 text-xl font-bold text-text-primary">Timeline</h2>
        </div>

        {/* Unified activity input: balance + note */}
        <div className="mt-5 rounded-xl bg-surface-alt p-5">
          <p className="text-[12px] font-medium text-text-secondary mb-3">
            Update your balance, add a note, or both
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <div className="flex items-center gap-2 rounded-xl bg-surface-alt px-4 py-3">
                <i className="fa-solid fa-credit-card text-[16px] text-text-secondary/50" />
                <input
                  type="text"
                  placeholder="New balance or expression"
                  value={activityBalance}
                  onChange={(e) => { setActivityBalance(e.target.value); setActivityError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitActivity(); } }}
                  disabled={activitySaving}
                  className="flex-1 bg-transparent text-[13px] text-text-primary placeholder:text-text-secondary/60 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 rounded-xl bg-surface-alt px-4 py-3">
                <span className="fa-solid text-[16px] text-text-secondary/50">sticky_note_2</span>
                <input
                  type="text"
                  placeholder="Add a note (optional)"
                  value={activityNote}
                  onChange={(e) => setActivityNote(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitActivity(); } }}
                  disabled={activitySaving}
                  className="flex-1 bg-transparent text-[13px] text-text-primary placeholder:text-text-secondary/60 focus:outline-none"
                />
              </div>
            </div>
            <button
              onClick={submitActivity}
              disabled={activitySaving || (!activityBalance.trim() && !activityNote.trim())}
              className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent-hover px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-40 transition-transform active:scale-95"
            >
              <i className="fa-solid fa-circle-plus text-[14px]" />
              Add
            </button>
          </div>
          {(() => {
            const trimmed = activityBalance.trim();
            if (!trimmed || !isExpression(trimmed)) return null;
            const result = applyExpression(trimmed);
            if (result === null) return null;
            return (
              <div className="mt-2 flex items-center gap-2">
                <i className="fa-solid fa-arrow-right text-[14px] text-accent" />
                <span className="text-[13px] font-semibold text-accent">
                  {formatCurrency(Math.round(result * 100) / 100, asset.currency)}
                </span>
              </div>
            );
          })()}
          {activityError && (
            <div className="mt-2 flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation text-[14px] text-error" />
              <span className="text-[12px] text-error">{activityError}</span>
            </div>
          )}
        </div>

        {timeline.length === 0 ? (
          <div className="mt-6 flex flex-col items-center py-10 text-center">
            <i className="fa-solid fa-clock-rotate-left text-[28px] text-text-secondary/40" />
            <p className="mt-3 text-[13px] text-text-secondary">
              No activity yet. Update the balance or add a note to start building your timeline.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-2">
            {timeline.map((entry) => {
              if (entry.type === "update") {
                const update = entry.data;
                return (
                  <div
                    key={`u-${update.id}`}
                    id={`update-${update.id}`}
                    className="flex items-center justify-between rounded-xl bg-surface-alt px-5 py-4 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className={[
                        "flex h-8 w-8 items-center justify-center rounded-full",
                        update.changeAmount > 0
                          ? "bg-success-light/40"
                          : update.changeAmount < 0
                            ? "bg-error-light"
                            : "bg-surface-alt",
                      ].join(" ")}>
                        <span className={[
                          "fa-solid text-[14px]",
                          update.changeAmount > 0
                            ? "text-success"
                            : update.changeAmount < 0
                              ? "text-error"
                              : "text-text-secondary",
                        ].join(" ")}>
                          {update.changeAmount > 0 ? "arrow_upward" : update.changeAmount < 0 ? "arrow_downward" : "remove"}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-text-secondary">
                            {formatCurrencyFull(update.previousBalance)}
                          </span>
                          <i className="fa-solid fa-arrow-right text-[12px] text-text-secondary" />
                          <span className="text-[13px] font-semibold text-text-primary">
                            {formatCurrencyFull(update.newBalance)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-text-secondary">
                          {formatDateTime(update.createdAt)}
                        </p>
                        {update.note && (
                          <p className="mt-1 flex items-center gap-1.5 text-[12px] text-text-secondary">
                            <span className="fa-solid text-[12px] text-warning">sticky_note_2</span>
                            {update.note}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={[
                      "text-[13px] font-semibold",
                      update.changeAmount > 0
                        ? "text-success"
                        : update.changeAmount < 0
                          ? "text-error"
                          : "text-text-secondary",
                    ].join(" ")}>
                      {update.changeAmount > 0 ? "+" : ""}
                      {formatCurrencyFull(update.changeAmount)}
                    </span>
                  </div>
                );
              }

              // Note entry
              const note = entry.data;
              return (
                <div
                  key={`n-${note.id}`}
                  id={`note-${note.id}`}
                  className="flex items-center justify-between rounded-xl bg-warning-light/20 px-5 py-4 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning-light">
                      <span className="fa-solid text-[14px] text-warning">sticky_note_2</span>
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-text-primary">{note.content}</p>
                      <p className="mt-0.5 text-[11px] text-text-secondary">{formatDateTime(note.createdAt)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-text-secondary/40 hover:text-error hover:bg-error-light transition-colors"
                  >
                    <i className="fa-solid fa-xmark text-[14px]" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editOpen && editForm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-text-primary/20 sm:items-center"
          onClick={(e) => { if (e.target === e.currentTarget) setEditOpen(false); }}
        >
          <div className="w-full max-w-2xl rounded-t-2xl bg-surface/80 backdrop-blur-[20px] p-8 shadow-xl sm:rounded-xl sm:max-h-[90vh] sm:overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-headline font-extrabold text-2xl text-text-primary">Edit Asset</h2>
              <button
                onClick={() => setEditOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-alt hover:text-accent"
              >
                <i className="fa-solid fa-xmark text-[18px]" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-text-primary">Asset Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-xl bg-surface-alt px-4 py-3.5 text-[14px] text-text-primary focus:outline-none focus:bg-surface focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                  Notes <span className="font-normal text-text-secondary">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full rounded-xl bg-surface-alt px-4 py-3.5 text-[14px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:bg-surface focus:ring-1 focus:ring-accent"
                />
              </div>

              {/* Investment-specific fields */}
              {asset.type === "investment" && (
                <div className="rounded-xl bg-surface-alt p-4 space-y-4">
                  <p className="text-[12px] font-semibold text-text-secondary uppercase tracking-[1px]">
                    Investment Settings
                  </p>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                        Expected annual return (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="50"
                        value={editForm.returnRate}
                        onChange={(e) => setEditForm({ ...editForm, returnRate: e.target.value })}
                        className="w-full rounded-xl bg-surface-alt px-4 py-3.5 text-[14px] text-text-primary focus:outline-none focus:bg-surface focus:ring-1 focus:ring-accent"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                        Variance (+/- %)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="20"
                        value={editForm.returnRateVariance}
                        onChange={(e) => setEditForm({ ...editForm, returnRateVariance: e.target.value })}
                        className="w-full rounded-xl bg-surface-alt px-4 py-3.5 text-[14px] text-text-primary focus:outline-none focus:bg-surface focus:ring-1 focus:ring-accent"
                      />
                    </div>
                  </div>

                </div>
              )}

              <p className="text-[11px] text-text-secondary">
                To update the balance, use the clickable balance display on the detail page.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="flex-1 rounded-full bg-surface-alt py-3 text-[14px] font-semibold text-text-secondary transition-transform active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-full bg-gradient-to-r from-accent to-accent-hover py-3 text-[14px] font-semibold text-white disabled:opacity-50 transition-transform active:scale-95"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/20"
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(false); }}
        >
          <div className="w-full max-w-sm rounded-xl bg-surface/80 backdrop-blur-[20px] p-8 shadow-xl">
            <h2 className="font-headline font-extrabold text-2xl text-text-primary">Delete asset?</h2>
            <p className="mt-2 text-[14px] text-text-secondary">
              This will permanently remove <strong>{asset.name}</strong> and its history. This cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 rounded-full bg-surface-alt py-3 text-[14px] font-semibold text-text-secondary transition-transform active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 rounded-full bg-error py-3 text-[14px] font-semibold text-white transition-transform active:scale-95"
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
