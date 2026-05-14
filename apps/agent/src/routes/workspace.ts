import type { FastifyInstance, FastifyRequest } from "fastify";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { requireRole, verifyAuth } from "@pr_hospitalagent/api-shared";
import { ensureAgentWorkspace } from "../middleware/ensure-workspace.ts";

const ALLOWED_FILES = ["MEMORY.md", "SOUL.md", "USER.md"] as const;
type AllowedFile = (typeof ALLOWED_FILES)[number];

const FileParamSchema = z.object({
  file: z.enum(ALLOWED_FILES),
});

const UpdateBodySchema = z.object({
  content: z.string().max(200_000),
});

const WORKSPACES_DIR = join(
  import.meta.dirname,
  "..",
  "agent",
  "workspaces"
);

const ID_RE = /^[A-Za-z0-9_-]+$/;
const MAX_READ_BYTES = 200_000;

function ownerId(req: FastifyRequest): string | null {
  return req.doctor?.id ?? req.patient?.id ?? null;
}

function resolveWorkspaceFile(
  id: string,
  file: AllowedFile
): { path: string } | { error: string } {
  if (!ID_RE.test(id)) return { error: `Mã không hợp lệ: ${id}` };
  const path = join(WORKSPACES_DIR, id, file);
  return { path };
}

export async function workspaceRoutes(app: FastifyInstance) {
  app.get<{ Params: { file: string } }>(
    "/workspace/files/:file",
    {
      preHandler: [
        verifyAuth,
        ensureAgentWorkspace,
        requireRole("doctor", "patient"),
      ],
    },
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
      const resolved = resolveWorkspaceFile(id, parsed.data.file);
      if ("error" in resolved) {
        reply.code(400).send(resolved);
        return;
      }
      if (!existsSync(resolved.path)) {
        return { file: parsed.data.file, content: "" };
      }
      const stat = statSync(resolved.path);
      if (!stat.isFile()) {
        reply.code(400).send({ error: "Đường dẫn không phải file" });
        return;
      }
      if (stat.size > MAX_READ_BYTES) {
        reply.code(413).send({
          error: `File quá lớn: ${stat.size} bytes (giới hạn ${MAX_READ_BYTES}).`,
        });
        return;
      }
      return {
        file: parsed.data.file,
        content: readFileSync(resolved.path, "utf8"),
      };
    }
  );

  app.put<{ Params: { file: string } }>(
    "/workspace/files/:file",
    {
      preHandler: [
        verifyAuth,
        ensureAgentWorkspace,
        requireRole("doctor", "patient"),
      ],
    },
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
      const resolved = resolveWorkspaceFile(id, paramsParsed.data.file);
      if ("error" in resolved) {
        reply.code(400).send(resolved);
        return;
      }
      const text = bodyParsed.data.content.endsWith("\n")
        ? bodyParsed.data.content
        : bodyParsed.data.content + "\n";
      writeFileSync(resolved.path, text, "utf8");
      return {
        file: paramsParsed.data.file,
        content: readFileSync(resolved.path, "utf8"),
      };
    }
  );
}
