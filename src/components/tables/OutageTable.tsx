"use client";

import type { NormalizedOutage } from "@/types/outage";
import type { SortKey, SortDir } from "@/lib/filter-utils";
import { formatOutageDateLabel } from "@/lib/date-utils";
import SortableHeader from "./SortableHeader";

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: "areaName", label: "エリア" },
  { key: "company", label: "発電事業者" },
  { key: "name", label: "発電所名" },
  { key: "unitname", label: "ユニット名" },
  { key: "maxcapacity", label: "認可出力", className: "text-right" },
  { key: "maintemodeName", label: "停止区分" },
  { key: "assortmentName", label: "種別" },
  { key: "startdt", label: "停止日時" },
  { key: "outlook", label: "復旧見通し" },
];

const BADGE_STYLES: Record<string, string> = {
  "1": "bg-blue-50 text-blue-700 ring-blue-600/15 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/20",
  "2": "bg-red-50 text-red-700 ring-red-600/15 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/20",
  "3": "bg-amber-50 text-amber-700 ring-amber-600/15 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20",
};

function MaintemodeBadge({ record }: { record: NormalizedOutage }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        BADGE_STYLES[record.maintemode] ??
        "bg-slate-100 text-slate-600 ring-slate-500/15 dark:bg-slate-700 dark:text-slate-300 dark:ring-slate-600"
      }`}
    >
      {record.maintemodeName}
    </span>
  );
}

type OutageTableProps = {
  records: NormalizedOutage[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
};

export default function OutageTable({
  records,
  sortKey,
  sortDir,
  onSort,
}: OutageTableProps) {
  return (
    <div className="surface-card overflow-hidden">
      {/* Desktop: sortable table */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/50">
              {COLUMNS.map((col) => (
                <SortableHeader
                  key={col.key}
                  label={col.label}
                  sortKey={col.key}
                  activeSortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  className={col.className}
                />
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {records.map((r) => (
              <tr
                key={r.id}
                className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
              >
                <td className="px-3 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300">{r.areaName}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-slate-700 dark:text-slate-200">{r.company}</td>
                <td className="px-3 py-2.5 font-medium whitespace-nowrap text-slate-900 dark:text-slate-100">{r.name}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300">{r.unitname}</td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap tabular-nums text-slate-700 dark:text-slate-200">
                  {r.maxcapacity.toLocaleString()} <span className="text-xs text-slate-400">MW</span>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <MaintemodeBadge record={r} />
                </td>
                <td className="px-3 py-2.5 text-xs whitespace-nowrap text-slate-500 dark:text-slate-400">{r.assortmentName}</td>
                <td className="px-3 py-2.5 text-xs whitespace-nowrap tabular-nums text-slate-600 dark:text-slate-300">
                  {formatOutageDateLabel(r.startdt)}
                </td>
                <td className="px-3 py-2.5 text-xs whitespace-nowrap text-slate-500 dark:text-slate-400">{r.outlook || "―"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile / tablet: stacked cards (no horizontal cut-off) */}
      <ul className="divide-y divide-slate-100 lg:hidden dark:divide-slate-800">
        {records.map((r) => (
          <li key={r.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{r.name}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                  {r.company} · {r.areaName} · {r.unitname}
                </p>
              </div>
              <MaintemodeBadge record={r} />
            </div>
            <dl className="mt-3 grid grid-cols-1 gap-y-1.5 text-xs sm:grid-cols-2 sm:gap-x-6">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="shrink-0 text-slate-400 dark:text-slate-500">停止日時</dt>
                <dd className="truncate text-right tabular-nums text-slate-700 dark:text-slate-200">
                  {formatOutageDateLabel(r.startdt)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="shrink-0 text-slate-400 dark:text-slate-500">認可出力</dt>
                <dd className="truncate text-right tabular-nums text-slate-700 dark:text-slate-200">
                  {r.maxcapacity.toLocaleString()} MW
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="shrink-0 text-slate-400 dark:text-slate-500">種別</dt>
                <dd className="truncate text-right text-slate-700 dark:text-slate-200">
                  {r.assortmentName}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="shrink-0 text-slate-400 dark:text-slate-500">復旧見通し</dt>
                <dd className="truncate text-right text-slate-700 dark:text-slate-200">
                  {r.outlook || "―"}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}