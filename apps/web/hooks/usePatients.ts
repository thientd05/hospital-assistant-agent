"use client";

import type {
  PatientCreateInput,
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
    async () => {
      if (!patientId) throw new Error("Chưa chọn bệnh nhân");
      return http.get(`/api/patients/${patientId}/labs`);
    },
    [patientId, version],
    enabled && Boolean(patientId)
  );
}

export const patientsApi = {
  create: (body: PatientCreateInput) =>
    http.post<PatientPublic>("/api/patients", body),
  update: (id: string, body: PatientUpdateInput) =>
    http.patch<PatientPublic>(`/api/patients/${id}`, body),
  remove: (id: string) =>
    http.delete<{ ok: boolean; deleted: string }>(`/api/patients/${id}`),
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
