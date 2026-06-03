"use client";

import type { LabCatalogEntry } from "@pr_hospitalagent/types";
import { http } from "@/lib/apiClient";
import { useResource } from "./useResource";

// Danh mục xét nghiệm (đọc-only) cho dropdown chọn xét nghiệm của bác sĩ. Nạp lười:
// chỉ bật enabled khi bác sĩ thực sự vào chế độ sửa hồ sơ để tránh gọi thừa.
export function useLabCatalog(enabled = true) {
  return useResource<{ count: number; catalog: LabCatalogEntry[] }>(
    "/api/lab-catalog",
    () => http.get("/api/lab-catalog"),
    [],
    enabled
  );
}
