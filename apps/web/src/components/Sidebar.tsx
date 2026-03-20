"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

type NavItem = {
  href: string;
  icon: string;
  label: string;
};

const navItems: NavItem[] = [
  { href: "/dashboard", icon: "dashboard", label: "Dashboard" },
  { href: "/assets", icon: "account_balance_wallet", label: "Assets" },
  { href: "/liabilities", icon: "payments", label: "Liabilities" },
  { href: "/projections", icon: "query_stats", label: "Projections" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [householdName, setHouseholdName] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const activeHouseholdId = (session as { activeHouseholdId?: string } | null)?.activeHouseholdId;

  useEffect(() => {
    if (!activeHouseholdId) return;
    fetch(`/api/households/${activeHouseholdId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.name) setHouseholdName(d.name); })
      .catch(() => {});
  }, [activeHouseholdId]);

  const displayName = mounted
    ? (session?.user?.name ?? session?.user?.email ?? "My Account")
    : "\u00A0";

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="sticky top-0 hidden lg:flex h-screen w-64 flex-col py-8 px-4 bg-surface-container-low rounded-r-[32px]">
      {/* Welcome */}
      <div className="mb-12 px-4">
        <h2 className="text-lg font-bold text-primary">{displayName}</h2>
        {householdName && (
          <p className="text-xs font-medium text-on-surface-variant/80 flex items-center gap-1 mt-0.5">
            <span className="material-symbols-outlined text-[14px]">group</span>
            {householdName}
          </p>
        )}
        <p className="text-sm text-on-surface-variant mt-1">Your sanctuary is ready</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all",
              isActive(item.href)
                ? "bg-surface-container-lowest text-primary rounded-full shadow-sm"
                : "text-on-surface hover:bg-white/50 hover:translate-x-1",
            ].join(" ")}
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto flex flex-col gap-2">
        <Link
          href="/settings"
          className={[
            "flex items-center gap-3 px-4 py-2 text-sm transition-all rounded-full",
            isActive("/settings")
              ? "bg-surface-container-lowest text-primary shadow-sm"
              : "text-on-surface hover:bg-white/50 hover:translate-x-1",
          ].join(" ")}
        >
          <span className="material-symbols-outlined text-[20px]">manage_accounts</span>
          <span>Settings</span>
        </Link>
        <Link
          href="/cooper"
          className="flex items-center gap-3 text-on-surface px-4 py-2 hover:bg-white/50 rounded-full transition-all hover:translate-x-1"
        >
          <span className="material-symbols-outlined text-[20px]">smart_toy</span>
          <span className="text-sm">Cooper</span>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/sign-in" })}
          className="flex items-center gap-3 text-on-surface px-4 py-2 hover:bg-white/50 rounded-full transition-all hover:translate-x-1 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span className="text-sm">Sign out</span>
        </button>
      </div>
    </aside>
  );
}

