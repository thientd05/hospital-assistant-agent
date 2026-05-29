"use client";

import type { LabResult } from "@pr_hospitalagent/types";
import { http } from "@/lib/apiClient";
import { useResource } from "./useResource";

export type MyLabsResponse = {
  patientId: string;
  patientName: string;
  labResults: LabResult[];
};

// Kết quả xét nghiệm của bệnh nhân đang đăng nhập (read-only, id từ JWT ở backend).
export function useMyLabs(version: number, enabled = true) {
  return useResource<MyLabsResponse>(
    "/api/me/labs",
    () => http.get("/api/me/labs"),
    [version],
    enabled
  );
}
