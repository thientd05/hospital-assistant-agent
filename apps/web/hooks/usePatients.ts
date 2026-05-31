"use client";

import type {
  PatientPublic,
  PatientUpdateInput,
  LabResult,
} from "@pr_hospitalagent/types";
import { http } from "@/lib/apiClient";
import { useResource } from "./useResource";

export type PatientListItem = Pick<
  PatientPublic,
  "id" | "name" | "age" | "gender" | "ward" | "diagnoses"
>;

export function usePatients(version: number, enabled = true) {
  return useResource<{ count: number; patients: PatientListItem[] }>(
    "/api/patients",
    () => http.get("/api/patients"),
    [version],
    enabled
  );
}

export function usePatient(
  id: string | null,
  version: number,
  enabled = true
) {
  return useResource<PatientPublic>(
    id ? `/api/patients/${id}` : null,
    async () => {
      if (!id) throw new Error("Chưa chọn bệnh nhân");
      return http.get<PatientPublic>(`/api/patients/${id}`);
    },
    [id, version],
    enabled && Boolean(id)
  );
}

export function useLabs(
  patientId: string | null,
  version: number,
  enabled = true
) {
  return useResource<{
    patientId: string;
    patientName: string;
    labResults: LabResult[];
  }>(
    patientId ? `/api/patients/${patientId}/labs` : null,
    async () => {
      if (!patientId) throw new Error("Chưa chọn bệnh nhân");
      return http.get(`/api/patients/${patientId}/labs`);
    },
    [patientId, version],
    enabled && Boolean(patientId)
  );
}

export const patientsApi = {
  update: (id: string, body: PatientUpdateInput) =>
    http.patch<PatientPublic>(`/api/patients/${id}`, body),
  addLab: (id: string, lab: LabResult) =>
    http.post<{ ok: boolean; lab: LabResult }>(
      `/api/patients/${id}/labs`,
      lab
    ),
  removeLab: (id: string, index: number) =>
    http.delete<{ ok: boolean; removedIndex: number }>(
      `/api/patients/${id}/labs/${index}`
    ),
};
