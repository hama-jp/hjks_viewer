"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "ダッシュボード", exact: true },
  { href: "/timeline", label: "タイムライン", exact: false },
  { href: "/outages", label: "停止情報一覧", exact: false },
];

function isActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) return pathname === href;
  return pathname.startsWith(href);
}

export default function Navigation() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setMenuOpen(false);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [menuOpen, handleKeyDown]);

  const linkBase =
    "rounded-full px-3 py-1.5 text-sm font-medium transition-colors";
  const linkActive =
    "bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-400";
  const linkIdle =
    "text-muted hover:bg-[var(--surface-muted)] hover:text-[var(--text)]";

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden items-center gap-1 sm:flex">
        {NAV_ITEMS.map(({ href, label, exact }) => (
          <Link
            key={href}
            href={href}
            className={`${linkBase} ${
              isActive(pathname, href, exact) ? linkActive : linkIdle
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Mobile hamburger button */}
      <button
        type="button"
        className="rounded-lg p-2 text-muted transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text)] sm:hidden"
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-label="メニュー"
        aria-expanded={menuOpen}
      >
        {menuOpen ? (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        )}
      </button>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm sm:hidden"
          data-testid="mobile-menu-overlay"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Mobile menu dropdown */}
      {menuOpen ? (
        <nav
          className="absolute left-0 right-0 top-16 z-50 border-b border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg sm:hidden"
          data-testid="mobile-menu"
        >
          {NAV_ITEMS.map(({ href, label, exact }) => (
            <Link
              key={href}
              href={href}
              onClick={closeMenu}
              className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(pathname, href, exact)
                  ? "bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-400"
                  : "text-muted hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      ) : (
        <nav className="hidden" data-testid="mobile-menu" />
      )}
    </>
  );
}