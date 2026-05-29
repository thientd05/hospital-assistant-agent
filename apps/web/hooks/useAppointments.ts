"use client";

import type {
  Appointment,
  AppointmentUpdateInput,
  PatientAppointmentCreateInput,
} from "@pr_hospitalagent/types";
import { http } from "@/lib/apiClient";
import { useResource } from "./useResource";

export type AppointmentRow = Appointment & {
  patientName: string | null;
};

export function useAppointments(version: number, enabled = true) {
  return useResource<AppointmentRow[]>(
    "/api/appointments",
    () => http.get("/api/appointments"),
    [version],
    enabled
  );
}

export const appointmentsApi = {
  // Bệnh nhân tự đặt lịch (không truyền patientId; doctorId rỗng = hàng chờ chung).
  createAsPatient: (body: PatientAppointmentCreateInput) =>
    http.post<Appointment>("/api/appointments", body),
  update: (id: string, body: AppointmentUpdateInput) =>
    http.patch<Appointment>(`/api/appointments/${id}`, body),
  // Bác sĩ duyệt/nhận lịch (gồm cả hàng chờ chung).
  accept: (id: string) =>
    http.post<Appointment>(`/api/appointments/${id}/accept`),
  remove: (id: string) =>
    http.delete<{ ok: boolean; deleted: string }>(`/api/appointments/${id}`),
};
