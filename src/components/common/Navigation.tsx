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

  // Close menu on Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setMenuOpen(false);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [menuOpen, handleKeyDown]);

  return (
    <>
      {/* Desktop nav — segmented pill control */}
      <nav className="hidden items-center gap-0.5 rounded-full border border-slate-200/80 bg-slate-100/80 p-1 sm:flex dark:border-slate-800 dark:bg-slate-900/70">
        {NAV_ITEMS.map(({ href, label, exact }) => {
          const active = isActive(pathname, href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={`rounded-full px-3.5 py-1.5 text-sm whitespace-nowrap transition-all ${
                active
                  ? "bg-white font-semibold text-blue-700 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-800 dark:text-blue-400 dark:ring-white/10"
                  : "font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile hamburger button */}
      <button
        type="button"
        className="ml-auto rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:hidden dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
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
          className="absolute inset-x-0 top-16 z-40 h-screen bg-slate-900/20 backdrop-blur-sm sm:hidden"
          data-testid="mobile-menu-overlay"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Mobile menu dropdown */}
      {menuOpen ? (
        <nav
          className="absolute inset-x-0 top-16 z-50 rounded-b-2xl border-b border-slate-200 bg-white px-3 py-3 shadow-xl shadow-slate-900/10 sm:hidden dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/40"
          data-testid="mobile-menu"
        >
          <div className="mx-auto max-w-7xl space-y-1">
            {NAV_ITEMS.map(({ href, label, exact }) => {
              const active = isActive(pathname, href, exact);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={closeMenu}
                  className={`block rounded-xl px-4 py-2.5 text-sm transition-colors ${
                    active
                      ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                      : "font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : (
        <nav className="hidden" data-testid="mobile-menu" />
      )}
    </>
  );
}