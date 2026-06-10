"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DirectThreadSummaryItem } from "./useDirectThreads";

type Options = {
  threads: DirectThreadSummaryItem[];
  /** Vai trò người đang xem — tin "đến" là tin do đối phương (≠ vai trò này) gửi. */
  viewerRole: "doctor" | "patient";
  /** Khoá localStorage riêng theo user; null khi auth chưa sẵn sàng. */
  storageKey: string | null;
};

// Map { counterpartId → updatedAt ISO đã xem cuối }.
type SeenMap = Record<string, string>;

function load(key: string | null): SeenMap {
  if (!key) return {};
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as SeenMap) : {};
  } catch {
    return {};
  }
}

/**
 * Chấm "tin nhắn mới chưa đọc" cho mode tin nhắn trực tiếp.
 * Một thread coi là CHƯA ĐỌC khi tin cuối là tin ĐẾN (đối phương gửi) và mới hơn
 * thời điểm người xem mở thread đó lần cuối (lưu localStorage). `markSeen` cập nhật
 * mốc đã xem = updatedAt hiện tại của thread.
 */
export function useDirectAlerts({ threads, viewerRole, storageKey }: Options) {
  const [seen, setSeen] = useState<SeenMap>(() => load(storageKey));

  // Đổi user → nạp lại mốc đã xem của user đó.
  useEffect(() => {
    setSeen(load(storageKey));
  }, [storageKey]);

  const persist = useCallback(
    (next: SeenMap) => {
      setSeen(next);
      if (!storageKey) return;
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // bỏ qua khi storage đầy / disabled
      }
    },
    [storageKey]
  );

  const unseenIds = useMemo(() => {
    const set = new Set<string>();
    for (const t of threads) {
      if (!t.updatedAt) continue;
      // Chỉ tin ĐẾN (do đối phương gửi) mới tính là "tin mới".
      if (!t.lastSender || t.lastSender === viewerRole) continue;
      const last = seen[t.counterpartId];
      if (!last || t.updatedAt > last) set.add(t.counterpartId);
    }
    return set;
  }, [threads, seen, viewerRole]);

  const markSeen = useCallback(
    (counterpartId: string) => {
      const t = threads.find((x) => x.counterpartId === counterpartId);
      if (!t || !t.updatedAt) return;
      // Đã ở mốc này rồi thì khỏi ghi (tránh re-render thừa khi poll).
      if (seen[counterpartId] === t.updatedAt) return;
      persist({ ...seen, [counterpartId]: t.updatedAt });
    },
    [threads, seen, persist]
  );

  return { unseenIds, hasUnseen: unseenIds.size > 0, markSeen };
}
