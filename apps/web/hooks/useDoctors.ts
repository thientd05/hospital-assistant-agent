"use client";

import type {
  DoctorCreateInput,
  DoctorPublic,
  DoctorUpdateInput,
} from "@pr_hospitalagent/types";
import { http } from "@/lib/apiClient";
import { useResource } from "./useResource";

export type DoctorListItem = Pick<
  DoctorPublic,
  "id" | "fullName" | "title" | "department" | "specialty" | "phone" | "email"
>;

export function useDoctors(version: number, enabled = true) {
  return useResource<{ count: number; doctors: DoctorListItem[] }>(
    "/api/doctors",
    () => http.get("/api/doctors"),
    [version],
    enabled
  );
}

export function useDoctor(
  id: string | null,
  version: number,
  enabled = true
) {
  return useResource<DoctorPublic>(
    id ? `/api/doctors/${id}` : null,
    async () => {
      if (!id) throw new Error("Chưa chọn bác sĩ");
      return http.get<DoctorPublic>(`/api/doctors/${id}`);
    },
    [id, version],
    enabled && Boolean(id)
  );
}

export const doctorsApi = {
  create: (body: DoctorCreateInput) =>
    http.post<DoctorPublic>("/api/doctors", body),
  update: (id: string, body: DoctorUpdateInput) =>
    http.patch<DoctorPublic>(`/api/doctors/${id}`, body),
  remove: (id: string) =>
    http.delete<{ ok: boolean; deleted: string }>(`/api/doctors/${id}`),
};
