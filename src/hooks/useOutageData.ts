"use client";

import { useEffect, useRef, useState } from "react";
import { loadOutagesCurrent, invalidateCache } from "@/lib/data-loader";
import type { NormalizedOutage, OutageFile } from "@/types/outage";

type OutageDataState = {
  loading: boolean;
  error: string | null;
  records: NormalizedOutage[];
  meta: OutageFile["meta"] | null;
};

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

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadOutagesCurrent().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setState({ loading: false, error: null, records: result.data, meta: result.meta ?? null });
      } else {
        setState({ loading: false, error: result.error, records: [], meta: null });
      }
    });
    return () => { cancelled = true; };
  }, []);

  const retry = () => {
    invalidateCache();
    setState((prev) => ({ ...prev, loading: true, error: null }));
    loadOutagesCurrent().then((result) => {
      if (!mountedRef.current) return;
      if (result.ok) {
        setState({ loading: false, error: null, records: result.data, meta: result.meta ?? null });
      } else {
        setState({ loading: false, error: result.error, records: [], meta: null });
      }
    });
  };

  return { ...state, retry };
}
