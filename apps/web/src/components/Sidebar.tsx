"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type NavItem = {
  href: string;
  icon: string;
  label: string;
};

const navItems: NavItem[] = [
  { href: "/dashboard", icon: "dashboard", label: "Dashboard" },
  { href: "/tracker", icon: "query_stats", label: "Tracker" },
  { href: "/assets", icon: "account_balance_wallet", label: "Assets" },
  { href: "/liabilities", icon: "payments", label: "Liabilities" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("sb-sidebar-collapsed");
    if (stored !== null) {
      setCollapsed(stored === "true");
    } else {
      setCollapsed(window.innerWidth < 1024);
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("sb-sidebar-collapsed", String(next));
      return next;
    });
  }

  function isActive(href: string) {
    if (!mounted) return false;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className={`sticky top-0 flex h-screen flex-col py-6 bg-surface-container-low rounded-r-[32px] transition-all duration-300 ${collapsed ? "w-14 px-2" : "w-64 px-4"}`}>

      {/* Brand */}
      <div className={`mb-6 flex items-center ${collapsed ? "justify-center" : "px-4 justify-between"}`}>
        {collapsed ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-container">
            <span className="material-symbols-outlined text-[16px] text-on-primary" style={{ fontVariationSettings: "'FILL' 1" }}>search</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-container">
                <span className="material-symbols-outlined text-[16px] text-on-primary" style={{ fontVariationSettings: "'FILL' 1" }}>search</span>
              </div>
              <span className="font-headline font-extrabold text-[15px] tracking-tight text-on-surface">
                Search<span className="text-primary">Bundle</span>
              </span>
            </div>
            <button
              onClick={toggleCollapsed}
              title="Collapse sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-surface-container-high transition-all text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
          </>
        )}
      </div>

      {/* Expand button (collapsed only) */}
      {collapsed && (
        <button
          onClick={toggleCollapsed}
          title="Expand sidebar"
          className="mb-4 flex items-center justify-center w-8 h-8 self-center rounded-xl hover:bg-surface-container-high transition-all text-on-surface-variant"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={[
              "flex items-center transition-all rounded-xl",
              collapsed ? "justify-center p-3" : "gap-3 px-4 py-3 text-sm font-medium",
              isActive(item.href)
                ? "bg-surface-container-lowest text-primary shadow-sm"
                : "text-on-surface hover:bg-white/50" + (collapsed ? "" : " hover:translate-x-1"),
            ].join(" ")}
          >
            <span className="material-symbols-outlined text-[20px] shrink-0">{item.icon}</span>
            <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? "w-0 opacity-0" : "opacity-100"}`}>
              {item.label}
            </span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto flex flex-col gap-2">
        <Link
          href="/settings"
          title={collapsed ? "Settings" : undefined}
          className={[
            "flex items-center transition-all rounded-xl",
            collapsed ? "justify-center p-3" : "gap-3 px-4 py-2 text-sm",
            isActive("/settings")
              ? "bg-surface-container-lowest text-primary shadow-sm"
              : "text-on-surface hover:bg-white/50" + (collapsed ? "" : " hover:translate-x-1"),
          ].join(" ")}
        >
          <span className="material-symbols-outlined text-[20px] shrink-0">manage_accounts</span>
          <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? "w-0 opacity-0" : "opacity-100"}`}>Settings</span>
        </Link>
        <Link
          href="/cooper"
          title={collapsed ? "Cooper" : undefined}
          className={[
            "flex items-center text-on-surface hover:bg-white/50 rounded-xl transition-all",
            collapsed ? "justify-center p-3" : "gap-3 px-4 py-2 hover:translate-x-1",
          ].join(" ")}
        >
          <span className="material-symbols-outlined text-[20px] shrink-0">smart_toy</span>
          <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 text-sm ${collapsed ? "w-0 opacity-0" : "opacity-100"}`}>Cooper</span>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/sign-in" })}
          title={collapsed ? "Sign out" : undefined}
          className={[
            "flex items-center text-on-surface hover:bg-white/50 rounded-xl transition-all cursor-pointer",
            collapsed ? "justify-center p-3" : "gap-3 px-4 py-2 hover:translate-x-1",
          ].join(" ")}
        >
          <span className="material-symbols-outlined text-[20px] shrink-0">logout</span>
          <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 text-sm ${collapsed ? "w-0 opacity-0" : "opacity-100"}`}>Sign out</span>
        </button>
      </div>
    </aside>
  );
}

