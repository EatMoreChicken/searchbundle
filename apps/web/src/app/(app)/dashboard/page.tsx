export default function DashboardPage() {
  return (
    <div className="p-12">
      <p className="font-mono text-[11px] uppercase tracking-[2px] text-teal">
        Your Position
      </p>
      <h1 className="mt-2 font-display text-4xl text-text">Dashboard</h1>
      <p className="mt-3 text-[15px] text-text-secondary">
        Your net worth, accounts, and goals will appear here.
      </p>

      <div className="mt-10 grid grid-cols-3 gap-5">
        {["Net Worth", "Total Assets", "Total Debts"].map((label) => (
          <div
            key={label}
            className="rounded-2xl border border-border bg-elevated p-7"
          >
            <p className="font-mono text-[11px] uppercase tracking-[1.2px] text-text-tertiary">
              {label}
            </p>
            <p className="mt-3 font-heading text-3xl font-bold tracking-tight text-text">
              —
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
        <p className="font-display text-2xl text-text">No data yet</p>
        <p className="mt-2 text-[14px] text-text-secondary">
          Complete your first check-in to start tracking your financial position.
        </p>
      </div>
    </div>
  );
}
