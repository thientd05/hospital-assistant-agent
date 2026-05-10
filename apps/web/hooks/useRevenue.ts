"use client";

import type {
  Revenue,
  RevenueCreateInput,
  RevenueUpdateInput,
} from "@pr_hospitalagent/types";
import { http } from "@/lib/apiClient";
import { useResource } from "./useResource";

export function useRevenue(version: number, enabled = true) {
  return useResource<{ count: number; revenue: Revenue[] }>(
    () => http.get("/api/revenue"),
    [version],
    enabled
  );
}

export function useRevenueEntry(
  id: string | null,
  version: number,
  enabled = true
) {
  return useResource<Revenue>(
    async () => {
      if (!id) throw new Error("Chưa chọn doanh thu");
      return http.get<Revenue>(`/api/revenue/${id}`);
    },
    [id, version],
    enabled && Boolean(id)
  );
}

export const revenueApi = {
  create: (body: RevenueCreateInput) =>
    http.post<Revenue>("/api/revenue", body),
  update: (id: string, body: RevenueUpdateInput) =>
    http.patch<Revenue>(`/api/revenue/${id}`, body),
  remove: (id: string) =>
    http.delete<{ ok: boolean; deleted: string }>(`/api/revenue/${id}`),
};
