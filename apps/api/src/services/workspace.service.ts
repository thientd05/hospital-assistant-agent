import type { WorkspaceKey } from "@pr_hospitalagent/types";
import { workspaceRepo } from "../repositories/workspace.repo.ts";

export const workspaceService = {
  async get(ownerId: string) {
    return workspaceRepo.get(ownerId);
  },

  async setField(ownerId: string, key: WorkspaceKey, content: string) {
    await workspaceRepo.setField(ownerId, key, content);
  },
};
