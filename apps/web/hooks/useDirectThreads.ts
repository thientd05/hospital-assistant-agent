"use client";

import { useCallback, useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { authFetch } from "@/lib/tokenStore";
import { useAuth } from "@/app/providers/AuthProvider";
import { dedupedFetch, getCached } from "@/lib/resourceCache";

export type DirectThreadSummaryItem = {
  counterpartId: string;
  counterpartName: string;
  lastMessage: string | null;
  updatedAt: string | null;
};

type Options = {
  // "doctor" → /direct-messages ; "patient" → /me/direct-messages
  role: "doctor" | "patient";
  enabled?: boolean;
};

function listPath(role: "doctor" | "patient"): string {
  return role === "doctor" ? "/api/direct-messages" : "/api/me/direct-messages";
}

// Danh sách thread tin nhắn trực tiếp (1 dòng / đối phương) cho sidebar mode
// "tin nhắn". Bác sĩ thấy BN mình quản lý; bệnh nhân thấy bác sĩ quản lý mình.
export function useDirectThreads({ role, enabled = true }: Options) {
  const { token, logout } = useAuth();
  const cacheKey = listPath(role);
  const [threads, setThreads] = useState<DirectThreadSummaryItem[]>(
    () => getCached<DirectThreadSummaryItem[]>(cacheKey) ?? []
  );

  const refresh = useCallback(async () => {
    if (!token || !enabled) return;
    try {
      const data = await dedupedFetch<DirectThreadSummaryItem[]>(
        cacheKey,
        async () => {
          const res = await authFetch(`${API_URL}${cacheKey}`);
          if (res.status === 401) {
            logout();
            throw new Error("unauthorized");
          }
          if (!res.ok) throw new Error(`API ${res.status}`);
          const json = (await res.json()) as {
            threads: DirectThreadSummaryItem[];
          };
          return json.threads;
        }
      );
      setThreads(data);
    } catch {
      // network/server down hoặc 401 — giữ danh sách hiện tại
    }
  }, [token, logout, enabled, cacheKey]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
  }, [enabled, refresh]);

  return { threads, refresh };
}
