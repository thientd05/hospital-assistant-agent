"use client";

import type { HomeVital, HomeVitalInput, Vital } from "@pr_hospitalagent/types";
import { http } from "@/lib/apiClient";
import { useResource } from "./useResource";

export type HomeVitalsResponse = {
  patientId: string;
  vitals: Vital | null;
  homeVitals: HomeVital[];
};

// Chỉ số tại nhà của bệnh nhân đang đăng nhập (id lấy từ JWT ở backend).
export function useHomeVitals(version: number, enabled = true) {
  return useResource<HomeVitalsResponse>(
    "/api/me/home-vitals",
    () => http.get("/api/me/home-vitals"),
    [version],
    enabled
  );
}

export const homeVitalsApi = {
  create: (body: HomeVitalInput) =>
    http.post<{ ok: boolean; homeVital: HomeVital }>(
      "/api/me/home-vitals",
      body
    ),
};
