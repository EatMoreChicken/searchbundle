interface ComingSoonPageProps {
  overline: string;
  title: string;
  summary: string;
  bullets: string[];
  icon: string;
}

export default function ComingSoonPage({
  overline,
  title,
  summary,
  bullets,
  icon,
}: ComingSoonPageProps) {
  return (
    <div className="relative min-h-screen overflow-hidden p-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,var(--teal-light),transparent_38%),radial-gradient(circle_at_80%_0%,var(--indigo-light),transparent_42%),linear-gradient(to_bottom,var(--bg),var(--surface))]" />

      <div className="relative mx-auto max-w-4xl">
        <p className="font-mono text-[11px] uppercase tracking-[2px] text-teal">{overline}</p>

        <div className="mt-4 rounded-2xl border border-border bg-elevated p-10 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_24px_68px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-light">
              <i className={`fa-solid ${icon} text-[20px] text-teal`} />
            </div>
            <div>
              <p className="font-display text-4xl leading-tight text-text">{title}</p>
              <p className="mt-2 text-[15px] text-text-secondary">{summary}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {bullets.map((bullet) => (
              <div
                key={bullet}
                className="rounded-xl border border-border bg-surface px-4 py-4 text-[14px] text-text-secondary"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-teal" />
                  <span>{bullet}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 inline-flex rounded-full bg-amber-light px-4 py-2 text-[12px] font-semibold text-amber">
            Coming soon in an upcoming release
          </div>
        </div>
      </div>
    </div>
  );
}