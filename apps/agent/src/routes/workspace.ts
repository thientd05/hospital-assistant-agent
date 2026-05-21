import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireRole, verifyAuth } from "@pr_hospitalagent/api-shared";
import type { WorkspaceKey } from "@pr_hospitalagent/types";
import { getWorkspace, setWorkspaceFile } from "../agent/workspace-store.ts";

const ALLOWED_FILES = ["MEMORY.md", "SOUL.md", "USER.md"] as const;
type AllowedFile = (typeof ALLOWED_FILES)[number];

// Map tên file (hợp đồng REST giữ nguyên cho FE) ↔ field trong Mongo.
const KEY_BY_FILE: Record<AllowedFile, WorkspaceKey> = {
  "MEMORY.md": "memory",
  "SOUL.md": "soul",
  "USER.md": "user",
};

const FileParamSchema = z.object({
  file: z.enum(ALLOWED_FILES),
});

const UpdateBodySchema = z.object({
  content: z.string().max(200_000),
});

function ownerId(req: FastifyRequest): string | null {
  return req.doctor?.id ?? req.patient?.id ?? null;
}

export async function workspaceRoutes(app: FastifyInstance) {
  app.get<{ Params: { file: string } }>(
    "/workspace/files/:file",
    { preHandler: [verifyAuth, requireRole("doctor", "patient")] },
    async (req, reply) => {
      const id = ownerId(req);
      if (!id) {
        reply.code(401).send({ error: "Unauthorized" });
        return;
      }
      const parsed = FileParamSchema.safeParse(req.params);
      if (!parsed.success) {
        reply.code(400).send({ error: "Tên file không hợp lệ" });
        return;
      }
      const ws = await getWorkspace(id);
      const key = KEY_BY_FILE[parsed.data.file];
      return { file: parsed.data.file, content: ws[key] };
    }
  );

  app.put<{ Params: { file: string } }>(
    "/workspace/files/:file",
    { preHandler: [verifyAuth, requireRole("doctor", "patient")] },
    async (req, reply) => {
      const id = ownerId(req);
      if (!id) {
        reply.code(401).send({ error: "Unauthorized" });
        return;
      }
      const paramsParsed = FileParamSchema.safeParse(req.params);
      if (!paramsParsed.success) {
        reply.code(400).send({ error: "Tên file không hợp lệ" });
        return;
      }
      const bodyParsed = UpdateBodySchema.safeParse(req.body);
      if (!bodyParsed.success) {
        reply.code(400).send({
          error: "Nội dung không hợp lệ",
          details: bodyParsed.error,
        });
        return;
      }
      const key = KEY_BY_FILE[paramsParsed.data.file];
      await setWorkspaceFile(id, key, bodyParsed.data.content);
      return { file: paramsParsed.data.file, content: bodyParsed.data.content };
    }
  );
}
