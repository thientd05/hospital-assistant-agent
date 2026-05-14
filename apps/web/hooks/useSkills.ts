"use client";

import { httpAgent } from "@/lib/apiClient";
import { useResource } from "./useResource";

export type SkillListItem = { name: string; description: string };

export function useSkills(version: number, enabled = true) {
  return useResource<{ skills: SkillListItem[] }>(
    () => httpAgent.get("/api/skills"),
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
    async () => {
      if (!name) throw new Error("Chưa chọn skill");
      return httpAgent.get<SkillDetail>(`/api/skills/${name}`);
    },
    [name, version],
    enabled && Boolean(name)
  );
}

export const skillsApi = {
  create: (name: string, content: string) =>
    httpAgent.post<SkillDetail>("/api/skills", { name, content }),
  update: (name: string, content: string) =>
    httpAgent.put<SkillDetail>(`/api/skills/${name}`, { content }),
  remove: (name: string) =>
    httpAgent.delete<{ ok: boolean; deleted: string }>(`/api/skills/${name}`),
};
