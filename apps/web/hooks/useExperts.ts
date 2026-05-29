"use client";

import type {
  ExpertCreateInput,
  ExpertPublic,
  ExpertUpdateInput,
} from "@pr_hospitalagent/types";
import { http } from "@/lib/apiClient";
import { useResource } from "./useResource";

export type ExpertListItem = Pick<
  ExpertPublic,
  "id" | "fullName" | "title" | "expertise" | "phone" | "email"
>;

export function useExperts(version: number, enabled = true) {
  return useResource<{ count: number; experts: ExpertListItem[] }>(
    "/api/experts",
    () => http.get("/api/experts"),
    [version],
    enabled
  );
}

export function useExpert(
  id: string | null,
  version: number,
  enabled = true
) {
  return useResource<ExpertPublic>(
    id ? `/api/experts/${id}` : null,
    async () => {
      if (!id) throw new Error("Chưa chọn chuyên gia");
      return http.get<ExpertPublic>(`/api/experts/${id}`);
    },
    [id, version],
    enabled && Boolean(id)
  );
}

export const expertsApi = {
  create: (body: ExpertCreateInput) =>
    http.post<ExpertPublic>("/api/experts", body),
  update: (id: string, body: ExpertUpdateInput) =>
    http.patch<ExpertPublic>(`/api/experts/${id}`, body),
  remove: (id: string) =>
    http.delete<{ ok: boolean; deleted: string }>(`/api/experts/${id}`),
};
