"use client";

import { useCallback, useEffect, useState } from "react";
import { AGENT_URL } from "@/lib/api";
import { useAuth } from "@/app/providers/AuthProvider";

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
  const [conversations, setConversations] = useState<
    PatientConversationListItem[]
  >([]);

  const refresh = useCallback(async () => {
    if (!token || !enabled) return;
    try {
      const res = await fetch(`${AGENT_URL}/api/conversations/patients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        logout();
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as {
        conversations: PatientConversationListItem[];
      };
      setConversations(data.conversations);
    } catch {
      // network/server down — keep current list
    }
  }, [token, logout, enabled]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
  }, [enabled, refresh]);

  return { conversations, refresh };
}
