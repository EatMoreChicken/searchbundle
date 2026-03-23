"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import type { Asset, BalanceUpdate } from "@/types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
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

interface ChartDataPoint {
  date: string;
  value: number;
  label: string;
}

interface EditFormState {
  name: string;
  notes: string;
}

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [history, setHistory] = useState<BalanceUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Inline balance editor
  const [balanceEditing, setBalanceEditing] = useState(false);
  const [balanceInput, setBalanceInput] = useState("");
  const [balanceSaving, setBalanceSaving] = useState(false);
  const balanceInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    fetchAsset();
    fetchHistory();
  }, [fetchAsset, fetchHistory]);

  function openBalanceEditor() {
    if (!asset) return;
    setBalanceInput(String(asset.balance));
    setBalanceEditing(true);
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
      return;
    }

    let newBalance: number;

    if (isExpression(trimmed)) {
      const result = applyExpression(trimmed);
      if (result === null) {
        setBalanceEditing(false);
        return;
      }
      newBalance = Math.round(result * 100) / 100;
    } else {
      const parsed = parseFloat(trimmed);
      if (isNaN(parsed)) {
        setBalanceEditing(false);
        return;
      }
      newBalance = Math.round(parsed * 100) / 100;
    }

    setBalanceSaving(true);
    try {
      await apiClient.post(`/api/assets/${id}/history`, { newBalance });
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
    }
  }

  function openEdit() {
    if (!asset) return;
    setEditForm({
      name: asset.name,
      notes: asset.notes ?? "",
    });
    setEditOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm || !asset) return;
    setSaving(true);
    try {
      await apiClient.put(`/api/assets/${asset.id}`, {
        name: editForm.name,
        notes: editForm.notes || null,
      });
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

  // Build chart data from history (reversed so oldest is first) + current balance
  const chartData: ChartDataPoint[] = (() => {
    if (!asset) return [];

    // History is descending; reverse for chronological
    const chronological = [...history].reverse();

    if (chronological.length === 0) {
      // Just the current value
      return [
        {
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
      date: firstUpdate.createdAt,
      value: firstUpdate.previousBalance,
      label: formatDate(firstUpdate.createdAt),
    });

    // Each update's new balance
    for (const update of chronological) {
      points.push({
        date: update.createdAt,
        value: update.newBalance,
        label: formatDate(update.createdAt),
      });
    }

    return points;
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
              onChange={(e) => setBalanceInput(e.target.value)}
              onKeyDown={handleBalanceKeyDown}
              onBlur={() => submitBalanceUpdate()}
              disabled={balanceSaving}
              autoFocus
              className="w-full max-w-md rounded-xl bg-surface-container-high px-4 py-3 text-4xl font-bold tracking-tight text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
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
            <p className="mt-1.5 text-[11px] text-on-surface-variant">
              Type a new value to set the balance, or append an operator to calculate: 8500+200, 8500-100, -100+50. Press Enter to save, Escape to cancel.
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
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
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
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--color-on-surface-variant)" }}
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
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Update History Table */}
      <div className="mt-8 rounded-2xl bg-surface-container-lowest p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[2px] text-primary">Activity</p>
            <h2 className="mt-1 text-xl font-bold text-on-surface">Update History</h2>
          </div>
          <button
            onClick={openBalanceEditor}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-container px-4 py-2.5 text-[13px] font-semibold text-on-primary transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-[14px]">edit</span>
            Update Balance
          </button>
        </div>

        {history.length === 0 ? (
          <div className="mt-6 flex flex-col items-center py-10 text-center">
            <span className="material-symbols-outlined text-[28px] text-on-surface-variant/40">history</span>
            <p className="mt-3 text-[13px] text-on-surface-variant">
              No updates yet. Click the balance above or the &quot;Update Balance&quot; button to record a change.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-2">
            {history.map((update) => (
              <div
                key={update.id}
                className="flex items-center justify-between rounded-xl bg-surface-container-low px-5 py-4"
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
                      {update.note && <span className="ml-2">{update.note}</span>}
                    </p>
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
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      {asset.notes && (
        <div className="mt-6 rounded-xl bg-surface-container-lowest p-6">
          <p className="text-[10px] uppercase tracking-[1.2px] text-on-surface-variant">Notes</p>
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
