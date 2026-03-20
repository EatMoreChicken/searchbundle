"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import type { NetWorthCategory, NetWorthEntry, DashboardData } from "@/types";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function getEntryValue(
  entries: NetWorthEntry[],
  categoryId: string,
  month: number,
): number | null {
  const entry = entries.find(
    (e) => e.categoryId === categoryId && e.month === month,
  );
  return entry ? entry.value : null;
}

type CellState = "actual" | "current" | "future";

function getCellState(month: number, currentMonth: number): CellState {
  if (month < currentMonth) return "actual";
  if (month === currentMonth) return "current";
  return "future";
}

interface EditingCell {
  categoryId: string;
  month: number;
}

export default function NetWorthTracker() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [categories, setCategories] = useState<NetWorthCategory[]>([]);
  const [entries, setEntries] = useState<NetWorthEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState("");
  const [addingType, setAddingType] = useState<"asset" | "liability" | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingEntry, setSavingEntry] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const categoryInputRef = useRef<HTMLInputElement>(null);
  const currentMonthRef = useRef<HTMLTableCellElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-indexed
  const currentYear = now.getFullYear();
  const isCurrentYear = year === currentYear;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<DashboardData>(
        `/api/dashboard?year=${year}`,
      );
      setCategories(data.categories);
      setEntries(data.entries);
    } catch {
      // silently fail - empty state will show
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  useEffect(() => {
    if (addInputRef.current && addingType) {
      addInputRef.current.focus();
    }
  }, [addingType]);

  useEffect(() => {
    if (categoryInputRef.current && editingCategoryId) {
      categoryInputRef.current.focus();
      categoryInputRef.current.select();
    }
  }, [editingCategoryId]);

  useEffect(() => {
    if (!loading && currentMonthRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cell = currentMonthRef.current;
      const containerRect = container.getBoundingClientRect();
      const cellRect = cell.getBoundingClientRect();
      const scrollLeft =
        cellRect.left - containerRect.left + container.scrollLeft - containerRect.width / 2 + cellRect.width / 2;
      container.scrollTo({ left: Math.max(0, scrollLeft), behavior: "smooth" });
    }
  }, [loading, year]);

  const assets = categories.filter((c) => c.type === "asset");
  const liabilities = categories.filter((c) => c.type === "liability");

  function computeTotal(cats: NetWorthCategory[], month: number): number {
    return cats.reduce((sum, cat) => {
      const val = getEntryValue(entries, cat.id, month);
      return sum + (val ?? 0);
    }, 0);
  }

  function hasAnyValue(cats: NetWorthCategory[], month: number): boolean {
    return cats.some((cat) => getEntryValue(entries, cat.id, month) !== null);
  }

  async function handleSaveEntry(categoryId: string, month: number) {
    const numValue = parseFloat(editValue.replace(/[^0-9.-]/g, ""));
    if (isNaN(numValue)) {
      setEditingCell(null);
      setEditValue("");
      return;
    }

    setSavingEntry(true);
    try {
      const result = await apiClient.put<NetWorthEntry>(
        "/api/dashboard/entries",
        { categoryId, year, month, value: numValue },
      );
      setEntries((prev) => {
        const filtered = prev.filter(
          (e) => !(e.categoryId === categoryId && e.month === month),
        );
        return [...filtered, result];
      });
    } catch {
      // revert silently
    }
    setSavingEntry(false);
    setEditingCell(null);
    setEditValue("");
  }

  async function handleAddCategory(type: "asset" | "liability") {
    const name = newCategoryName.trim();
    if (!name) {
      setAddingType(null);
      return;
    }

    try {
      const created = await apiClient.post<NetWorthCategory>(
        "/api/dashboard/categories",
        { name, type },
      );
      setCategories((prev) => [...prev, created]);
    } catch {
      // silently fail
    }
    setNewCategoryName("");
    setAddingType(null);
  }

  async function handleRenameCategory(id: string) {
    const name = editCategoryName.trim();
    if (!name) {
      setEditingCategoryId(null);
      return;
    }

    try {
      const updated = await apiClient.put<NetWorthCategory>(
        `/api/dashboard/categories/${id}`,
        { name },
      );
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? updated : c)),
      );
    } catch {
      // silently fail
    }
    setEditingCategoryId(null);
    setEditCategoryName("");
  }

  async function handleDeleteCategory(id: string) {
    try {
      await apiClient.delete(`/api/dashboard/categories/${id}`);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setEntries((prev) => prev.filter((e) => e.categoryId !== id));
    } catch {
      // silently fail
    }
    setDeletingCategoryId(null);
  }

  function startEditing(categoryId: string, month: number) {
    const val = getEntryValue(entries, categoryId, month);
    setEditingCell({ categoryId, month });
    setEditValue(val !== null ? String(val) : "");
  }

  function handleCellKeyDown(
    e: React.KeyboardEvent,
    categoryId: string,
    month: number,
  ) {
    if (e.key === "Enter") {
      handleSaveEntry(categoryId, month);
    } else if (e.key === "Escape") {
      setEditingCell(null);
      setEditValue("");
    } else if (e.key === "Tab") {
      e.preventDefault();
      handleSaveEntry(categoryId, month).then(() => {
        const nextMonth = month < 12 ? month + 1 : null;
        if (nextMonth) {
          startEditing(categoryId, nextMonth);
        }
      });
    }
  }

  function getCellClasses(month: number): string {
    return "bg-bg";
  }

  function getValueClasses(month: number): string {
    if (!isCurrentYear) return "text-text";
    const state = getCellState(month, currentMonth);
    if (state === "future") return "text-text-tertiary";
    return "text-text";
  }

  function renderValueCell(
    categoryId: string,
    month: number,
    isTotal = false,
    totalValue?: number,
  ) {
    const isCurrent = isCurrentYear && month === currentMonth;

    if (isTotal) {
      const hasData = totalValue !== undefined && totalValue !== 0;
      return (
        <td
          key={month}
          ref={isCurrent ? currentMonthRef : undefined}
          className={`px-4 py-2.5 text-right whitespace-nowrap font-heading font-bold text-sm ${getCellClasses(month)} border-b border-border`}
        >
          <span className={getValueClasses(month)}>
            {hasData ? formatCurrency(totalValue!) : "–"}
          </span>
        </td>
      );
    }

    const isEditing =
      editingCell?.categoryId === categoryId && editingCell?.month === month;
    const value = getEntryValue(entries, categoryId, month);

    if (isEditing) {
      return (
        <td
          key={month}
          className={`px-1 py-1 ${getCellClasses(month)} border-b border-border`}
        >
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => handleSaveEntry(categoryId, month)}
            onKeyDown={(e) => handleCellKeyDown(e, categoryId, month)}
            disabled={savingEntry}
            className="w-full px-2 py-1.5 text-right text-sm font-heading font-bold rounded-lg border-1.5 border-teal bg-elevated focus:outline-none"
          />
        </td>
      );
    }

    return (
      <td
        key={month}
        ref={isCurrent ? currentMonthRef : undefined}
        className={`px-4 py-2.5 text-right whitespace-nowrap cursor-pointer hover:bg-teal-light/40 transition-colors ${getCellClasses(month)} border-b border-border`}
        onClick={() => startEditing(categoryId, month)}
      >
        <span className={`text-sm font-heading font-bold ${getValueClasses(month)}`}>
          {value !== null ? formatCurrency(value) : "–"}
        </span>
      </td>
    );
  }

  function renderNetWorthCell(month: number) {
    const isCurrent = isCurrentYear && month === currentMonth;
    const totalAssets = computeTotal(assets, month);
    const totalLiabilities = computeTotal(liabilities, month);
    const netWorth = totalAssets - totalLiabilities;
    const hasData =
      hasAnyValue(assets, month) || hasAnyValue(liabilities, month);

    const colorClass = !hasData
      ? "text-text-tertiary"
      : netWorth >= 0
        ? "text-green"
        : "text-red";

    return (
      <td
        key={month}
        ref={isCurrent && !currentMonthRef.current ? currentMonthRef : undefined}
        className={`px-4 py-3 text-right whitespace-nowrap ${getCellClasses(month)}`}
      >
        <span className={`text-sm font-heading font-extrabold ${colorClass}`}>
          {hasData ? formatCurrency(netWorth) : "–"}
        </span>
      </td>
    );
  }

  function renderSectionHeader(
    label: string,
    type: "asset" | "liability",
    icon: string,
  ) {
    return (
      <tr>
        <td className="sticky left-0 z-10 bg-surface px-4 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAddingType(type);
                setNewCategoryName("");
              }}
              className="w-5 h-5 flex items-center justify-center rounded border border-border text-text-tertiary hover:text-teal hover:border-teal transition-colors cursor-pointer"
              title={`Add ${type}`}
            >
              <i className="fa-solid fa-plus text-[10px]" />
            </button>
            <span className="font-mono text-[11px] uppercase tracking-[1.2px] text-teal font-medium">
              {label}
            </span>
            <i className={`fa-solid ${icon} text-[11px] text-teal`} />
          </div>
        </td>
        {MONTHS.map((_, i) => (
          <td
            key={i + 1}
            className={`border-b border-border ${getCellClasses(i + 1)}`}
          />
        ))}
      </tr>
    );
  }

  function renderCategoryRow(category: NetWorthCategory) {
    const isDeleting = deletingCategoryId === category.id;
    const isRenameing = editingCategoryId === category.id;

    return (
      <tr key={category.id} className="group">
        <td className="sticky left-0 z-10 bg-bg px-4 py-2 border-b border-border">
          <div className="flex items-center gap-2 min-w-[160px]">
            {isDeleting ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-red font-medium">Delete?</span>
                <button
                  onClick={() => handleDeleteCategory(category.id)}
                  className="text-[11px] text-red hover:text-red/80 font-semibold cursor-pointer"
                >
                  Yes
                </button>
                <button
                  onClick={() => setDeletingCategoryId(null)}
                  className="text-[11px] text-text-secondary hover:text-text font-semibold cursor-pointer"
                >
                  No
                </button>
              </div>
            ) : isRenameing ? (
              <input
                ref={categoryInputRef}
                type="text"
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                onBlur={() => handleRenameCategory(category.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameCategory(category.id);
                  if (e.key === "Escape") setEditingCategoryId(null);
                }}
                className="text-sm font-body font-medium bg-elevated border border-border rounded-md px-2 py-0.5 w-full focus:outline-none focus:border-teal"
              />
            ) : (
              <>
                <span
                  className="text-sm font-body font-medium text-text cursor-pointer hover:text-teal transition-colors"
                  onDoubleClick={() => {
                    setEditingCategoryId(category.id);
                    setEditCategoryName(category.name);
                  }}
                >
                  {category.name}
                </span>
                <button
                  onClick={() => setDeletingCategoryId(category.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-text-tertiary hover:text-red cursor-pointer ml-auto"
                  title="Delete category"
                >
                  <i className="fa-solid fa-xmark text-[11px]" />
                </button>
              </>
            )}
          </div>
        </td>
        {MONTHS.map((_, i) => renderValueCell(category.id, i + 1))}
      </tr>
    );
  }

  function renderAddRow(type: "asset" | "liability") {
    if (addingType !== type) {
      return (
        <tr>
          <td className="sticky left-0 z-10 bg-bg px-4 py-1.5 border-b border-border">
            <button
              onClick={() => {
                setAddingType(type);
                setNewCategoryName("");
              }}
              className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-teal transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-plus text-[10px]" />
              <span className="font-body font-medium">
                Add {type === "asset" ? "asset" : "liability"}
              </span>
            </button>
          </td>
          {MONTHS.map((_, i) => (
            <td
              key={i + 1}
              className={`border-b border-border ${getCellClasses(i + 1)}`}
            />
          ))}
        </tr>
      );
    }

    return (
      <tr>
        <td className="sticky left-0 z-10 bg-bg px-4 py-1.5 border-b border-border">
          <div className="flex items-center gap-1.5">
            <input
              ref={addInputRef}
              type="text"
              placeholder={type === "asset" ? "Asset name..." : "Liability name..."}
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddCategory(type);
                if (e.key === "Escape") setAddingType(null);
              }}
              onBlur={() => {
                if (!newCategoryName.trim()) setAddingType(null);
                else handleAddCategory(type);
              }}
              className="text-sm font-body bg-elevated border border-border rounded-md px-2 py-0.5 w-full focus:outline-none focus:border-teal placeholder:text-text-tertiary"
            />
          </div>
        </td>
        {MONTHS.map((_, i) => (
          <td
            key={i + 1}
            className={`border-b border-border ${getCellClasses(i + 1)}`}
          />
        ))}
      </tr>
    );
  }

  function renderTotalRow(
    label: string,
    cats: NetWorthCategory[],
  ) {
    return (
      <tr>
        <td className="sticky left-0 z-10 bg-surface px-4 py-2.5 border-b border-border">
          <span className="text-sm font-heading font-bold text-text">
            {label}
          </span>
        </td>
        {MONTHS.map((_, i) => {
          const month = i + 1;
          const total = computeTotal(cats, month);
          const hasData = hasAnyValue(cats, month);
          return renderValueCell("", month, true, hasData ? total : undefined);
        })}
      </tr>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-text-secondary font-body text-sm">Loading...</div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-24 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-teal-light flex items-center justify-center mx-auto mb-6">
          <i className="fa-solid fa-chart-line text-teal text-xl" />
        </div>
        <h1 className="font-display text-3xl text-text mb-3">
          Track Your Net Worth
        </h1>
        <p className="text-text-secondary font-body text-base mb-8 max-w-md mx-auto">
          Add your assets and liabilities to see your net worth evolve month by
          month. Start by adding your first account.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => {
              setAddingType("asset");
              setNewCategoryName("");
            }}
            className="px-6 py-3 rounded-xl bg-text text-bg font-body font-semibold text-sm hover:-translate-y-0.5 transition-transform cursor-pointer"
          >
            <i className="fa-solid fa-plus mr-2 text-xs" />
            Add Asset
          </button>
          <button
            onClick={() => {
              setAddingType("liability");
              setNewCategoryName("");
            }}
            className="px-6 py-3 rounded-xl bg-transparent border-[1.5px] border-border font-body font-semibold text-sm text-text hover:bg-surface hover:border-text-secondary transition-all cursor-pointer"
          >
            <i className="fa-solid fa-plus mr-2 text-xs" />
            Add Liability
          </button>
        </div>

        {addingType && (
          <div className="mt-6 max-w-sm mx-auto">
            <div className="flex items-center gap-2">
              <input
                ref={addInputRef}
                type="text"
                placeholder={
                  addingType === "asset"
                    ? "e.g. Checking Account"
                    : "e.g. Mortgage"
                }
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddCategory(addingType);
                  if (e.key === "Escape") setAddingType(null);
                }}
                className="flex-1 text-sm font-body bg-elevated border-[1.5px] border-border rounded-xl px-4 py-3 focus:outline-none focus:border-teal placeholder:text-text-tertiary"
              />
              <button
                onClick={() => handleAddCategory(addingType!)}
                className="px-4 py-3 rounded-xl bg-teal text-white font-body font-semibold text-sm cursor-pointer hover:bg-teal/90 transition-colors"
              >
                Add
              </button>
            </div>
            <p className="text-xs text-text-tertiary mt-2">
              Adding as{" "}
              <span className="font-medium text-teal">
                {addingType === "asset" ? "an asset" : "a liability"}
              </span>
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-6 py-8 lg:px-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-[1.5px] text-teal mb-1 block">
            Dashboard
          </span>
          <h1 className="font-display text-3xl lg:text-4xl text-text">
            Net Worth Tracker
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-text-secondary hover:bg-surface hover:text-text transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-chevron-left text-xs" />
          </button>
          <span className="font-heading font-bold text-lg text-text min-w-[56px] text-center">
            {year}
          </span>
          <button
            onClick={() => setYear((y) => y + 1)}
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-text-secondary hover:bg-surface hover:text-text transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-chevron-right text-xs" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mb-4 text-xs font-body text-text-secondary">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-surface border border-border" />
          <span>Actual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm border-b-2 border-amber bg-surface" />
          <span>Current month</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-bg border border-border" />
          <span>No data yet</span>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-2xl overflow-hidden bg-elevated">
        <div ref={scrollContainerRef} className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[900px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-surface px-4 py-3 text-left border-b border-border min-w-[200px]">
                  <span className="font-body text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Category
                  </span>
                </th>
                {MONTHS.map((m, i) => {
                  const month = i + 1;
                  const isCurrent = isCurrentYear && month === currentMonth;
                  return (
                    <th
                      key={m}
                      className={`px-4 py-3 text-right bg-surface min-w-[100px] ${
                        isCurrent
                          ? "border-b-2 border-amber"
                          : "border-b border-border"
                      }`}
                    >
                      <div className="flex flex-col items-end">
                        <span className={`font-body text-xs font-semibold ${
                          isCurrent ? "text-amber" : "text-text-secondary"
                        }`}>
                          {m}
                        </span>
                        {isCurrent && (
                          <span className="font-mono text-[9px] uppercase tracking-[1px] text-amber/70 font-medium mt-0.5">
                            Now
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* Assets Section */}
              {renderSectionHeader("Assets", "asset", "fa-arrow-trend-up")}
              {assets.map((cat) => renderCategoryRow(cat))}
              {renderAddRow("asset")}
              {renderTotalRow("Total Assets", assets)}

              {/* Liabilities Section */}
              {renderSectionHeader("Liabilities", "liability", "fa-arrow-trend-down")}
              {liabilities.map((cat) => renderCategoryRow(cat))}
              {renderAddRow("liability")}
              {renderTotalRow("Total Liabilities", liabilities)}

              {/* Net Worth Row */}
              <tr>
                <td className="sticky left-0 z-10 bg-text px-4 py-3">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-chart-line text-bg text-xs" />
                    <span className="font-heading font-extrabold text-sm text-bg uppercase tracking-wide">
                      Net Worth
                    </span>
                  </div>
                </td>
                {MONTHS.map((_, i) => renderNetWorthCell(i + 1))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
