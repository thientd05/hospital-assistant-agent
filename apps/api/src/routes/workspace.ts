import type { FastifyInstance, FastifyRequest } from "fastify";
import { verifyAuth, requireRole } from "@pr_hospitalagent/api-shared";
import { parseBody } from "../lib/validate.ts";
import { BadRequestError, UnauthorizedError } from "../lib/errors.ts";
import {
  KEY_BY_FILE,
  WorkspaceFileParamSchema,
  WorkspaceUpdateSchema,
  type AllowedFile,
} from "../schemas/workspace.ts";
import { workspaceService } from "../services/workspace.service.ts";

function ownerId(req: FastifyRequest): string {
  const id = req.doctor?.id ?? req.patient?.id;
  if (!id) throw new UnauthorizedError();
  return id;
}

function parseFile(params: unknown): AllowedFile {
  const parsed = WorkspaceFileParamSchema.safeParse(params);
  if (!parsed.success) throw new BadRequestError("Tên file không hợp lệ");
  return parsed.data.file;
}

export async function workspaceRoutes(app: FastifyInstance) {
  // Nội bộ — agent build system prompt: trả cả 3 field.
  app.get(
    "/workspace",
    { preHandler: [verifyAuth, requireRole("doctor", "patient")] },
    async (req) => workspaceService.get(ownerId(req))
  );

  app.get<{ Params: { file: string } }>(
    "/workspace/files/:file",
    { preHandler: [verifyAuth, requireRole("doctor", "patient")] },
    async (req) => {
      const file = parseFile(req.params);
      const ws = await workspaceService.get(ownerId(req));
      return { file, content: ws[KEY_BY_FILE[file]] };
    }
  );

  app.put<{ Params: { file: string } }>(
    "/workspace/files/:file",
    { preHandler: [verifyAuth, requireRole("doctor", "patient")] },
    async (req) => {
      const file = parseFile(req.params);
      const { content } = parseBody(WorkspaceUpdateSchema, req.body);
      await workspaceService.setField(ownerId(req), KEY_BY_FILE[file], content);
      return { file, content };
    }
  );
}
