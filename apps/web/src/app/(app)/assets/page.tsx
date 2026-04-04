"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import type { Asset, AssetType } from "@/types";

const ASSET_TYPES: {
  value: AssetType;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    value: "simple",
    label: "Simple Account",
    icon: "fa-wallet",
    description:
      "A basic account with no interest or growth. Examples: checking account, cash savings, petty cash, gift cards, or any balance you want to track.",
  },
  {
    value: "investment",
    label: "Investment Account",
    icon: "fa-arrow-trend-up",
    description:
      "An account that grows over time with an expected return rate. Examples: 401(k), IRA, brokerage account, index funds.",
  },
];

const TYPE_ICON_NAMES: Record<string, string> = {
  simple: "fa-wallet",
  investment: "fa-arrow-trend-up",
  savings: "fa-piggy-bank",
  hsa: "fa-heart",
  property: "fa-house",
  other: "fa-circle-dot",
};

const TYPE_LABELS: Record<string, string> = {
  simple: "Simple Account",
  investment: "Investment",
  savings: "Savings",
  hsa: "HSA",
  property: "Property",
  other: "Other",
};

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
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

interface FormState {
  name: string;
  type: AssetType;
  balance: string;
  currency: string;
  notes: string;
  returnRate: string;
  returnRateVariance: string;
}

const emptyForm: FormState = {
  name: "",
  type: "simple",
  balance: "",
  currency: "USD",
  notes: "",
  returnRate: "7",
  returnRateVariance: "2",
};

export default function AssetsPage() {
  const router = useRouter();
  const [assetList, setAssetList] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState<string | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);

  async function fetchAssets() {
    setLoading(true);
    try {
      const data = await apiClient.get<Asset[]>("/api/assets?includeArchived=true");
      setAssetList(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAssets();
  }, []);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(asset: Asset, e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(asset);
    setForm({
      name: asset.name,
      type: asset.type,
      balance: String(asset.balance),
      currency: asset.currency,
      notes: asset.notes ?? "",
      returnRate: asset.returnRate != null ? String(asset.returnRate) : "7",
      returnRateVariance: asset.returnRateVariance != null ? String(asset.returnRateVariance) : "2",
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        type: form.type,
        balance: form.balance,
        currency: form.currency,
        notes: form.notes || null,
      };
      if (form.type === "investment") {
        payload.returnRate = form.returnRate ? parseFloat(form.returnRate) : null;
        payload.returnRateVariance = form.returnRateVariance ? parseFloat(form.returnRateVariance) : null;
      }
      if (editing) {
        await apiClient.put(`/api/assets/${editing.id}`, payload);
      } else {
        await apiClient.post("/api/assets", payload);
      }
      await fetchAssets();
      closeModal();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await apiClient.delete(`/api/assets/${id}`);
    setDeleteConfirm(null);
    await fetchAssets();
  }

  async function handleArchive(id: string) {
    await apiClient.put(`/api/assets/${id}`, { archivedAt: new Date().toISOString() });
    setArchiveConfirm(null);
    await fetchAssets();
  }

  async function handleUnarchive(id: string) {
    await apiClient.put(`/api/assets/${id}`, { archivedAt: null });
    await fetchAssets();
  }

  const activeAssets = assetList.filter((a) => !a.archivedAt);
  const archivedAssets = assetList.filter((a) => !!a.archivedAt);
  const totalBalance = activeAssets.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[2px] text-accent">Finances</p>
          <h1 className="mt-1 font-headline font-extrabold text-4xl text-text-primary">Assets</h1>
          {assetList.length > 0 && (
            <p className="mt-2 text-[14px] text-text-secondary">
              Total assets:{" "}
              <span className="font-bold text-text-primary">{formatCurrency(totalBalance)}</span>
            </p>
          )}
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent-hover px-5 py-3 text-[14px] font-semibold text-white transition-transform active:scale-95"
        >
          <i className="fa-solid fa-plus text-[16px]" />
          Add Asset
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="mt-16 text-center text-[14px] text-text-secondary">Loading…</div>
      ) : activeAssets.length === 0 && archivedAssets.length === 0 ? (
        <div className="mt-16 flex flex-col items-center rounded-xl bg-surface-alt px-12 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent-light/30">
            <i className="fa-solid fa-piggy-bank text-[22px] text-accent" />
          </div>
          <h2 className="mt-5 font-headline font-extrabold text-2xl text-text-primary">No assets yet</h2>
          <p className="mt-2 max-w-sm text-[14px] text-text-secondary">
            Add your accounts to start building your financial picture. Track checking accounts, cash reserves, and more.
          </p>
          <button
            onClick={openAdd}
            className="mt-6 rounded-full bg-gradient-to-r from-accent to-accent-hover px-6 py-3 text-[14px] font-semibold text-white transition-transform active:scale-95"
          >
            Add Your First Asset
          </button>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {activeAssets.length > 0 && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {activeAssets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => router.push(`/assets/${asset.id}`)}
                  className="group relative cursor-pointer rounded-xl bg-surface p-8 transition-transform hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-light/30">
                        <i className={`fa-solid ${TYPE_ICON_NAMES[asset.type] ?? "fa-wallet"} text-[16px] text-accent`} />
                      </div>
                      <span className="text-[11px] uppercase tracking-[1px] text-text-secondary">
                        {TYPE_LABELS[asset.type] ?? asset.type}
                      </span>
                    </div>
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={(e) => openEdit(asset, e)}
                        className="flex h-8 w-8 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-alt hover:text-accent"
                      >
                        <i className="fa-solid fa-pen text-[14px]" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setArchiveConfirm(asset.id); }}
                        className="flex h-8 w-8 items-center justify-center rounded-xl text-text-secondary hover:bg-warning-light hover:text-warning"
                        title="Archive"
                      >
                        <i className="fa-solid fa-box-archive text-[14px]" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(asset.id); }}
                        className="flex h-8 w-8 items-center justify-center rounded-xl text-text-secondary hover:bg-error-light hover:text-error"
                      >
                        <i className="fa-solid fa-trash text-[14px]" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-4 text-[17px] font-semibold text-text-primary">{asset.name}</p>
                  <p className="mt-1 text-3xl font-bold tracking-tight text-text-primary">
                    {formatCurrency(asset.balance, asset.currency)}
                  </p>

                  {asset.balance === 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setArchiveConfirm(asset.id); }}
                      className="mt-3 flex items-center gap-1.5 rounded-full bg-warning-light/50 px-3 py-1.5 text-[11px] font-semibold text-warning transition-colors hover:bg-warning-light"
                    >
                      <i className="fa-solid fa-box-archive text-[14px]" />
                      Balance is zero. Archive this?
                    </button>
                  )}

                  {asset.notes && (
                    <p className="mt-3 text-[12px] text-text-secondary line-clamp-2">{asset.notes}</p>
                  )}

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[11px] text-text-secondary">
                      Added {formatDate(asset.createdAt)}
                    </span>
                    <div className="flex items-center gap-1 text-[12px] text-text-secondary">
                      <i className="fa-solid fa-arrow-right text-[14px]" />
                      <span>View details</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeAssets.length === 0 && archivedAssets.length > 0 && (
            <div className="flex flex-col items-center rounded-xl bg-surface-alt px-12 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent-light/30">
                <i className="fa-solid fa-piggy-bank text-[22px] text-accent" />
              </div>
              <h2 className="mt-5 font-headline font-extrabold text-2xl text-text-primary">All assets archived</h2>
              <p className="mt-2 max-w-sm text-[14px] text-text-secondary">
                All your assets are currently archived. Add a new one or restore an archived asset below.
              </p>
              <button
                onClick={openAdd}
                className="mt-6 rounded-full bg-gradient-to-r from-accent to-accent-hover px-6 py-3 text-[14px] font-semibold text-white transition-transform active:scale-95"
              >
                Add Asset
              </button>
            </div>
          )}

          {archivedAssets.length > 0 && (
            <div>
              <button
                onClick={() => setArchivedOpen(!archivedOpen)}
                className="flex items-center gap-2 text-[13px] font-semibold text-text-secondary hover:text-accent"
              >
                <span className="fa-solid text-[18px]" style={{ transform: archivedOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                  chevron_right
                </span>
                Archived ({archivedAssets.length})
              </button>

              {archivedOpen && (
                <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {archivedAssets.map((asset) => (
                    <div
                      key={asset.id}
                      onClick={() => router.push(`/assets/${asset.id}`)}
                      className="group relative cursor-pointer rounded-xl bg-surface-alt p-8 opacity-60 transition-all hover:opacity-100"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-alt">
                            <i className={`fa-solid ${TYPE_ICON_NAMES[asset.type] ?? "fa-wallet"} text-[16px] text-text-secondary`} />
                          </div>
                          <span className="text-[11px] uppercase tracking-[1px] text-text-secondary">
                            {TYPE_LABELS[asset.type] ?? asset.type}
                          </span>
                        </div>
                        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUnarchive(asset.id); }}
                            className="flex h-8 w-8 items-center justify-center rounded-xl text-text-secondary hover:bg-accent-light hover:text-accent"
                            title="Restore"
                          >
                            <i className="fa-solid fa-box-open text-[14px]" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(asset.id); }}
                            className="flex h-8 w-8 items-center justify-center rounded-xl text-text-secondary hover:bg-error-light hover:text-error"
                          >
                            <i className="fa-solid fa-trash text-[14px]" />
                          </button>
                        </div>
                      </div>

                      <p className="mt-4 text-[17px] font-semibold text-text-primary">{asset.name}</p>
                      <p className="mt-1 text-3xl font-bold tracking-tight text-text-secondary">
                        {formatCurrency(asset.balance, asset.currency)}
                      </p>

                      <div className="mt-3 flex items-center gap-1.5">
                        <i className="fa-solid fa-box-archive text-[14px] text-text-secondary" />
                        <span className="text-[11px] text-text-secondary">
                          Archived {asset.archivedAt ? formatDate(asset.archivedAt) : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-text-primary/20 sm:items-center"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="w-full max-w-2xl rounded-t-2xl bg-surface p-8 shadow-xl sm:rounded-xl sm:max-h-[90vh] sm:overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-headline font-extrabold text-2xl text-text-primary">
                {editing ? "Edit Asset" : "New Asset"}
              </h2>
              <button
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-alt hover:text-accent"
              >
                <i className="fa-solid fa-xmark text-[18px]" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* Type picker (card-based) */}
              {!editing && (
                <div>
                  <label className="mb-2 block text-[13px] font-medium text-text-primary">
                    What type of asset is this?
                  </label>
                  <div className="space-y-2">
                    {ASSET_TYPES.map((at) => (
                      <button
                        type="button"
                        key={at.value}
                        onClick={() => setForm({ ...form, type: at.value })}
                        className={[
                          "flex w-full items-start gap-3 rounded-xl p-4 text-left transition-colors",
                          form.type === at.value
                            ? "bg-accent-light/30 ring-1 ring-primary/20"
                            : "bg-surface-alt hover:bg-surface-alt",
                        ].join(" ")}
                      >
                        <div className={[
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                          form.type === at.value
                            ? "bg-accent text-white"
                            : "bg-surface-alt text-text-secondary",
                        ].join(" ")}>
                          <i className={`fa-solid ${at.icon} text-[20px]`} />
                        </div>
                        <div className="min-w-0">
                          <p className={[
                            "text-[14px] font-semibold",
                            form.type === at.value ? "text-accent" : "text-text-primary",
                          ].join(" ")}>
                            {at.label}
                          </p>
                          <p className="mt-0.5 text-[12px] text-text-secondary leading-relaxed">
                            {at.description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                  What do you call this account?
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chase Checking, Emergency Fund"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl bg-surface-alt px-4 py-3.5 text-[14px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:bg-surface focus:ring-1 focus:ring-accent"
                />
              </div>

              {!editing && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                      Current balance
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={form.balance}
                      onChange={(e) => setForm({ ...form, balance: e.target.value })}
                      className="w-full rounded-xl bg-surface-alt px-4 py-3.5 text-[15px] font-bold text-text-primary placeholder:font-normal placeholder:text-text-secondary focus:outline-none focus:bg-surface focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <div className="w-24">
                    <label className="mb-1.5 block text-[13px] font-medium text-text-primary">Currency</label>
                    <input
                      type="text"
                      maxLength={3}
                      value={form.currency}
                      onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                      className="w-full rounded-xl bg-surface-alt px-4 py-3.5 text-[14px] text-text-primary focus:outline-none focus:bg-surface focus:ring-1 focus:ring-accent"
                    />
                  </div>
                </div>
              )}

              {/* Investment-specific fields */}
              {form.type === "investment" && (
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
                        placeholder="7"
                        value={form.returnRate}
                        onChange={(e) => setForm({ ...form, returnRate: e.target.value })}
                        className="w-full rounded-xl bg-surface-alt px-4 py-3.5 text-[14px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:bg-surface focus:ring-1 focus:ring-accent"
                      />
                      <p className="mt-1 text-[11px] text-text-secondary">
                        The average annual return you expect. S&P 500 averages ~10% historically.
                      </p>
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
                        placeholder="2"
                        value={form.returnRateVariance}
                        onChange={(e) => setForm({ ...form, returnRateVariance: e.target.value })}
                        className="w-full rounded-xl bg-surface-alt px-4 py-3.5 text-[14px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:bg-surface focus:ring-1 focus:ring-accent"
                      />
                      <p className="mt-1 text-[11px] text-text-secondary">
                        Shows best/worst case bands on the projection chart.
                      </p>
                    </div>
                  </div>

                </div>
              )}

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-text-primary">
                  Notes <span className="font-normal text-text-secondary">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Any notes about this account…"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-xl bg-surface-alt px-4 py-3.5 text-[14px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:bg-surface focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-full bg-surface-alt py-3 text-[14px] font-semibold text-text-secondary transition-transform active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-full bg-gradient-to-r from-accent to-accent-hover py-3 text-[14px] font-semibold text-white disabled:opacity-50 transition-transform active:scale-95"
                >
                  {saving ? "Saving…" : editing ? "Save Changes" : "Add Asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive confirmation */}
      {archiveConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/20"
          onClick={(e) => { if (e.target === e.currentTarget) setArchiveConfirm(null); }}
        >
          <div className="w-full max-w-sm rounded-xl bg-surface/80 backdrop-blur-[20px] p-8 shadow-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning-light">
              <i className="fa-solid fa-box-archive text-[22px] text-warning" />
            </div>
            <h2 className="mt-4 font-headline font-extrabold text-2xl text-text-primary">Archive this asset?</h2>
            <div className="mt-3 space-y-2 text-[13px] text-text-secondary">
              <p>Archiving will:</p>
              <ul className="ml-4 list-disc space-y-1">
                <li>Remove it from your dashboard and projections</li>
                <li>Pause any planned contributions</li>
                <li>Keep all history, notes, and data intact</li>
              </ul>
              <p>You can restore it at any time from the Archived section.</p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setArchiveConfirm(null)}
                className="flex-1 rounded-full bg-surface-alt py-3 text-[14px] font-semibold text-text-secondary transition-transform active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={() => handleArchive(archiveConfirm)}
                className="flex-1 rounded-full bg-gradient-to-r from-warning to-warning py-3 text-[14px] font-semibold text-white transition-transform active:scale-95"
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/20"
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}
        >
          <div className="w-full max-w-sm rounded-xl bg-surface/80 backdrop-blur-[20px] p-8 shadow-xl">
            <h2 className="font-headline font-extrabold text-2xl text-text-primary">Delete asset?</h2>
            <p className="mt-2 text-[14px] text-text-secondary">
              This will permanently remove the asset and its history. This cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-full bg-surface-alt py-3 text-[14px] font-semibold text-text-secondary transition-transform active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
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
