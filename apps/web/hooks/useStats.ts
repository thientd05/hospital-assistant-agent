"use client";

import type { FinancialStatsData } from "@pr_hospitalagent/types";
import { http } from "@/lib/apiClient";
import { useResource } from "./useResource";

export type CustomerStatsData = {
  patients: {
    total: number;
    byGender: Record<string, number>;
    byAgeGroup: Record<"0-17" | "18-39" | "40-59" | "60+", number>;
    byWard: { ward: string; count: number }[];
    topDiagnoses: { diagnosis: string; count: number }[];
    withAbnormalLab: number;
  };
  appointments: {
    total: number;
    byStatus: Record<string, number>;
    byDoctor: { doctorId: string; doctorName: string | null; count: number }[];
  };
};

export function useCustomerStats(version: number, enabled = true) {
  return useResource<CustomerStatsData>(
    () => http.get("/api/stats/customers"),
    [version],
    enabled
  );
}

export function useFinancialStats(version: number, enabled = true) {
  return useResource<FinancialStatsData>(
    () => http.get("/api/stats/financial"),
    [version],
    enabled
  );
}
