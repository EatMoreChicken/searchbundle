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
  { href: "/dashboard", icon: "fa-chart-pie", label: "Dashboard" },
  { href: "/tracker", icon: "fa-chart-line", label: "Tracker" },
  { href: "/assets", icon: "fa-piggy-bank", label: "Assets" },
  { href: "/liabilities", icon: "fa-credit-card", label: "Liabilities" },
  { href: "/cooper", icon: "fa-robot", label: "Cooper" },
  { href: "/settings", icon: "fa-gear", label: "Settings" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, update: updateSession } = useSession();
  const [mounted, setMounted] = useState(false);
  const [households, setHouseholds] = useState<HouseholdMembership[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

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
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  async function handleSwitch(householdId: string) {
    if (householdId === activeHouseholdId || switching) return;
    setSwitching(true);
    setMenuOpen(false);
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

  function isActive(href: string) {
    if (!mounted) return false;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <header className="sticky top-0 z-50 bg-surface" style={{ borderBottom: "none" }}>
      <div className="flex items-center h-14 px-4 lg:px-6">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 mr-8 shrink-0">
          <img src="/logo.png" alt="SearchBundle" width={28} height={28} className="rounded-md" />
          <span className="font-extrabold text-[15px] tracking-tight text-text-primary hidden sm:inline">
            Search<span className="text-accent">Bundle</span>
          </span>
        </Link>

        {/* Nav items - desktop */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "relative flex items-center gap-2 px-3 py-2 text-[13px] font-medium transition-colors duration-150",
                isActive(item.href)
                  ? "text-accent"
                  : "text-text-tertiary hover:text-accent",
              ].join(" ")}
            >
              <i className={`fa-solid ${item.icon} text-[12px]`} />
              {item.label}
              {isActive(item.href) && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-accent rounded-full" />
              )}
            </Link>
          ))}
        </nav>

        {/* Right side: household + user menu */}
        <div className="ml-auto flex items-center gap-3">
          {/* Household label */}
          {mounted && activeHouseholdName && households.length > 1 && (
            <span className="text-xs text-text-tertiary hidden lg:inline">
              {switching ? "Switching..." : activeHouseholdName}
            </span>
          )}

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-accent transition-colors duration-150 cursor-pointer"
            >
              <i className="fa-solid fa-circle-user text-[18px]" />
              <i className={`fa-solid fa-chevron-down text-[10px] transition-transform duration-150 ${menuOpen ? "rotate-180" : ""}`} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-surface rounded-lg p-2 z-50" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
                <div className="px-3 py-2 text-xs text-text-tertiary">
                  {mounted ? (session?.user?.name ?? session?.user?.email ?? "My Account") : "\u00A0"}
                </div>

                {/* Household switcher */}
                {households.length > 1 && (
                  <>
                    <div className="px-3 pt-2 pb-1 text-[9px] font-semibold uppercase tracking-widest text-text-disabled">
                      Households
                    </div>
                    {households.map((h) => (
                      <button
                        key={h.householdId}
                        onClick={() => handleSwitch(h.householdId)}
                        className={[
                          "w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors duration-150 rounded-md cursor-pointer",
                          h.householdId === activeHouseholdId
                            ? "bg-accent-light text-accent font-semibold"
                            : "text-text-primary hover:bg-surface-alt",
                        ].join(" ")}
                      >
                        <i className="fa-solid fa-users text-[10px]" />
                        <span className="flex-1">{h.householdName}</span>
                        <span className="text-[10px] text-text-tertiary">{h.role}</span>
                      </button>
                    ))}
                    <div className="my-1 h-px bg-surface-alt" />
                  </>
                )}

                <button
                  onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/sign-in" }); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-error hover:bg-error-light rounded-md transition-colors duration-150 cursor-pointer"
                >
                  <i className="fa-solid fa-arrow-right-from-bracket text-[11px]" />
                  Sign out
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden flex items-center justify-center w-8 h-8 text-text-secondary cursor-pointer"
          >
            <i className="fa-solid fa-bars text-[16px]" />
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <nav className="md:hidden bg-surface px-4 pb-3 flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors duration-150",
                isActive(item.href)
                  ? "text-accent bg-accent-light"
                  : "text-text-secondary hover:bg-surface-alt",
              ].join(" ")}
            >
              <i className={`fa-solid ${item.icon} text-[13px]`} />
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
