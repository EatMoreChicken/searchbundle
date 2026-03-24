"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import type { Asset, BalanceUpdate, AccountNote, AccountContribution } from "@/types";
import PlannedContributions from "@/components/PlannedContributions";
import InvestmentProjectionChart from "@/components/InvestmentProjectionChart";
import {
  AreaChart,
  Area,
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
  simple: "account_balance_wallet",
  investment: "trending_up",
  savings: "savings",
  hsa: "favorite",
  property: "home",
  other: "radio_button_checked",
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
  includeInflation: boolean;
}

type TimelineEntry =
  | { type: "update"; data: BalanceUpdate; createdAt: string }
  | { type: "note"; data: AccountNote; createdAt: string };

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
      includeInflation: asset.includeInflation,
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
        payload.includeInflation = editForm.includeInflation;
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
  const allNoteMarkers = (() => {
    if (chartData.length <= 1) return [];

    function findClosestIdx(createdAt: string) {
      const time = new Date(createdAt).getTime();
      let closest = 0;
      for (let i = 0; i < chartData.length; i++) {
        if (new Date(chartData[i].date).getTime() <= time) closest = i;
      }
      return chartData[closest].idx;
    }

    const markers: { id: string; content: string; x: number; scrollTarget: string }[] = [];

    for (const note of notes) {
      markers.push({
        id: `n-${note.id}`,
        content: note.content,
        x: findClosestIdx(note.createdAt),
        scrollTarget: `note-${note.id}`,
      });
    }

    for (const update of history) {
      if (!update.note) continue;
      markers.push({
        id: `u-${update.id}`,
        content: update.note,
        x: findClosestIdx(update.createdAt),
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
            <span className="material-symbols-outlined text-[18px] text-primary">
              {TYPE_ICONS[asset.type] ?? "account_balance_wallet"}
            </span>
          </div>
          <span className="text-[11px] uppercase tracking-[1.5px] text-on-surface-variant">
            {TYPE_LABELS[asset.type] ?? asset.type}
          </span>
        </div>
        <h1 className="mt-3 font-headline font-extrabold text-4xl text-on-surface">{asset.name}</h1>

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
                "w-full max-w-md rounded-xl bg-surface-container-high px-4 py-3 text-4xl font-bold tracking-tight text-on-surface focus:outline-none focus:ring-2",
                balanceError ? "focus:ring-error" : "focus:ring-primary",
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
                  <span className="material-symbols-outlined text-[14px] text-primary">arrow_forward</span>
                  <span className="text-[13px] font-semibold text-primary">
                    {formatCurrency(rounded, asset.currency)}
                  </span>
                </div>
              );
            })()}
            {balanceError && (
              <div className="mt-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px] text-error">error</span>
                <span className="text-[12px] text-error">{balanceError}</span>
              </div>
            )}
            <p className="mt-1.5 text-[11px] text-on-surface-variant">
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
              <p className="text-5xl font-bold tracking-tight text-on-surface group-hover/balance:text-primary transition-colors">
                {formatCurrency(asset.balance, asset.currency)}
              </p>
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant/50 group-hover/balance:text-primary group-hover/balance:opacity-100 transition-colors">
                edit
              </span>
            </div>
            <span className="text-[11px] text-on-surface-variant/60 group-hover/balance:text-primary transition-colors">
              Click to update balance
            </span>
          </button>
        )}
      </div>

      {/* Quick stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-surface-container-lowest p-5">
          <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">Net Change</p>
          <p className={[
            "mt-2 text-xl font-bold",
            netChange > 0 ? "text-secondary" : netChange < 0 ? "text-error" : "text-on-surface",
          ].join(" ")}>
            {netChange > 0 ? "+" : ""}{formatCurrency(netChange, asset.currency)}
          </p>
          <p className="mt-1 text-[11px] text-on-surface-variant">since first recorded</p>
        </div>
        <div className="rounded-xl bg-surface-container-lowest p-5">
          <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">Updates</p>
          <p className="mt-2 text-xl font-bold text-on-surface">{totalUpdates}</p>
          <p className="mt-1 text-[11px] text-on-surface-variant">balance changes</p>
        </div>
        <div className="rounded-xl bg-surface-container-lowest p-5">
          <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">Last Updated</p>
          <p className="mt-2 text-[15px] font-bold text-on-surface">
            {formatDate(asset.updatedAt)}
          </p>
          <p className="mt-1 text-[11px] text-on-surface-variant">
            created {formatDate(asset.createdAt)}
          </p>
        </div>
        {asset.type === "investment" && asset.returnRate != null && (
          <div className="rounded-xl bg-surface-container-lowest p-5">
            <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">Expected Return</p>
            <p className="mt-2 text-xl font-bold text-primary">{asset.returnRate}%</p>
            <p className="mt-1 text-[11px] text-on-surface-variant">
              {asset.returnRateVariance ? `+/- ${asset.returnRateVariance}% variance` : "annual"}
            </p>
          </div>
        )}
      </div>

      {/* Balance History Chart */}
      <div className="mt-8 rounded-2xl bg-surface-container-lowest p-8">
        <div>
          <p className="text-[11px] uppercase tracking-[2px] text-primary">History</p>
          <h2 className="mt-1 text-xl font-bold text-on-surface">Balance Over Time</h2>
        </div>

        {chartData.length <= 1 ? (
          <div className="mt-6 flex flex-col items-center py-12 text-center">
            <span className="material-symbols-outlined text-[28px] text-on-surface-variant/40">show_chart</span>
            <p className="mt-3 text-[13px] text-on-surface-variant">
              Update the balance to start building a history chart.
            </p>
          </div>
        ) : (
          <div className="mt-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 28, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="4 4"
                  stroke="var(--color-outline-variant)"
                  strokeOpacity={0.3}
                  vertical={false}
                />
                <XAxis
                  dataKey="idx"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tick={{ fontSize: 11, fill: "var(--color-on-surface-variant)" }}
                  tickFormatter={(idx: number) => {
                    const pt = chartData.find((d) => d.idx === idx);
                    return pt ? pt.label : "";
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-on-surface-variant)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => formatCurrency(v)}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-on-surface)",
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
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#balanceGradient)"
                  dot={{ r: 4, fill: "var(--color-primary)", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "var(--color-primary)", strokeWidth: 2, stroke: "white" }}
                />
                {allNoteMarkers.map((marker) => (
                  <ReferenceLine
                    key={marker.id}
                    x={marker.x}
                    stroke="var(--color-tertiary)"
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
                            fill={isHovered ? "var(--color-tertiary-container)" : "var(--color-tertiary)"}
                            style={{ cursor: "pointer", transition: "fill 0.15s" }}
                            onClick={() => scrollToEntry(marker.scrollTarget)}
                            onMouseEnter={() => setHoveredMarker(marker.id)}
                            onMouseLeave={() => setHoveredMarker(null)}
                          />
                          <path
                            d={`M${cx - 4},14 Q${cx},22 ${cx + 4},14`}
                            fill={isHovered ? "var(--color-tertiary-container)" : "var(--color-tertiary)"}
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
                                  background: "var(--color-on-surface)",
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

      {/* Projection Chart */}
      {contributions.length > 0 && (
        <div className="mt-8 rounded-2xl bg-surface-container-lowest p-8">
          <div>
            <p className="text-[11px] uppercase tracking-[2px] text-primary">Projection</p>
            <h2 className="mt-1 text-xl font-bold text-on-surface">
              {asset.type === "investment" ? "Growth Projection" : "Balance Projection"}
            </h2>
            <p className="mt-1 text-[12px] text-on-surface-variant">
              {asset.type === "investment"
                ? "Estimated growth based on your contributions and expected return rate"
                : "Projected balance based on your planned contributions over 10 years"}
            </p>
          </div>
          <div className="mt-6">
            <InvestmentProjectionChart
              balance={asset.balance}
              contributions={contributions}
              returnRate={asset.type === "investment" ? asset.returnRate : 0}
              returnRateVariance={asset.type === "investment" ? asset.returnRateVariance : null}
              includeInflation={asset.type === "investment" ? asset.includeInflation : false}
              years={10}
            />
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      <div className="mt-8 rounded-2xl bg-surface-container-lowest p-8">
        <div>
          <p className="text-[11px] uppercase tracking-[2px] text-primary">Activity</p>
          <h2 className="mt-1 text-xl font-bold text-on-surface">Timeline</h2>
        </div>

        {/* Unified activity input: balance + note */}
        <div className="mt-5 rounded-xl bg-surface-container p-5">
          <p className="text-[12px] font-medium text-on-surface-variant mb-3">
            Update your balance, add a note, or both
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <div className="flex items-center gap-2 rounded-xl bg-surface-container-high px-4 py-3">
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant/50">payments</span>
                <input
                  type="text"
                  placeholder="New balance or expression"
                  value={activityBalance}
                  onChange={(e) => { setActivityBalance(e.target.value); setActivityError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitActivity(); } }}
                  disabled={activitySaving}
                  className="flex-1 bg-transparent text-[13px] text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 rounded-xl bg-surface-container-high px-4 py-3">
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant/50">sticky_note_2</span>
                <input
                  type="text"
                  placeholder="Add a note (optional)"
                  value={activityNote}
                  onChange={(e) => setActivityNote(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitActivity(); } }}
                  disabled={activitySaving}
                  className="flex-1 bg-transparent text-[13px] text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none"
                />
              </div>
            </div>
            <button
              onClick={submitActivity}
              disabled={activitySaving || (!activityBalance.trim() && !activityNote.trim())}
              className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-container px-5 py-2.5 text-[13px] font-semibold text-on-primary disabled:opacity-40 transition-transform active:scale-95"
            >
              <span className="material-symbols-outlined text-[14px]">add_circle</span>
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
                <span className="material-symbols-outlined text-[14px] text-primary">arrow_forward</span>
                <span className="text-[13px] font-semibold text-primary">
                  {formatCurrency(Math.round(result * 100) / 100, asset.currency)}
                </span>
              </div>
            );
          })()}
          {activityError && (
            <div className="mt-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px] text-error">error</span>
              <span className="text-[12px] text-error">{activityError}</span>
            </div>
          )}
        </div>

        {timeline.length === 0 ? (
          <div className="mt-6 flex flex-col items-center py-10 text-center">
            <span className="material-symbols-outlined text-[28px] text-on-surface-variant/40">history</span>
            <p className="mt-3 text-[13px] text-on-surface-variant">
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
                    className="flex items-center justify-between rounded-xl bg-surface-container-low px-5 py-4 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className={[
                        "flex h-8 w-8 items-center justify-center rounded-full",
                        update.changeAmount > 0
                          ? "bg-secondary-fixed/40"
                          : update.changeAmount < 0
                            ? "bg-error-container"
                            : "bg-surface-container-high",
                      ].join(" ")}>
                        <span className={[
                          "material-symbols-outlined text-[14px]",
                          update.changeAmount > 0
                            ? "text-secondary"
                            : update.changeAmount < 0
                              ? "text-error"
                              : "text-on-surface-variant",
                        ].join(" ")}>
                          {update.changeAmount > 0 ? "arrow_upward" : update.changeAmount < 0 ? "arrow_downward" : "remove"}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-on-surface-variant">
                            {formatCurrencyFull(update.previousBalance)}
                          </span>
                          <span className="material-symbols-outlined text-[12px] text-on-surface-variant">arrow_forward</span>
                          <span className="text-[13px] font-semibold text-on-surface">
                            {formatCurrencyFull(update.newBalance)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-on-surface-variant">
                          {formatDateTime(update.createdAt)}
                        </p>
                        {update.note && (
                          <p className="mt-1 flex items-center gap-1.5 text-[12px] text-on-surface-variant">
                            <span className="material-symbols-outlined text-[12px] text-tertiary">sticky_note_2</span>
                            {update.note}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={[
                      "text-[13px] font-semibold",
                      update.changeAmount > 0
                        ? "text-secondary"
                        : update.changeAmount < 0
                          ? "text-error"
                          : "text-on-surface-variant",
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
                  className="flex items-center justify-between rounded-xl bg-tertiary-fixed/20 px-5 py-4 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-tertiary-fixed">
                      <span className="material-symbols-outlined text-[14px] text-on-tertiary-fixed-variant">sticky_note_2</span>
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-on-surface">{note.content}</p>
                      <p className="mt-0.5 text-[11px] text-on-surface-variant">{formatDateTime(note.createdAt)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-on-surface-variant/40 hover:text-error hover:bg-error-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Asset description notes */}
      {asset.notes && (
        <div className="mt-6 rounded-xl bg-surface-container-lowest p-6">
          <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">Description</p>
          <p className="mt-2 text-[14px] text-on-surface-variant">{asset.notes}</p>
        </div>
      )}

      {/* Edit Modal */}
      {editOpen && editForm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-on-surface/20 sm:items-center"
          onClick={(e) => { if (e.target === e.currentTarget) setEditOpen(false); }}
        >
          <div className="w-full max-w-lg rounded-t-2xl bg-surface-container-lowest/80 backdrop-blur-[20px] p-8 shadow-xl sm:rounded-2xl sm:max-h-[90vh] sm:overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-headline font-extrabold text-2xl text-on-surface">Edit Asset</h2>
              <button
                onClick={() => setEditOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
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
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-xl bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-on-surface">
                  Notes <span className="font-normal text-on-surface-variant">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full rounded-xl bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Investment-specific fields */}
              {asset.type === "investment" && (
                <div className="rounded-xl bg-surface-container-low p-4 space-y-4">
                  <p className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-[1px]">
                    Investment Settings
                  </p>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="mb-1.5 block text-[13px] font-medium text-on-surface">
                        Expected annual return (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="50"
                        value={editForm.returnRate}
                        onChange={(e) => setEditForm({ ...editForm, returnRate: e.target.value })}
                        className="w-full rounded-xl bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="mb-1.5 block text-[13px] font-medium text-on-surface">
                        Variance (+/- %)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="20"
                        value={editForm.returnRateVariance}
                        onChange={(e) => setEditForm({ ...editForm, returnRateVariance: e.target.value })}
                        className="w-full rounded-xl bg-surface-container-high px-4 py-3.5 text-[14px] text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.includeInflation}
                      onChange={(e) => setEditForm({ ...editForm, includeInflation: e.target.checked })}
                      className="h-4 w-4 rounded accent-primary"
                    />
                    <span className="text-[13px] text-on-surface">
                      Show inflation-adjusted values (3% annual)
                    </span>
                  </label>
                </div>
              )}

              <p className="text-[11px] text-on-surface-variant">
                To update the balance, use the clickable balance display on the detail page.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="flex-1 rounded-full bg-surface-container-low py-3 text-[14px] font-semibold text-on-surface-variant transition-transform active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-full bg-gradient-to-r from-primary to-primary-container py-3 text-[14px] font-semibold text-on-primary disabled:opacity-50 transition-transform active:scale-95"
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
                className="flex-1 rounded-full bg-surface-container-low py-3 text-[14px] font-semibold text-on-surface-variant transition-transform active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 rounded-full bg-error py-3 text-[14px] font-semibold text-on-primary transition-transform active:scale-95"
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
