"use client";

import type { Medication } from "@pr_hospitalagent/types";
import { http } from "@/lib/apiClient";
import { useResource } from "./useResource";

// Danh mục thuốc (đọc-only) cho form chọn thuốc của bác sĩ. Nạp lười: chỉ bật
// enabled khi bác sĩ thực sự cần (vào chế độ sửa hồ sơ) để tránh gọi thừa.
export function useMedications(enabled = true) {
  return useResource<{ count: number; medications: Medication[] }>(
    "/api/medications",
    () => http.get("/api/medications"),
    [],
    enabled
  );
}
