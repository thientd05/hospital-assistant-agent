"use client";

import { useCallback, useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { authFetch } from "@/lib/tokenStore";
import { useAuth } from "@/app/providers/AuthProvider";
import { dedupedFetch, getCached } from "@/lib/resourceCache";

const CACHE_KEY = "/api/conversations/patients";

export type PatientConversationListItem = {
  id: string;
  title: string;
  updatedAt: string;
  ownerId: string | null;
  ownerName: string | null;
};

type Options = {
  enabled?: boolean;
};

export function usePatientConversations({ enabled = true }: Options = {}) {
  const { token, logout } = useAuth();
  // Khởi tạo từ cache → hiện danh sách ngay khi quay lại, không chờ fetch.
  const [conversations, setConversations] = useState<
    PatientConversationListItem[]
  >(() => getCached<PatientConversationListItem[]>(CACHE_KEY) ?? []);

  const refresh = useCallback(async () => {
    if (!token || !enabled) return;
    try {
      const data = await dedupedFetch<PatientConversationListItem[]>(
        CACHE_KEY,
        async () => {
          const res = await authFetch(`${API_URL}/api/conversations/patients`);
          if (res.status === 401) {
            logout();
            throw new Error("unauthorized");
          }
          if (!res.ok) throw new Error(`API ${res.status}`);
          const json = (await res.json()) as {
            conversations: PatientConversationListItem[];
          };
          return json.conversations;
        }
      );
      setConversations(data);
    } catch {
      // network/server down hoặc 401 — giữ danh sách hiện tại
    }
  }, [token, logout, enabled]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
  }, [enabled, refresh]);

  return { conversations, refresh };
}
