"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

type NavItem = {
  href: string;
  icon: string;
  label: string;
};

interface HouseholdMembership {
  householdId: string;
  householdName: string;
  role: string;
}

const navItems: NavItem[] = [
  { href: "/dashboard", icon: "dashboard", label: "Dashboard" },
  { href: "/tracker", icon: "query_stats", label: "Tracker" },
  { href: "/assets", icon: "account_balance_wallet", label: "Assets" },
  { href: "/liabilities", icon: "payments", label: "Liabilities" },
  { href: "/projections", icon: "area_chart", label: "Projections" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session, update: updateSession } = useSession();
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [households, setHouseholds] = useState<HouseholdMembership[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    if (window.innerWidth < 1024) setCollapsed(true);
  }, []);

  const activeHouseholdId = (session as { activeHouseholdId?: string } | null)?.activeHouseholdId;

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/households")
      .then((r) => r.ok ? r.json() : [])
      .then((list: HouseholdMembership[]) => setHouseholds(list))
      .catch(() => {});
  }, [session?.user]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  async function handleSwitch(householdId: string) {
    if (householdId === activeHouseholdId || switching) return;
    setSwitching(true);
    setDropdownOpen(false);
    try {
      await fetch("/api/households/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId }),
      });
      await updateSession({ activeHouseholdId: householdId });
      window.location.reload();
    } catch {
      setSwitching(false);
    }
  }

  const activeHousehold = households.find((h) => h.householdId === activeHouseholdId);
  const activeHouseholdName = activeHousehold?.householdName ?? null;

  const displayName = mounted
    ? (session?.user?.name ?? session?.user?.email ?? "My Account")
    : "\u00A0";

  function isActive(href: string) {
    if (!mounted) return false;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className={`sticky top-0 flex h-screen flex-col py-6 bg-surface-container-low rounded-r-[32px] transition-all duration-300 ${collapsed ? "w-14 px-2" : "w-64 px-4"}`}>

      {/* Toggle button */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={`mb-6 flex items-center justify-center w-8 h-8 rounded-xl hover:bg-surface-container-high transition-all text-on-surface-variant ${collapsed ? "self-center" : "self-end"}`}
      >
        <span className="material-symbols-outlined text-[18px]">
          {collapsed ? "chevron_right" : "chevron_left"}
        </span>
      </button>

      {/* Welcome — only shown when expanded */}
      {!collapsed && (
        <div className="mb-10 px-4">
          <h2 className="text-lg font-bold text-primary">{displayName}</h2>

          {/* Household switcher */}
          {mounted && activeHouseholdName && (
            <div className="relative mt-1" ref={dropdownRef}>
              <button
                onClick={() => households.length > 1 && setDropdownOpen((o) => !o)}
                className={[
                  "flex items-center gap-1 text-xs font-medium text-on-surface-variant/80 transition-all",
                  households.length > 1 ? "hover:text-on-surface cursor-pointer" : "cursor-default",
                ].join(" ")}
              >
                <span className="material-symbols-outlined text-[14px]">group</span>
                <span>{switching ? "Switching…" : activeHouseholdName}</span>
                {households.length > 1 && (
                  <span className={`material-symbols-outlined text-[14px] transition-transform ${dropdownOpen ? "rotate-180" : ""}`}>
                    expand_more
                  </span>
                )}
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 top-full mt-1 z-50 w-56 bg-surface-container-lowest rounded-2xl shadow-lg p-2 border border-outline-variant/20 flex flex-col gap-1">
                  {households.map((h) => (
                    <button
                      key={h.householdId}
                      onClick={() => handleSwitch(h.householdId)}
                      className={[
                        "w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors rounded-xl",
                        h.householdId === activeHouseholdId
                          ? "bg-primary-fixed text-primary font-semibold"
                          : "text-on-surface hover:bg-surface-container font-medium",
                      ].join(" ")}
                    >
                      <span className="flex-1">{h.householdName}</span>
                      <span className="text-[10px] text-on-surface-variant opacity-60">{h.role}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="text-sm text-on-surface-variant mt-1">Your sanctuary is ready</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={[
              "flex items-center transition-all rounded-full",
              collapsed ? "justify-center p-3" : "gap-3 px-4 py-3 text-sm font-medium",
              isActive(item.href)
                ? "bg-surface-container-lowest text-primary shadow-sm"
                : "text-on-surface hover:bg-white/50" + (collapsed ? "" : " hover:translate-x-1"),
            ].join(" ")}
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            {!collapsed && item.label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto flex flex-col gap-2">
        <Link
          href="/settings"
          title={collapsed ? "Settings" : undefined}
          className={[
            "flex items-center transition-all rounded-full",
            collapsed ? "justify-center p-3" : "gap-3 px-4 py-2 text-sm",
            isActive("/settings")
              ? "bg-surface-container-lowest text-primary shadow-sm"
              : "text-on-surface hover:bg-white/50" + (collapsed ? "" : " hover:translate-x-1"),
          ].join(" ")}
        >
          <span className="material-symbols-outlined text-[20px]">manage_accounts</span>
          {!collapsed && <span>Settings</span>}
        </Link>
        <Link
          href="/cooper"
          title={collapsed ? "Cooper" : undefined}
          className={[
            "flex items-center text-on-surface hover:bg-white/50 rounded-full transition-all",
            collapsed ? "justify-center p-3" : "gap-3 px-4 py-2 hover:translate-x-1",
          ].join(" ")}
        >
          <span className="material-symbols-outlined text-[20px]">smart_toy</span>
          {!collapsed && <span className="text-sm">Cooper</span>}
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/sign-in" })}
          title={collapsed ? "Sign out" : undefined}
          className={[
            "flex items-center text-on-surface hover:bg-white/50 rounded-full transition-all cursor-pointer",
            collapsed ? "justify-center p-3" : "gap-3 px-4 py-2 hover:translate-x-1",
          ].join(" ")}
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          {!collapsed && <span className="text-sm">Sign out</span>}
        </button>
      </div>
    </aside>
  );
}

