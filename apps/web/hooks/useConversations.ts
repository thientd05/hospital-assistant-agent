"use client";

import { useCallback, useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/app/providers/AuthProvider";
import { dedupedFetch, getCached } from "@/lib/resourceCache";

const CACHE_KEY = "/api/conversations";

export type ConversationListItem = {
  id: string;
  title: string;
  updatedAt: string;
  patientId?: string;
};

export function useConversations() {
  const { token, logout } = useAuth();
  // Khởi tạo từ cache → hiện danh sách ngay khi quay lại trang, không chờ fetch.
  const [conversations, setConversations] = useState<ConversationListItem[]>(
    () => getCached<ConversationListItem[]>(CACHE_KEY) ?? []
  );

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const data = await dedupedFetch<ConversationListItem[]>(
        CACHE_KEY,
        async () => {
          const res = await fetch(`${API_URL}/api/conversations`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.status === 401) {
            logout();
            throw new Error("unauthorized");
          }
          if (!res.ok) throw new Error(`API ${res.status}`);
          const json = (await res.json()) as {
            conversations: ConversationListItem[];
          };
          return json.conversations;
        }
      );
      setConversations(data);
    } catch {
      // network/server down hoặc 401 — giữ danh sách hiện tại
    }
  }, [token, logout]);

  const deleteConversation = useCallback(
    async (id: string) => {
      if (!token) return;
      const res = await fetch(`${API_URL}/api/conversations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        logout();
        return;
      }
      if (!res.ok && res.status !== 404) {
        throw new Error(`API ${res.status}`);
      }
      await refresh();
    },
    [refresh, token, logout]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { conversations, refresh, deleteConversation };
}
