"use client";

import { Suspense, useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { loadOutagesCurrent } from "@/lib/data-loader";
import { AREAS, FORMATS, MAINTEMODES } from "@/lib/constants";
import type { NormalizedOutage, OutageFile } from "@/types/outage";

const PAGE_SIZE = 50;

type SortKey =
  | "areaName"
  | "company"
  | "name"
  | "unitname"
  | "maxcapacity"
  | "maintemodeName"
  | "assortmentName"
  | "startdt"
  | "outlook";

type SortDir = "asc" | "desc";

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

function CheckboxGroup({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: Record<string, string>;
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const toggle = (code: string) => {
    const next = new Set(selected);
    if (next.has(code)) {
      next.delete(code);
    } else {
      next.add(code);
    }
    onChange(next);
  };

  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-700 mb-2">
        {label}
      </legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {Object.entries(options).map(([code, name]) => (
          <label
            key={code}
            className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.has(code)}
              onChange={() => toggle(code)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            {name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function OutagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [records, setRecords] = useState<NormalizedOutage[]>([]);
  const [meta, setMeta] = useState<OutageFile["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters from URL
  const selectedAreas = useMemo(
    () => new Set(searchParams.get("areas")?.split(",").filter(Boolean) ?? []),
    [searchParams]
  );
  const selectedFormats = useMemo(
    () =>
      new Set(searchParams.get("formats")?.split(",").filter(Boolean) ?? []),
    [searchParams]
  );
  const selectedMaintemodes = useMemo(
    () =>
      new Set(
        searchParams.get("maintemodes")?.split(",").filter(Boolean) ?? []
      ),
    [searchParams]
  );
  const searchText = searchParams.get("q") ?? "";
  const currentPage = parseInt(searchParams.get("page") ?? "1", 10) || 1;
  const sortKey = (searchParams.get("sort") as SortKey) ?? "startdt";
  const sortDir = (searchParams.get("dir") as SortDir) ?? "desc";

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  const setFilterSet = useCallback(
    (paramName: string, next: Set<string>) => {
      const value = [...next].join(",");
      updateParams({ [paramName]: value || null, page: null });
    },
    [updateParams]
  );

  useEffect(() => {
    let cancelled = false;
    loadOutagesCurrent().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setRecords(result.data);
        setMeta(result.meta ?? null);
      } else {
        setError(result.error);
        setRecords([]);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // Filter and sort
  const filtered = useMemo(() => {
    let data = records;

    if (selectedAreas.size > 0) {
      data = data.filter((r) => selectedAreas.has(r.area));
    }
    if (selectedFormats.size > 0) {
      data = data.filter((r) => selectedFormats.has(r.format));
    }
    if (selectedMaintemodes.size > 0) {
      data = data.filter((r) => selectedMaintemodes.has(r.maintemode));
    }
    if (searchText) {
      const q = searchText.toLowerCase();
      data = data.filter(
        (r) =>
          r.company.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.unitname.toLowerCase().includes(q) ||
          r.areaName.includes(q) ||
          r.formatName.includes(q) ||
          r.factor.toLowerCase().includes(q)
      );
    }

    // Sort
    data = [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const as = String(av ?? "");
      const bs = String(bv ?? "");
      return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
    });

    return data;
  }, [
    records,
    selectedAreas,
    selectedFormats,
    selectedMaintemodes,
    searchText,
    sortKey,
    sortDir,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      updateParams({ dir: sortDir === "asc" ? "desc" : "asc" });
    } else {
      updateParams({ sort: key, dir: "asc" });
    }
  };

  if (error && records.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-xl bg-white p-8 shadow-sm border border-slate-200 text-center">
          <p className="text-slate-500 mb-4">データがありません</p>
          <p className="text-sm text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">停止情報一覧</h1>
        {meta && (
          <p className="text-sm text-slate-500 mt-1">
            最終更新: {meta.generatedAt} / {records.length}件
          </p>
        )}
      </div>

      {/* Filter panel */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200 mb-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">
            フリーテキスト検索
          </label>
          <input
            type="text"
            value={searchText}
            onChange={(e) => updateParams({ q: e.target.value || null, page: null })}
            placeholder="事業者名、発電所名、要因など..."
            className="w-full sm:w-80 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <CheckboxGroup
          label="エリア"
          options={AREAS}
          selected={selectedAreas}
          onChange={(s) => setFilterSet("areas", s)}
        />
        <CheckboxGroup
          label="発電形式"
          options={FORMATS}
          selected={selectedFormats}
          onChange={(s) => setFilterSet("formats", s)}
        />
        <CheckboxGroup
          label="停止区分"
          options={MAINTEMODES}
          selected={selectedMaintemodes}
          onChange={(s) => setFilterSet("maintemodes", s)}
        />
        {(selectedAreas.size > 0 ||
          selectedFormats.size > 0 ||
          selectedMaintemodes.size > 0 ||
          searchText) && (
          <button
            onClick={() =>
              updateParams({
                areas: null,
                formats: null,
                maintemodes: null,
                q: null,
                page: null,
              })
            }
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            フィルターをリセット
          </button>
        )}
      </div>

      {/* Results info */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-500">
          {loading ? "読み込み中..." : `${filtered.length}件中 ${(safePage - 1) * PAGE_SIZE + 1}〜${Math.min(safePage * PAGE_SIZE, filtered.length)}件を表示`}
        </p>
      </div>

      {/* Table */}
      {loading ? (
        <div className="rounded-xl bg-white shadow-sm border border-slate-200 p-8 animate-pulse">
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-6 bg-slate-100 rounded" />
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl bg-white p-8 shadow-sm border border-slate-200 text-center">
          <p className="text-slate-400">該当するデータがありません</p>
        </div>
      ) : (
        <div className="rounded-xl bg-white shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`px-3 py-3 text-left font-medium text-slate-600 cursor-pointer select-none hover:text-blue-700 whitespace-nowrap ${col.className ?? ""}`}
                  >
                    {col.label}
                    {sortKey === col.key && (
                      <span className="ml-1">
                        {sortDir === "asc" ? "\u25b2" : "\u25bc"}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {r.areaName}
                  </td>
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
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            disabled={safePage <= 1}
            onClick={() =>
              updateParams({ page: String(safePage - 1) })
            }
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-slate-100 transition-colors"
          >
            前へ
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(
              (p) =>
                p === 1 ||
                p === totalPages ||
                Math.abs(p - safePage) <= 2
            )
            .reduce<(number | "...")[]>((acc, p, idx, arr) => {
              if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                acc.push("...");
              }
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-1 text-slate-400">
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => updateParams({ page: String(p) })}
                  className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    p === safePage
                      ? "bg-blue-600 text-white"
                      : "border border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {p}
                </button>
              )
            )}
          <button
            disabled={safePage >= totalPages}
            onClick={() =>
              updateParams({ page: String(safePage + 1) })
            }
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-slate-100 transition-colors"
          >
            次へ
          </button>
        </div>
      )}
    </div>
  );
}

function OutagesLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-6" />
      <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200 mb-6 animate-pulse">
        <div className="space-y-3">
          <div className="h-4 w-32 bg-slate-200 rounded" />
          <div className="h-10 w-80 bg-slate-100 rounded" />
        </div>
      </div>
      <div className="rounded-xl bg-white shadow-sm border border-slate-200 p-8 animate-pulse">
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-6 bg-slate-100 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function OutagesPage() {
  return (
    <Suspense fallback={<OutagesLoading />}>
      <OutagesContent />
    </Suspense>
  );
}
