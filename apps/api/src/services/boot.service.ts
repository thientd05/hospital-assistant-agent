import type { BootRole } from "@pr_hospitalagent/types";
import { bootRepo } from "../repositories/boot.repo.ts";

export const bootService = {
  async get(role: BootRole): Promise<{ role: BootRole; content: string }> {
    return { role, content: await bootRepo.getContent(role) };
  },

  async set(
    role: BootRole,
    content: string
  ): Promise<{ role: BootRole; content: string }> {
    await bootRepo.setContent(role, content);
    return { role, content };
  },
};
