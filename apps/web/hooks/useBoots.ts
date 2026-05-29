"use client";

import { http } from "@/lib/apiClient";
import { useResource } from "./useResource";

export type BootRole = "doctor" | "patient";
export type BootData = { role: BootRole; content: string };

export function useBoot(role: BootRole, version: number, enabled = true) {
  return useResource<BootData>(
    () => http.get<BootData>(`/api/boots/${role}`),
    [role, version],
    enabled
  );
}

export const bootsApi = {
  update: (role: BootRole, content: string) =>
    http.put<BootData>(`/api/boots/${role}`, { content }),
};
