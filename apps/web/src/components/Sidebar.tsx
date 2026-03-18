"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  icon: string;
  label: string;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    label: "OVERVIEW",
    items: [
      { href: "/dashboard", icon: "fa-house", label: "Dashboard" },
    ],
  },
  {
    label: "FINANCES",
    items: [
      { href: "/accounts", icon: "fa-building-columns", label: "Accounts" },
      { href: "/debts", icon: "fa-credit-card", label: "Debts" },
      { href: "/projections", icon: "fa-chart-line", label: "Projections" },
    ],
  },
  {
    label: "TOOLS",
    items: [
      { href: "/check-in", icon: "fa-circle-check", label: "Check-In" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="sticky top-0 flex h-screen w-60 flex-col border-r border-border bg-bg">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-teal-light">
          <span className="font-heading text-xs font-bold text-teal">SB</span>
        </div>
        <span className="font-heading text-[15px] font-semibold tracking-tight text-text">
          SearchBundle
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-5">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="mb-2 px-2 font-mono text-[10px] uppercase tracking-[1.2px] text-text-tertiary">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={[
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                        isActive(item.href)
                          ? "bg-surface text-text"
                          : "text-text-secondary hover:bg-surface hover:text-text",
                      ].join(" ")}
                    >
                      <i className={`fa-solid ${item.icon} w-[18px] text-center text-[14px]`} />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* Cooper AI */}
      <div className="border-t border-border px-3 py-3">
        <Link
          href="/cooper"
          className={[
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors",
            isActive("/cooper")
              ? "bg-indigo-light text-indigo"
              : "text-indigo hover:bg-indigo-light",
          ].join(" ")}
        >
          <i className="fa-solid fa-wand-magic-sparkles w-[18px] text-center text-[14px]" />
          Cooper AI
        </Link>
      </div>
    </aside>
  );
}
