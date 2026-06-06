"use client";

import type { ExamRecord } from "@pr_hospitalagent/types";
import { http } from "@/lib/apiClient";
import { useResource } from "./useResource";

export type ExamHistoryResponse = {
  patientId: string;
  count: number;
  records: ExamRecord[];
};

// Lịch sử khám của 1 bệnh nhân (bác sĩ — read-only). null id → bỏ qua.
export function useExamHistory(
  patientId: string | null,
  version: number,
  enabled = true
) {
  return useResource<ExamHistoryResponse>(
    patientId ? `/api/patients/${patientId}/exam-history` : null,
    async () => {
      if (!patientId) throw new Error("Chưa chọn bệnh nhân");
      return http.get<ExamHistoryResponse>(
        `/api/patients/${patientId}/exam-history`
      );
    },
    [patientId, version],
    enabled && Boolean(patientId)
  );
}
