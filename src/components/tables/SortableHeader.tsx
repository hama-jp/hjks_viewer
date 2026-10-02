"use client";

import type { SortKey, SortDir } from "@/lib/filter-utils";

type SortableHeaderProps = {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
};

export default function SortableHeader({
  label,
  sortKey,
  activeSortKey,
  sortDir,
  onSort,
  className = "",
}: SortableHeaderProps) {
  const isActive = activeSortKey === sortKey;
  return (
    <th
      role="columnheader"
      aria-sort={isActive ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
      tabIndex={0}
      onClick={() => onSort(sortKey)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSort(sortKey);
        }
      }}
      className={`cursor-pointer px-3 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        isActive
          ? "text-blue-700 dark:text-blue-400"
          : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
      } ${className}`}
    >
      {label}
      {isActive && (
        <span className="ml-1 text-[10px]" aria-hidden="true">
          {sortDir === "asc" ? "\u25b2" : "\u25bc"}
        </span>
      )}
    </th>
  );
}
