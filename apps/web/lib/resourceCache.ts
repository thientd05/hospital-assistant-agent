"use client";

// Cache đơn giản cho data fetch ở FE (stale-while-revalidate) — IN-MEMORY THUẦN.
// - Map in-memory = nguồn đọc nhanh, sống qua điều hướng SPA (không reload JS context).
// - Dedup in-flight = các caller cùng cacheKey dùng chung 1 request.
// - KHÔNG persist sessionStorage → F5/reload tạo lại JS context = Map rỗng = cache sạch.
// Key = đường dẫn API (vd "/api/patients", "/api/patients/BN001"), KHÔNG gồm version.

const memory = new Map<string, unknown>();
const inFlight = new Map<string, Promise<unknown>>();

export function getCached<T>(key: string | null): T | undefined {
  if (!key) return undefined;
  return memory.get(key) as T | undefined;
}

export function setCached(key: string, value: unknown): void {
  memory.set(key, value);
}

// Coalesce request trùng key: nếu đang có request cho key này, trả lại promise đó.
export function dedupedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key);
  if (existing) return existing as Promise<T>;

  const p = (async () => {
    try {
      const value = await fetcher();
      setCached(key, value);
      return value;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, p);
  return p;
}

// Xoá toàn bộ cache — gọi khi logout/login để không rò data giữa các phiên.
export function clearResourceCache(): void {
  memory.clear();
  inFlight.clear();
}
