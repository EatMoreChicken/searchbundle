"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

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
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const displayName = session?.user?.name ?? session?.user?.email ?? "My Account";
  const displayEmail = session?.user?.email ?? "";

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

      {/* Account */}
      <div className="border-t border-border px-3 py-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface">
            <i className="fa-solid fa-user w-[18px] text-center text-[12px] text-text-secondary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-text">{displayName}</p>
            <p className="truncate text-[11px] text-text-tertiary">{displayEmail}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/sign-in" })}
            title="Sign out"
            className="shrink-0 text-text-tertiary transition-colors hover:text-text"
          >
            <i className="fa-solid fa-arrow-right-from-bracket text-[13px]" />
          </button>
        </div>
      </div>
    </aside>
  );
}

