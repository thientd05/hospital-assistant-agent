"use client";

import { http } from "@/lib/apiClient";
import { useResource } from "./useResource";

export type ManagingDoctor = {
  id: string;
  fullName: string;
  department: string;
};

// Các bác sĩ đang quản lý bệnh nhân đang đăng nhập (để mặc định khi đặt lịch).
export function useManagingDoctors(version: number, enabled = true) {
  return useResource<{ count: number; doctors: ManagingDoctor[] }>(
    "/api/me/managing-doctors",
    () => http.get("/api/me/managing-doctors"),
    [version],
    enabled
  );
}
