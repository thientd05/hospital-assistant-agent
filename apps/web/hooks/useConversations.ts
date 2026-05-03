"use client";

import { useCallback, useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/app/providers/AuthProvider";

export type ConversationListItem = {
  id: string;
  title: string;
  updatedAt: string;
  patientId?: string;
};

export function useConversations() {
  const { token, logout } = useAuth();
  const [conversations, setConversations] = useState<ConversationListItem[]>(
    []
  );

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        logout();
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as {
        conversations: ConversationListItem[];
      };
      setConversations(data.conversations);
    } catch {
      // network/server down — keep current list, surface nothing for now
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
