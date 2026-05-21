"use client";

import type { Message } from "@pr_hospitalagent/types";
import { http } from "@/lib/apiClient";
import { useResource } from "./useResource";

export type ConversationOwnerRole = "doctor" | "patient" | "unknown";

export type ConversationAuditItem = {
  id: string;
  title: string;
  updatedAt: string;
  ownerId: string | null;
  ownerName: string | null;
  ownerRole: ConversationOwnerRole;
};

export function useConversationAuditList(version: number, enabled = true) {
  return useResource<{ conversations: ConversationAuditItem[] }>(
    () => http.get("/api/conversations/audit"),
    [version],
    enabled
  );
}

export type ConversationAuditDetail = {
  id: string;
  title: string;
  ownerId: string | null;
  ownerName: string | null;
  ownerRole: ConversationOwnerRole;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
};

export function useConversationAuditDetail(
  id: string | null,
  version: number,
  enabled = true
) {
  return useResource<ConversationAuditDetail>(
    async () => {
      if (!id) throw new Error("Chưa chọn hội thoại");
      return http.get<ConversationAuditDetail>(
        `/api/conversations/audit/${id}`
      );
    },
    [id, version],
    enabled && Boolean(id)
  );
}
