---
name: tracker-cell-math-expressions
description: Allow users to type simple math expressions (+100, -50, *2, /4) into Net Worth Tracker cells, resolving against the nearest prior cell with a value in the same row.
status: completed
---

# Tracker Cell Math Expressions

## Description

When a user clicks a cell in the Net Worth Tracker and types a simple math expression (e.g. `+100`, `-50`, `*1.05`, `/2`), the app resolves the expression against the nearest cell to the **left** in the same row that contains a value, saves the resulting number, and never stores the formula itself.

While the expression is being typed, the source (reference) cell is highlighted so the user knows which month's value is being used as the base.

An inline tooltip appears when a cell enters edit mode, advertising the available shorthand.

## Motivation

Users frequently update monthly balances by applying a delta or a simple percentage change relative to the previous month. Without this feature they must calculate the result externally, copy it in, and risk errors. Typing `+200` or `*1.07` directly in the cell is faster and less error-prone.

## Critical Decisions

- **No formula persistence.** The resolved numeric value is what gets saved; the expression is throw-away UI state only.
- **Single operation only.** Complex expressions (e.g. `(100+200)*3`) are out of scope. One operator + one operand.
- **Reference cell is always "nearest left with a value".** No UI to change the reference cell in this iteration (planned for a future phase).
- **Graceful no-op.** If an expression is typed but no reference cell exists to the left (or division by zero), the save is silently abandoned and the cell closes without modification.
- **Regex pattern:** `/^([+\-*\/])\s*(\d+(?:\.\d+)?)$/` — matches optional whitespace between the operator and operand, supports decimals.
- **Tooltip** is rendered in a `relative`-positioned wrapper inside the editing `<td>`, using absolute positioning so it floats below the input without affecting column width.

## Implementation Steps

### 1. Add parser utilities

```ts
const EXPR_PATTERN = /^([+\-*\/])\s*(\d+(?:\.\d+)?)$/;

function isExpression(raw: string): boolean {
  return EXPR_PATTERN.test(raw.trim());
}

function applyExpression(raw: string, baseValue: number): number | null {
  const match = raw.trim().match(EXPR_PATTERN);
  if (!match) return null;
  const [, op, numStr] = match;
  const num = parseFloat(numStr);
  if (isNaN(num)) return null;
  switch (op) {
    case '+': return baseValue + num;
    case '-': return baseValue - num;
    case '*': return baseValue * num;
    case '/': return num !== 0 ? baseValue / num : null;
    default:  return null;
  }
}
```

### 2. Add `findLeftValueMonth` helper

Scans months `currentMonth - 1` down to `1` for the first non-null entry in the given category row.

```ts
function findLeftValueMonth(categoryId: string, month: number): number | null {
  for (let m = month - 1; m >= 1; m--) {
    if (getEntryValue(entries, categoryId, m) !== null) return m;
  }
  return null;
}
```

### 3. Add `formulaRefMonth` state

```ts
const [formulaRefMonth, setFormulaRefMonth] = useState<number | null>(null);
```

Clear it when editing closes and update it whenever `editValue` changes to a valid expression.

### 4. Wire `onChange` in the editing input to update `formulaRefMonth`

```ts
onChange={(e) => {
  const val = e.target.value;
  setEditValue(val);
  if (isExpression(val)) {
    setFormulaRefMonth(findLeftValueMonth(categoryId, month));
  } else {
    setFormulaRefMonth(null);
  }
}}
```

### 5. Update `handleSaveEntry` to resolve expressions before saving

When `editValue` is an expression:
1. Call `findLeftValueMonth`.
2. If no ref month found → bail silently.
3. Retrieve the ref value, call `applyExpression`.
4. If result is null/NaN → bail silently.
5. Use the resolved number as `numValue` for the API call.

### 6. Highlight the reference cell in `renderValueCell`

```tsx
const isRefCell =
  formulaRefMonth === month && editingCell?.categoryId === categoryId;

// Apply to the <td>:
className={`... ${isRefCell ? "ring-2 ring-inset ring-tertiary bg-tertiary-fixed/30" : ""}`}
```

### 7. Show inline tooltip in editing cell

Wrap the `<input>` in a `relative` div and render an absolute tooltip below it:

```tsx
<div className="relative">
  <input ... />
  <div className="absolute left-0 top-full mt-1 z-30 ...">
    Enter a value or type <kbd>+100</kbd> <kbd>-50</kbd> <kbd>*2</kbd> <kbd>/4</kbd>
    to calculate from the previous month's value
  </div>
</div>
```

## Edge Cases

| Scenario | Behavior |
|---|---|
| Expression typed but no prior value in the row | Save is silently abandoned; cell closes unchanged |
| Division by zero (`/0`) | `applyExpression` returns `null`; save abandoned |
| `-0` or `+0` | Valid; saves the base value unchanged |
| Very large/small decimals | JavaScript `number` precision; acceptable for financial amounts |
| User tabs to next cell with an open expression | Tab handler calls `handleSaveEntry` first, which resolves and saves before moving |

## Future Phases

The feature is intentionally minimal. Planned extensions (tracked here for reference):
- **Move the reference cell** — allow the user to arrow-key or click-select a different source cell after typing an operator.
- **Multiple operations** — e.g. `+100 +50` or chained expressions.
- **Cross-row references** — reference a cell in another category.
- **Display the formula** — show the original expression as a sub-label in the cell (but continue saving only the resolved value).
- **Percentage shorthand** — e.g. `*7%` to mean "multiply by 1.07".

## Test Steps

1. Open the dashboard (`/dashboard`).
2. Add an asset category (e.g. "Checking").
3. Click the **January** cell and type `5000`, press Enter → cell shows `$5,000`.
4. Click the **February** cell, type `+200`. Verify:
   - January cell gains a teal highlight/ring while typing.
   - Press Enter → February cell shows `$5,200`; January highlight disappears.
5. Click March, type `-100` → Enter → `$5,100`.
6. Click April, type `*2` → Enter → `$10,200`.
7. Click May, type `/2` → Enter → `$5,100`.
8. Click a cell in a **new row** with no prior values. Type `+100`, press Enter → cell should silently close with no value saved.
9. Type `/0` in a cell with a reference → Enter → should silently close with no value saved.
10. Verify the tooltip appears when you first click into any data cell.
11. Verify Tab key still advances to the next cell correctly after resolving an expression.
