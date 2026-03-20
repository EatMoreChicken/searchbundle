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

  useEffect(() => { setMounted(true); }, []);

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
        <p className="text-sm text-on-surface-variant">Your sanctuary is ready</p>
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

