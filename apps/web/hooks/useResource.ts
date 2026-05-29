"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/apiClient";
import { dedupedFetch, getCached, setCached } from "@/lib/resourceCache";

type FetcherDeps = readonly unknown[];

export type UseResourceState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

// cacheKey = đường dẫn tài nguyên (vd "/api/patients/BN001"), KHÔNG gồm version.
// null → bỏ qua cache (vd chưa chọn id / disabled).
export function useResource<T>(
  cacheKey: string | null,
  fetcher: () => Promise<T>,
  deps: FetcherDeps,
  enabled: boolean = true
): UseResourceState<T> {
  const cached = getCached<T>(cacheKey);
  const [data, setData] = useState<T | null>(cached ?? null);
  const [loading, setLoading] = useState(cached === undefined && enabled);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const keyRef = useRef(cacheKey);
  keyRef.current = cacheKey;

  const runFetch = useCallback(async () => {
    const key = keyRef.current;
    // Có cache → hiện ngay, revalidate nền (không spinner). Không cache → spinner.
    const hasCache = key ? getCached<T>(key) !== undefined : false;
    if (!hasCache) setLoading(true);
    setError(null);
    try {
      const v = key
        ? await dedupedFetch<T>(key, () => fetcherRef.current())
        : await fetcherRef.current();
      if (key) setCached(key, v);
      setData(v);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? `${e.status}: ${e.message}`
          : e instanceof Error
            ? e.message
            : String(e);
      setError(msg);
      // Lỗi revalidate → giữ nguyên data cũ đang hiển thị (nếu có).
    } finally {
      setLoading(false);
    }
  }, []);

  // Khi cacheKey đổi (vd đổi id): nạp cache của key mới trước, tránh hiện data key cũ.
  useEffect(() => {
    const c = getCached<T>(cacheKey);
    setData(c ?? null);
    setLoading(c === undefined && enabled);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  useEffect(() => {
    if (!enabled) return;
    runFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, runFetch, ...deps]);

  return { data, loading, error, refetch: runFetch };
}
