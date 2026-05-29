"use client";

import type {
  Utility,
  UtilityCreateInput,
  UtilityUpdateInput,
} from "@pr_hospitalagent/types";
import { http } from "@/lib/apiClient";
import { useResource } from "./useResource";

export function useUtilities(version: number, enabled = true) {
  return useResource<{ count: number; utilities: Utility[] }>(
    "/api/utilities",
    () => http.get("/api/utilities"),
    [version],
    enabled
  );
}

export function useUtility(id: string | null, version: number, enabled = true) {
  return useResource<Utility>(
    id ? `/api/utilities/${id}` : null,
    async () => {
      if (!id) throw new Error("Chưa chọn hoá đơn");
      return http.get<Utility>(`/api/utilities/${id}`);
    },
    [id, version],
    enabled && Boolean(id)
  );
}

export const utilitiesApi = {
  create: (body: UtilityCreateInput) =>
    http.post<Utility>("/api/utilities", body),
  update: (id: string, body: UtilityUpdateInput) =>
    http.patch<Utility>(`/api/utilities/${id}`, body),
  remove: (id: string) =>
    http.delete<{ ok: boolean; deleted: string }>(`/api/utilities/${id}`),
};
