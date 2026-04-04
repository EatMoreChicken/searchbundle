import Navbar from "@/components/Navbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />
      <main className="min-w-0">{children}</main>
    </div>
  );
}
