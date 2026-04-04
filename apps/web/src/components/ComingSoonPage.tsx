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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,var(--color-accent-light),transparent_38%),radial-gradient(circle_at_80%_0%,var(--color-warning-light),transparent_42%),linear-gradient(to_bottom,var(--color-surface),var(--color-surface-alt))]" />

      <div className="relative mx-auto max-w-4xl">
        <p className="text-[11px] uppercase tracking-[2px] text-accent font-bold">{overline}</p>

        <div className="mt-4 rounded-xl bg-surface p-10">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-accent-light/30">
              <i className={`fa-solid ${icon} text-[22px] text-accent`} />
            </div>
            <div>
              <p className="font-headline text-4xl font-extrabold leading-tight text-text-primary">{title}</p>
              <p className="mt-2 text-[15px] text-text-secondary">{summary}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {bullets.map((bullet) => (
              <div
                key={bullet}
                className="rounded-xl bg-surface-alt px-4 py-4 text-[14px] text-text-secondary"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-accent" />
                  <span>{bullet}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 inline-flex rounded-full bg-warning-light px-4 py-2 text-[12px] font-semibold text-warning">
            Coming soon in an upcoming release
          </div>
        </div>
      </div>
    </div>
  );
}