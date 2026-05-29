import type { FastifyInstance } from "fastify";
import { verifyAuth, requireRole } from "@pr_hospitalagent/api-shared";
import { parseBody } from "../lib/validate.ts";
import { BadRequestError } from "../lib/errors.ts";
import {
  BootRoleParamSchema,
  BootUpdateSchema,
} from "../schemas/boot.ts";
import { bootService } from "../services/boot.service.ts";
import type { BootRole } from "@pr_hospitalagent/types";

function parseRole(params: unknown): BootRole {
  const parsed = BootRoleParamSchema.safeParse(params);
  if (!parsed.success) throw new BadRequestError("Vai trò boot không hợp lệ");
  return parsed.data.role;
}

export async function bootsRoutes(app: FastifyInstance) {
  // Nội bộ — agent build system prompt (doctor/patient); expert đọc để sửa.
  app.get<{ Params: { role: string } }>(
    "/boots/:role",
    { preHandler: [verifyAuth, requireRole("doctor", "patient", "expert")] },
    async (req) => bootService.get(parseRole(req.params))
  );

  // Chỉ chuyên gia tác giả mới sửa prompt gốc của agent.
  app.put<{ Params: { role: string } }>(
    "/boots/:role",
    { preHandler: [verifyAuth, requireRole("expert")] },
    async (req) => {
      const role = parseRole(req.params);
      const { content } = parseBody(BootUpdateSchema, req.body);
      return bootService.set(role, content);
    }
  );
}
