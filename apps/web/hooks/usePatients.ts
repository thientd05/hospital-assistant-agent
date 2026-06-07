"use client";

import type {
  ExamRecord,
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
  // Chỉ gửi tên + kết quả; server tự suy đơn vị/khoảng tham chiếu/bất thường.
  addLab: (id: string, lab: { name: string; value: number | string }) =>
    http.post<{ ok: boolean; lab: LabResult }>(
      `/api/patients/${id}/labs`,
      lab
    ),
  // Sửa một dòng cũ tại index; server suy lại đơn vị/khoảng/bất thường, giữ recordedAt.
  updateLab: (id: string, index: number, lab: { name: string; value: number | string }) =>
    http.put<{ ok: boolean; lab: LabResult }>(
      `/api/patients/${id}/labs/${index}`,
      lab
    ),
  removeLab: (id: string, index: number) =>
    http.delete<{ ok: boolean; removedIndex: number }>(
      `/api/patients/${id}/labs/${index}`
    ),
  // Ghi nhận lần khám: chốt trạng thái lâm sàng hiện tại thành bản ghi lịch sử.
  // created:false ⇒ không có thay đổi so với lần khám gần nhất.
  recordExam: (id: string) =>
    http.post<
      | { created: true; record: ExamRecord }
      | { created: false; reason: "no-change" }
    >(`/api/patients/${id}/exam-records`, {}),
};
