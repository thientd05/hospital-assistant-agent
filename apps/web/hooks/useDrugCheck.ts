"use client";

import { http } from "@/lib/apiClient";

export type DrugCheckResponse = {
  drugs: string[];
  hasInteraction: boolean;
  message: string;
  interactions: string[];
};

export const drugCheckApi = {
  check: (drugs: string[]) =>
    http.post<DrugCheckResponse>("/api/drug-check", { drugs }),
};
