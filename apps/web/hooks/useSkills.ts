"use client";

import { http } from "@/lib/apiClient";
import { useResource } from "./useResource";

export type SkillListItem = { name: string; description: string };

export function useSkills(version: number, enabled = true) {
  return useResource<{ skills: SkillListItem[] }>(
    "/api/skills",
    () => http.get("/api/skills"),
    [version],
    enabled
  );
}

export type SkillDetail = {
  skill: string;
  path: string;
  content: string;
};

export function useSkill(
  name: string | null,
  version: number,
  enabled = true
) {
  return useResource<SkillDetail>(
    name ? `/api/skills/${name}` : null,
    async () => {
      if (!name) throw new Error("Chưa chọn skill");
      return http.get<SkillDetail>(`/api/skills/${name}`);
    },
    [name, version],
    enabled && Boolean(name)
  );
}

export const skillsApi = {
  create: (name: string, content: string) =>
    http.post<SkillDetail>("/api/skills", { name, content }),
  update: (name: string, content: string) =>
    http.put<SkillDetail>(`/api/skills/${name}`, { content }),
  remove: (name: string) =>
    http.delete<{ ok: boolean; deleted: string }>(`/api/skills/${name}`),
};
