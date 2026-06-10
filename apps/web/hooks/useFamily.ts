"use client";

import type {
  FamilyView,
  FamilyInviteView,
  FamilyMemberDetail,
  FamilyMemberSummary,
} from "@pr_hospitalagent/types";
import { http } from "@/lib/apiClient";
import { useResource } from "./useResource";

export function useMyFamily(version: number, enabled = true) {
  return useResource<FamilyView>(
    "/api/me/family",
    () => http.get<FamilyView>("/api/me/family"),
    [version],
    enabled
  );
}

export function useFamilyInvites(version: number, enabled = true) {
  return useResource<FamilyInviteView[]>(
    "/api/me/family/invites",
    () => http.get<FamilyInviteView[]>("/api/me/family/invites"),
    [version],
    enabled
  );
}

export const familyApi = {
  search: (phone: string) =>
    http.get<FamilyMemberSummary>(
      `/api/me/family/search?phone=${encodeURIComponent(phone)}`
    ),
  invite: (phone: string) =>
    http.post<{ ok: boolean }>("/api/me/family/invites", { phone }),
  accept: (id: string) =>
    http.post<FamilyView>(`/api/me/family/invites/${id}/accept`, {}),
  decline: (id: string) =>
    http.post<{ ok: boolean }>(`/api/me/family/invites/${id}/decline`, {}),
  rename: (name: string) =>
    http.patch<FamilyView>("/api/me/family", { name }),
  leave: () => http.post<{ ok: boolean }>("/api/me/family/leave", {}),
  removeMember: (memberId: string) =>
    http.delete<{ ok: boolean }>(`/api/me/family/members/${memberId}`),
  getMember: (memberId: string) =>
    http.get<FamilyMemberDetail>(`/api/me/family/members/${memberId}`),
};
