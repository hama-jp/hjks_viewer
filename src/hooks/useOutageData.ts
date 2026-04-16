"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadOutagesCurrent, loadUnits, invalidateCache } from "@/lib/data-loader";
import type { NormalizedOutage, NormalizedUnit, OutageFile } from "@/types/outage";

type OutageDataState = {
  loading: boolean;
  error: string | null;
  records: NormalizedOutage[];
  meta: OutageFile["meta"] | null;
};

/**
 * 稼働終了ユニット（enddt !== "9999/12/31"）に属する停止情報を除外する。
 */
function excludeInactiveUnits(
  outages: NormalizedOutage[],
  units: NormalizedUnit[],
): NormalizedOutage[] {
  const inactiveKeys = new Set<string>();
  for (const u of units) {
    if (u.enddt !== "9999/12/31") {
      inactiveKeys.add(`${u.plantcd}\0${u.unitname}`);
    }
  }
  if (inactiveKeys.size === 0) return outages;
  return outages.filter((r) => !inactiveKeys.has(`${r.plantcd}\0${r.unitname}`));
}

/**
 * 停止情報データの読み込み・リトライを一元管理するフック。
 * 3ページ (Dashboard, Timeline, Outages) で共通利用する。
 * 稼働終了ユニットの停止情報は自動的に除外される。
 */
export function useOutageData() {
  const [state, setState] = useState<OutageDataState>({
    loading: true,
    error: null,
    records: [],
    meta: null,
  });

  // Request ID to ignore stale responses from previous load/retry calls
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const load = useCallback(async () => {
    const [outageResult, unitsResult] = await Promise.all([
      loadOutagesCurrent(),
      loadUnits(),
    ]);
    if (!outageResult.ok) {
      return {
        loading: false,
        error: outageResult.error,
        records: [] as NormalizedOutage[],
        meta: null,
      } satisfies OutageDataState;
    }
    const records = unitsResult.ok
      ? excludeInactiveUnits(outageResult.data, unitsResult.data)
      : outageResult.data;
    return {
      loading: false,
      error: null,
      records,
      meta: outageResult.meta ?? null,
    } satisfies OutageDataState;
  }, []);

  // Initial data load — state is already loading:true so no setState needed
  useEffect(() => {
    const id = ++requestIdRef.current;
    load().then((result) => {
      if (!mountedRef.current || id !== requestIdRef.current) return;
      setState(result);
    });
  }, [load]);

  const retry = useCallback(() => {
    invalidateCache();
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const id = ++requestIdRef.current;
    load().then((result) => {
      if (!mountedRef.current || id !== requestIdRef.current) return;
      setState(result);
    });
  }, [load]);

  return { ...state, retry };
}
