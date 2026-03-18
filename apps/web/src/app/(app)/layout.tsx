export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar will go here */}
      <aside className="w-60 border-r border-border bg-surface" />
      <main className="flex-1">{children}</main>
    </div>
  );
}
