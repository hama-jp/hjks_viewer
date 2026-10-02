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

const MAINTEMODE_BADGE: Record<string, string> = {
  "2": "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  "3": "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
};

function badgeClass(maintemode: string): string {
  return (
    MAINTEMODE_BADGE[maintemode] ??
    "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400"
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
    <>
      {/* モバイル: カード表示（横スクロールや折り返しを避ける） */}
      <ul className="space-y-3 sm:hidden">
        {records.map((r) => {
          const startLabel = formatOutageDateLabel(r.startdt) ?? "―";
          return (
            <li key={r.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold leading-snug text-[var(--text)]">
                    {r.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {r.unitname}・{r.areaName}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(
                    r.maintemode
                  )}`}
                >
                  {r.maintemodeName}
                </span>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <div className="col-span-2">
                  <dt className="text-subtle">発電事業者</dt>
                  <dd className="mt-0.5 text-muted">{r.company}</dd>
                </div>
                <div>
                  <dt className="text-subtle">認可出力</dt>
                  <dd className="mt-0.5 tabular-nums text-muted">
                    {r.maxcapacity.toLocaleString()} MW
                  </dd>
                </div>
                <div>
                  <dt className="text-subtle">種別</dt>
                  <dd className="mt-0.5 text-muted">{r.assortmentName}</dd>
                </div>
                <div>
                  <dt className="text-subtle">停止日時</dt>
                  <dd className="mt-0.5 text-muted">{startLabel}</dd>
                </div>
                <div>
                  <dt className="text-subtle">復旧見通し</dt>
                  <dd className="mt-0.5 text-muted">{r.outlook || "―"}</dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>

      {/* タブレット以上: テーブル表示 */}
      <div className="card hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="surface-muted border-b border-[var(--border)]">
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
                className="border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-muted)]"
              >
                <td className="whitespace-nowrap px-3 py-2.5">{r.areaName}</td>
                <td className="px-3 py-2.5">{r.company}</td>
                <td className="px-3 py-2.5">{r.name}</td>
                <td className="px-3 py-2.5">{r.unitname}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                  {r.maxcapacity.toLocaleString()} MW
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(
                      r.maintemode
                    )}`}
                  >
                    {r.maintemodeName}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs text-muted">
                  {r.assortmentName}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted">
                  {formatOutageDateLabel(r.startdt) ?? "―"}
                </td>
                <td className="px-3 py-2.5 text-xs text-muted">
                  {r.outlook || "―"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}