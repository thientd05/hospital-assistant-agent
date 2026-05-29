"use client";

import type {
  Payroll,
  PayrollCreateInput,
  PayrollUpdateInput,
} from "@pr_hospitalagent/types";
import { http } from "@/lib/apiClient";
import { useResource } from "./useResource";

export function usePayroll(version: number, enabled = true) {
  return useResource<{ count: number; payroll: Payroll[] }>(
    "/api/payroll",
    () => http.get("/api/payroll"),
    [version],
    enabled
  );
}

export function usePayrollEntry(
  id: string | null,
  version: number,
  enabled = true
) {
  return useResource<Payroll>(
    id ? `/api/payroll/${id}` : null,
    async () => {
      if (!id) throw new Error("Chưa chọn bản lương");
      return http.get<Payroll>(`/api/payroll/${id}`);
    },
    [id, version],
    enabled && Boolean(id)
  );
}

export const payrollApi = {
  create: (body: PayrollCreateInput) =>
    http.post<Payroll>("/api/payroll", body),
  update: (id: string, body: PayrollUpdateInput) =>
    http.patch<Payroll>(`/api/payroll/${id}`, body),
  remove: (id: string) =>
    http.delete<{ ok: boolean; deleted: string }>(`/api/payroll/${id}`),
};
