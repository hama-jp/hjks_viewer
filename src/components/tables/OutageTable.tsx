"use client";

import type { NormalizedOutage } from "@/types/outage";
import type { SortKey, SortDir } from "@/lib/filter-utils";
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
    <div className="rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
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
        <tbody>
          {records.map((r) => (
            <tr
              key={r.id}
              className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <td className="px-3 py-2.5 whitespace-nowrap">{r.areaName}</td>
              <td className="px-3 py-2.5">{r.company}</td>
              <td className="px-3 py-2.5">{r.name}</td>
              <td className="px-3 py-2.5">{r.unitname}</td>
              <td className="px-3 py-2.5 text-right whitespace-nowrap">
                {r.maxcapacity.toLocaleString()} MW
              </td>
              <td className="px-3 py-2.5 whitespace-nowrap">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    r.maintemode === "2"
                      ? "bg-red-100 text-red-700"
                      : r.maintemode === "3"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {r.maintemodeName}
                </span>
              </td>
              <td className="px-3 py-2.5 text-xs">{r.assortmentName}</td>
              <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                {r.startdt}
              </td>
              <td className="px-3 py-2.5 text-xs">{r.outlook}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
