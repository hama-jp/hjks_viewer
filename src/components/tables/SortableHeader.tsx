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
      className={`px-3 py-3 text-left font-medium text-slate-600 cursor-pointer select-none hover:text-blue-700 whitespace-nowrap ${className}`}
    >
      {label}
      {isActive && (
        <span className="ml-1" aria-hidden="true">
          {sortDir === "asc" ? "\u25b2" : "\u25bc"}
        </span>
      )}
    </th>
  );
}
