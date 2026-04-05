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
  return (
    <th
      onClick={() => onSort(sortKey)}
      className={`px-3 py-3 text-left font-medium text-slate-600 cursor-pointer select-none hover:text-blue-700 whitespace-nowrap ${className}`}
    >
      {label}
      {activeSortKey === sortKey && (
        <span className="ml-1">
          {sortDir === "asc" ? "\u25b2" : "\u25bc"}
        </span>
      )}
    </th>
  );
}
