"use client";

import type {
  Asset,
  AssetCreateInput,
  AssetUpdateInput,
} from "@pr_hospitalagent/types";
import { http } from "@/lib/apiClient";
import { useResource } from "./useResource";

export function useAssets(version: number, enabled = true) {
  return useResource<{ count: number; assets: Asset[] }>(
    "/api/assets",
    () => http.get("/api/assets"),
    [version],
    enabled
  );
}

export function useAsset(id: string | null, version: number, enabled = true) {
  return useResource<Asset>(
    id ? `/api/assets/${id}` : null,
    async () => {
      if (!id) throw new Error("Chưa chọn tài sản");
      return http.get<Asset>(`/api/assets/${id}`);
    },
    [id, version],
    enabled && Boolean(id)
  );
}

export const assetsApi = {
  create: (body: AssetCreateInput) => http.post<Asset>("/api/assets", body),
  update: (id: string, body: AssetUpdateInput) =>
    http.patch<Asset>(`/api/assets/${id}`, body),
  remove: (id: string) =>
    http.delete<{ ok: boolean; deleted: string }>(`/api/assets/${id}`),
};
