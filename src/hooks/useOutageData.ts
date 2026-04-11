"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadOutagesCurrent, invalidateCache } from "@/lib/data-loader";
import type { NormalizedOutage, OutageFile } from "@/types/outage";

type OutageDataState = {
  loading: boolean;
  error: string | null;
  records: NormalizedOutage[];
  meta: OutageFile["meta"] | null;
};

function handleResult(
  result: { ok: true; data: NormalizedOutage[]; meta?: OutageFile["meta"] } | { ok: false; error: string; data: null },
): OutageDataState {
  if (result.ok) {
    return { loading: false, error: null, records: result.data, meta: result.meta ?? null };
  }
  return { loading: false, error: result.error, records: [], meta: null };
}

/**
 * 停止情報データの読み込み・リトライを一元管理するフック。
 * 3ページ (Dashboard, Timeline, Outages) で共通利用する。
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

  // Initial data load — state is already loading:true so no setState needed
  useEffect(() => {
    const id = ++requestIdRef.current;
    loadOutagesCurrent().then((result) => {
      if (!mountedRef.current || id !== requestIdRef.current) return;
      setState(handleResult(result));
    });
  }, []);

  const retry = useCallback(() => {
    invalidateCache();
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const id = ++requestIdRef.current;
    loadOutagesCurrent().then((result) => {
      if (!mountedRef.current || id !== requestIdRef.current) return;
      setState(handleResult(result));
    });
  }, []);

  return { ...state, retry };
}
