"use client";

// Cache đơn giản cho data fetch ở FE (stale-while-revalidate).
// - Map in-memory = nguồn đọc nhanh.
// - Write-through sessionStorage = sống qua điều hướng route + F5 trong cùng phiên tab.
// - Dedup in-flight = các caller cùng cacheKey dùng chung 1 request.
// Key = đường dẫn API (vd "/api/patients", "/api/patients/BN001"), KHÔNG gồm version.

const STORAGE_KEY = "res-cache:v1";

const memory = new Map<string, unknown>();
const inFlight = new Map<string, Promise<unknown>>();

let hydrated = false;

function hydrate(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw) as Record<string, unknown>;
    for (const [k, v] of Object.entries(obj)) memory.set(k, v);
  } catch {
    // sessionStorage có thể bị chặn / JSON hỏng — bỏ qua, coi như cache rỗng.
  }
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of memory.entries()) obj[k] = v;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // quota/đầy — cache in-memory vẫn hoạt động, bỏ qua phần persist.
  }
}

export function getCached<T>(key: string | null): T | undefined {
  if (!key) return undefined;
  hydrate();
  return memory.get(key) as T | undefined;
}

export function setCached(key: string, value: unknown): void {
  hydrate();
  memory.set(key, value);
  persist();
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
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // bỏ qua
  }
}
