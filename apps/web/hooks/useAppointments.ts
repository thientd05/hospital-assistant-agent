"use client";

import type {
  Appointment,
  AppointmentCreateInput,
  AppointmentUpdateInput,
} from "@pr_hospitalagent/types";
import { http } from "@/lib/apiClient";
import { useResource } from "./useResource";

export type AppointmentRow = Appointment & {
  patientName: string | null;
};

export function useAppointments(version: number, enabled = true) {
  return useResource<AppointmentRow[]>(
    () => http.get("/api/appointments"),
    [version],
    enabled
  );
}

export const appointmentsApi = {
  create: (body: AppointmentCreateInput) =>
    http.post<Appointment>("/api/appointments", body),
  update: (id: string, body: AppointmentUpdateInput) =>
    http.patch<Appointment>(`/api/appointments/${id}`, body),
  remove: (id: string) =>
    http.delete<{ ok: boolean; deleted: string }>(`/api/appointments/${id}`),
};
