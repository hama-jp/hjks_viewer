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

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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
      {/* Desktop nav */}
      <nav className="hidden sm:flex items-center gap-6">
        {NAV_ITEMS.map(({ href, label, exact }) => (
          <Link
            key={href}
            href={href}
            className={`text-sm font-medium transition-colors ${
              isActive(pathname, href, exact)
                ? "text-blue-700 dark:text-blue-400 font-semibold"
                : "text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Mobile hamburger button */}
      <button
        type="button"
        className="sm:hidden p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
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
          className="fixed inset-0 z-40 bg-black/30 sm:hidden"
          data-testid="mobile-menu-overlay"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Mobile menu dropdown */}
      {menuOpen ? (
        <nav
          className="absolute top-16 left-0 right-0 z-50 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-lg sm:hidden"
          data-testid="mobile-menu"
        >
          <div className="px-4 py-3 space-y-1">
            {NAV_ITEMS.map(({ href, label, exact }) => (
              <Link
                key={href}
                href={href}
                className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(pathname, href, exact)
                    ? "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 font-semibold"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>
      ) : (
        <nav className="hidden" data-testid="mobile-menu" />
      )}
    </>
  );
}
