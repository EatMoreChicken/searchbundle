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

const EXPR_PATTERN = /^([+\-*/])\s*(\d+(?:\.\d+)?)$/;
const FULL_EXPR_PATTERN = /^(\d+(?:\.\d+)?)\s*([+\-*/])\s*(\d+(?:\.\d+)?)$/;
const OPERATOR_START = /^[+\-*/]/;

function isExpression(raw: string): boolean {
  const t = raw.trim();
  return EXPR_PATTERN.test(t) || FULL_EXPR_PATTERN.test(t);
}

function applyExpression(raw: string, baseValue: number): number | null {
  const t = raw.trim();

  const fullMatch = t.match(FULL_EXPR_PATTERN);
  if (fullMatch) {
    const left = parseFloat(fullMatch[1]);
    const op = fullMatch[2];
    const right = parseFloat(fullMatch[3]);
    if (isNaN(left) || isNaN(right)) return null;
    switch (op) {
      case "+": return left + right;
      case "-": return left - right;
      case "*": return left * right;
      case "/": return right !== 0 ? left / right : null;
      default:  return null;
    }
  }

  const match = t.match(EXPR_PATTERN);
  if (!match) return null;
  const [, op, numStr] = match;
  const num = parseFloat(numStr);
  if (isNaN(num)) return null;
  switch (op) {
    case "+": return baseValue + num;
    case "-": return baseValue - num;
    case "*": return baseValue * num;
    case "/": return num !== 0 ? baseValue / num : null;
    default:  return null;
  }
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
  const [formulaRefMonth, setFormulaRefMonth] = useState<number | null>(null);
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
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
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

  function findLeftValueMonth(categoryId: string, month: number): number | null {
    for (let m = month - 1; m >= 1; m--) {
      if (getEntryValue(entries, categoryId, m) !== null) return m;
    }
    return null;
  }

  async function handleSaveEntry(categoryId: string, month: number) {
    let numValue: number;
    const trimmed = editValue.trim();

    if (isExpression(trimmed)) {
      // Full expression like "422000-499" — self-contained, no external reference needed
      if (FULL_EXPR_PATTERN.test(trimmed)) {
        const resolved = applyExpression(trimmed, 0);
        if (resolved === null || isNaN(resolved)) {
          setEditingCell(null);
          setEditValue("");
          setFormulaRefMonth(null);
          return;
        }
        numValue = resolved;
      } else {
        // Operator-prefix expression like "-499" — input has been cleared of any base digit, scan left
        const refMonth = findLeftValueMonth(categoryId, month);
        const refValue = refMonth !== null ? getEntryValue(entries, categoryId, refMonth) : null;
        if (refValue === null) {
          setEditingCell(null);
          setEditValue("");
          setFormulaRefMonth(null);
          return;
        }
        const resolved = applyExpression(trimmed, refValue);
        if (resolved === null || isNaN(resolved)) {
          setEditingCell(null);
          setEditValue("");
          setFormulaRefMonth(null);
          return;
        }
        numValue = resolved;
      }
    } else {
      numValue = parseFloat(trimmed.replace(/[^0-9.-]/g, ""));
      if (isNaN(numValue)) {
        setEditingCell(null);
        setEditValue("");
        setFormulaRefMonth(null);
        return;
      }
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
    setFormulaRefMonth(null);
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
    setFormulaRefMonth(null);
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
      setFormulaRefMonth(null);
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
    return "bg-surface";
  }

  function getValueClasses(month: number): string {
    if (!isCurrentYear) return "text-on-surface";
    const state = getCellState(month, currentMonth);
    if (state === "future") return "text-on-surface-variant";
    return "text-on-surface";
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
          className={`px-4 py-2.5 text-right whitespace-nowrap font-bold text-sm ${getCellClasses(month)}`}
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
    const isRefCell =
      formulaRefMonth === month && editingCell?.categoryId === categoryId;

    if (isEditing) {
      return (
        <td
          key={month}
          className={`px-1 py-1 ${getCellClasses(month)}`}
        >
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={editValue}
              onChange={(e) => {
                const val = e.target.value;
                setEditValue(val);
                if (FULL_EXPR_PATTERN.test(val.trim())) {
                  setFormulaRefMonth(null);
                } else if (OPERATOR_START.test(val.trim())) {
                  // Input starts with an operator — no base digit in the field, scan left
                  setFormulaRefMonth(findLeftValueMonth(categoryId, month));
                } else {
                  setFormulaRefMonth(null);
                }
              }}
              onBlur={() => handleSaveEntry(categoryId, month)}
              onKeyDown={(e) => handleCellKeyDown(e, categoryId, month)}
              disabled={savingEntry}
              className="w-full px-2 py-1.5 text-right text-sm font-bold rounded-lg bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="absolute left-0 top-full mt-1 z-30 bg-surface-container-lowest shadow-md rounded-xl px-4 py-3 pointer-events-none border border-outline-variant/20 min-w-[260px]">
              {/* Header */}
              <div className="flex items-center gap-1.5 mb-3">
                <span className="material-symbols-outlined text-[14px] text-on-surface-variant">calculate</span>
                <p className="text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant">Math Shorthand</p>
              </div>

              {value !== null ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[11px] text-on-surface-variant leading-tight">Type an operator to adjust</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="font-mono text-[11px] font-bold text-on-surface bg-surface-container-high px-2 py-0.5 rounded-full">-100</span>
                      <span className="font-mono text-[11px] font-bold text-on-surface bg-surface-container-high px-2 py-0.5 rounded-full">+500</span>
                      <span className="font-mono text-[11px] font-bold text-surface bg-on-surface px-2 py-0.5 rounded-full">×1.05</span>
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[11px] text-on-surface-variant leading-tight">Or type a full expression</span>
                    <div className="shrink-0">
                      <span className="font-mono text-[11px] font-bold text-on-surface bg-surface-container-high px-2 py-0.5 rounded-full">{value}-100</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[11px] text-on-surface-variant leading-tight">Inherits nearest value to the left</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="font-mono text-[11px] font-bold text-on-surface bg-surface-container-high px-2 py-0.5 rounded-full">+100</span>
                      <span className="font-mono text-[11px] font-bold text-on-surface bg-surface-container-high px-2 py-0.5 rounded-full">-50</span>
                      <span className="font-mono text-[11px] font-bold text-surface bg-on-surface px-2 py-0.5 rounded-full">×2</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-outline-variant/20">
                <span className="material-symbols-outlined text-[13px] text-on-surface-variant/50">subdirectory_arrow_left</span>
                <span className="text-[11px] text-on-surface-variant/60">Press</span>
                <kbd className="text-[10px] font-semibold text-on-surface bg-surface-container-high border border-outline-variant/40 px-1.5 py-0.5 rounded-xl">Enter</kbd>
                <span className="text-[11px] text-on-surface-variant/60">to apply</span>
              </div>
            </div>
          </div>
        </td>
      );
    }

    return (
      <td
        key={month}
        ref={isCurrent ? currentMonthRef : undefined}
        className={`px-4 py-2.5 text-right whitespace-nowrap cursor-pointer hover:bg-primary-fixed/30 transition-colors ${getCellClasses(month)}`}
        onClick={() => startEditing(categoryId, month)}
      >
        <span className={`text-sm font-bold inline-block px-2 py-0.5 rounded-lg transition-colors ${getValueClasses(month)} ${
          isRefCell ? "bg-tertiary-fixed/60 ring-1 ring-tertiary" : ""
        }`}>
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
      ? "text-on-surface-variant"
      : netWorth >= 0
        ? "text-secondary"
        : "text-error";

    return (
      <td
        key={month}
        ref={isCurrent && !currentMonthRef.current ? currentMonthRef : undefined}
        className={`sticky bottom-0 z-10 bg-surface-container-low px-4 py-3 text-right whitespace-nowrap`}
      >
        <span className={`text-sm font-extrabold ${colorClass}`}>
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
        <td className="sticky left-0 z-10 bg-surface-container-low px-4 py-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAddingType(type);
                setNewCategoryName("");
              }}
              className="w-5 h-5 flex items-center justify-center rounded-full text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              title={`Add ${type}`}
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
            </button>
            <span className="text-[11px] uppercase tracking-[1.2px] text-primary font-bold">
              {label}
            </span>
            <span className="material-symbols-outlined text-[14px] text-primary">{icon}</span>
          </div>
        </td>
        {MONTHS.map((_, i) => (
          <td
            key={i + 1}
            className={`${getCellClasses(i + 1)}`}
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
        <td className="sticky left-0 z-10 bg-surface px-4 py-2">
          <div className="flex items-center gap-2 min-w-[160px]">
            {isDeleting ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-error font-medium">Delete?</span>
                <button
                  onClick={() => handleDeleteCategory(category.id)}
                  className="text-[11px] text-error hover:text-error/80 font-semibold cursor-pointer"
                >
                  Yes
                </button>
                <button
                  onClick={() => setDeletingCategoryId(null)}
                  className="text-[11px] text-on-surface-variant hover:text-on-surface font-semibold cursor-pointer"
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
                className="text-sm font-medium bg-surface-container-lowest rounded-md px-2 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-primary"
              />
            ) : (
              <>
                <span
                  className="text-sm font-medium text-on-surface cursor-pointer hover:text-primary transition-colors"
                  onDoubleClick={() => {
                    setEditingCategoryId(category.id);
                    setEditCategoryName(category.name);
                  }}
                >
                  {category.name}
                </span>
                <button
                  onClick={() => setDeletingCategoryId(category.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant hover:text-error cursor-pointer ml-auto"
                  title="Delete category"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
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
          <td className="sticky left-0 z-10 bg-surface px-4 py-1.5">
            <button
              onClick={() => {
                setAddingType(type);
                setNewCategoryName("");
              }}
              className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              <span className="font-medium">
                Add {type === "asset" ? "asset" : "liability"}
              </span>
            </button>
          </td>
          {MONTHS.map((_, i) => (
            <td
              key={i + 1}
              className={`${getCellClasses(i + 1)}`}
            />
          ))}
        </tr>
      );
    }

    return (
      <tr>
        <td className="sticky left-0 z-10 bg-surface px-4 py-1.5">
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
              className="text-sm bg-surface-container-lowest rounded-md px-2 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-on-surface-variant"
            />
          </div>
        </td>
        {MONTHS.map((_, i) => (
          <td
            key={i + 1}
            className={`${getCellClasses(i + 1)}`}
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
        <td className="sticky left-0 z-10 bg-surface-container-low px-4 py-2.5">
          <span className="text-sm font-bold text-on-surface">
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
        <div className="text-on-surface-variant text-sm">Loading...</div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-24 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-primary-fixed/30 flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-primary text-2xl">query_stats</span>
        </div>
        <h1 className="text-3xl font-extrabold text-on-surface mb-3">
          Track Your Net Worth
        </h1>
        <p className="text-on-surface-variant text-base mb-8 max-w-md mx-auto">
          Add your assets and liabilities to see your net worth evolve month by
          month. Start by adding your first account.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => {
              setAddingType("asset");
              setNewCategoryName("");
            }}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-semibold text-sm transition-transform active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] align-middle mr-1">add</span>
            Add Asset
          </button>
          <button
            onClick={() => {
              setAddingType("liability");
              setNewCategoryName("");
            }}
            className="px-6 py-3 rounded-full bg-surface-container-low font-semibold text-sm text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] align-middle mr-1">add</span>
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
                className="flex-1 text-sm bg-surface-container-high rounded-2xl px-4 py-3 focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary placeholder:text-on-surface-variant"
              />
              <button
                onClick={() => handleAddCategory(addingType!)}
                className="px-4 py-3 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-semibold text-sm cursor-pointer transition-transform active:scale-95"
              >
                Add
              </button>
            </div>
            <p className="text-xs text-on-surface-variant mt-2">
              Adding as{" "}
              <span className="font-medium text-primary">
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
      <style>{`
        .sb-scrollbar::-webkit-scrollbar { height: 5px; }
        .sb-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .sb-scrollbar::-webkit-scrollbar-thumb { background-color: #bdc9c7; border-radius: 100px; }
        .sb-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #3e4947; }
      `}</style>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-[11px] uppercase tracking-[1.5px] text-primary font-bold mb-1 block">
            Dashboard
          </span>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-on-surface tracking-tight">
            Net Worth Tracker
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <span className="font-bold text-lg text-on-surface min-w-[56px] text-center">
            {year}
          </span>
          <button
            onClick={() => setYear((y) => y + 1)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mb-4 text-xs text-on-surface-variant">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-surface-container-low" />
          <span>Actual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm border-b-2 border-tertiary bg-surface-container-low" />
          <span>Current month</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-surface" />
          <span>No data yet</span>
        </div>
      </div>

      {/* Table */}
      <div ref={scrollContainerRef} className="overflow-x-auto overflow-y-auto sb-scrollbar rounded-2xl bg-surface-container-lowest max-h-[calc(100vh-200px)]">
          <table className="w-full border-collapse min-w-[900px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-surface-container-low px-4 py-3 text-left min-w-[200px]">
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                    Category
                  </span>
                </th>
                {MONTHS.map((m, i) => {
                  const month = i + 1;
                  const isCurrent = isCurrentYear && month === currentMonth;
                  return (
                    <th
                      key={m}
                      className={`px-4 py-3 text-right bg-surface-container-low min-w-[100px] ${
                        isCurrent
                          ? "border-b-2 border-tertiary"
                          : ""
                      }`}
                    >
                      <div className="flex flex-col items-end">
                        <span className={`text-xs font-semibold ${
                          isCurrent ? "text-tertiary" : "text-on-surface-variant"
                        }`}>
                          {m}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] uppercase tracking-[1px] text-tertiary/70 font-bold mt-0.5">
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
              {renderSectionHeader("Assets", "asset", "trending_up")}
              {assets.map((cat) => renderCategoryRow(cat))}
              {renderAddRow("asset")}
              {renderTotalRow("Total Assets", assets)}

              {/* Separator */}
              <tr aria-hidden="true">
                <td colSpan={13} className="h-3 bg-surface-container-high py-0" />
              </tr>

              {/* Liabilities Section */}
              {renderSectionHeader("Liabilities", "liability", "trending_down")}
              {liabilities.map((cat) => renderCategoryRow(cat))}
              {renderAddRow("liability")}
              {renderTotalRow("Total Liabilities", liabilities)}
            </tbody>

            {/* Net Worth Row — sticky to the bottom of the scroll container */}
            <tfoot>
              <tr>
                <td className="sticky left-0 bottom-0 z-20 bg-gradient-to-r from-primary to-primary-container px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-on-primary text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>leaderboard</span>
                    <span className="font-extrabold text-sm text-on-primary uppercase tracking-wide">
                      Net Worth
                    </span>
                  </div>
                </td>
                {MONTHS.map((_, i) => renderNetWorthCell(i + 1))}
              </tr>
            </tfoot>
          </table>
        </div>
    </div>
  );
}
