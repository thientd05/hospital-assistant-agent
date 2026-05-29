import { z } from "zod";
import { NAME_RE } from "../lib/skill-md.ts";

export const SkillNameParamSchema = z.object({
  name: z.string().regex(NAME_RE),
});

export const SkillCreateSchema = z.object({
  name: z.string().regex(NAME_RE),
  content: z.string().min(1).max(200_000),
});

export const SkillUpdateSchema = z.object({
  content: z.string().min(1).max(200_000),
});

export type SkillCreate = z.infer<typeof SkillCreateSchema>;
export type SkillUpdate = z.infer<typeof SkillUpdateSchema>;
