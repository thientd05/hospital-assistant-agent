import { z } from "zod";
import type { WorkspaceKey } from "@pr_hospitalagent/types";

export const ALLOWED_FILES = ["MEMORY.md", "SOUL.md", "USER.md"] as const;
export type AllowedFile = (typeof ALLOWED_FILES)[number];

// Map tên file (hợp đồng REST giữ nguyên cho FE) ↔ field trong Mongo.
export const KEY_BY_FILE: Record<AllowedFile, WorkspaceKey> = {
  "MEMORY.md": "memory",
  "SOUL.md": "soul",
  "USER.md": "user",
};

export const WorkspaceFileParamSchema = z.object({
  file: z.enum(ALLOWED_FILES),
});

export const WorkspaceUpdateSchema = z.object({
  content: z.string().max(200_000),
});

export type WorkspaceUpdate = z.infer<typeof WorkspaceUpdateSchema>;
