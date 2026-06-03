"use client";

import { http } from "@/lib/apiClient";
import type { DrugCatalogItem } from "@pr_hospitalagent/types";

export type { DrugCatalogItem };

export type DrugCheckResponse = {
  drugs: string[];
  hasInteraction: boolean;
  message: string;
  interactions: string[];
};

export const drugCheckApi = {
  catalog: () => http.get<DrugCatalogItem[]>("/api/drug-check/drugs"),
  check: (drugs: string[]) =>
    http.post<DrugCheckResponse>("/api/drug-check", { drugs }),
};
