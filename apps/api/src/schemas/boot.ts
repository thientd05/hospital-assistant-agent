import { z } from "zod";

export const BOOT_ROLES = ["doctor", "patient"] as const;

export const BootRoleParamSchema = z.object({
  role: z.enum(BOOT_ROLES),
});

export const BootUpdateSchema = z.object({
  content: z.string().max(200_000),
});

export type BootUpdate = z.infer<typeof BootUpdateSchema>;
