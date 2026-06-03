import type { FastifyInstance } from "fastify";
import { verifyAuth, requireRole } from "@pr_hospitalagent/api-shared";
import { parseBody } from "../lib/validate.ts";
import { BadRequestError } from "../lib/errors.ts";
import {
  SkillNameParamSchema,
  SkillCreateSchema,
  SkillUpdateSchema,
} from "../schemas/skill.ts";
import { skillService } from "../services/skill.service.ts";

function parseName(params: unknown): string {
  const parsed = SkillNameParamSchema.safeParse(params);
  if (!parsed.success) throw new BadRequestError("Tên skill không hợp lệ");
  return parsed.data.name;
}

export async function skillsRoutes(app: FastifyInstance) {
  // GET mở cho agent (doctor/patient build skill index + read_skills) lẫn expert (UI).
  app.get(
    "/skills",
    { preHandler: [verifyAuth, requireRole("doctor", "patient", "expert")] },
    async () => ({ skills: await skillService.list() })
  );

  app.get<{ Params: { name: string } }>(
    "/skills/:name",
    { preHandler: [verifyAuth, requireRole("doctor", "patient", "expert")] },
    async (req) => skillService.get(parseName(req.params))
  );

  // Mutations chỉ chuyên gia tác giả.
  app.post(
    "/skills",
    { preHandler: [verifyAuth, requireRole("expert")] },
    async (req) => {
      const { name, content } = parseBody(SkillCreateSchema, req.body);
      return skillService.create(name, content);
    }
  );

  app.put<{ Params: { name: string } }>(
    "/skills/:name",
    { preHandler: [verifyAuth, requireRole("expert")] },
    async (req) => {
      const name = parseName(req.params);
      const { content } = parseBody(SkillUpdateSchema, req.body);
      return skillService.update(name, content);
    }
  );

  app.delete<{ Params: { name: string } }>(
    "/skills/:name",
    { preHandler: [verifyAuth, requireRole("expert")] },
    async (req) => skillService.delete(parseName(req.params))
  );
}
