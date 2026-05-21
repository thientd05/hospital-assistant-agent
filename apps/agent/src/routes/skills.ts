import type { FastifyInstance } from "fastify";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { requireRole, verifyToken } from "../auth/verify-token.ts";

const NAME_RE = /^[A-Za-z0-9_-]+$/;
const MAX_READ_BYTES = 200_000;
const SKILLS_DIR = join(import.meta.dirname, "..", "agent", "skills");

const CreateSchema = z.object({
  name: z.string().regex(NAME_RE),
  content: z.string().min(1),
});

const UpdateSchema = z.object({
  content: z.string().min(1),
});

type SkillSummary = { name: string; description: string };

function listSkills(): SkillSummary[] {
  if (!existsSync(SKILLS_DIR)) return [];
  const out: SkillSummary[] = [];
  for (const entry of readdirSync(SKILLS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillPath = join(SKILLS_DIR, entry.name, "SKILL.md");
    if (!existsSync(skillPath)) continue;
    const content = readFileSync(skillPath, "utf8");
    const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    let description = "(không có mô tả)";
    if (m) {
      for (const line of m[1]!.split(/\r?\n/)) {
        const idx = line.indexOf(":");
        if (idx > 0 && line.slice(0, idx).trim() === "description") {
          description = line.slice(idx + 1).trim();
          break;
        }
      }
    }
    out.push({ name: entry.name, description });
  }
  return out;
}

function readSkill(
  name: string
): { skill: string; path: string; content: string } | { error: string } {
  if (!NAME_RE.test(name)) return { error: `Tên skill không hợp lệ: ${name}` };
  const path = join(SKILLS_DIR, name, "SKILL.md");
  if (!existsSync(path)) return { error: `Không tìm thấy skill: ${name}` };
  const stat = statSync(path);
  if (!stat.isFile()) return { error: `Đường dẫn không phải file: ${path}` };
  if (stat.size > MAX_READ_BYTES) {
    return {
      error: `File quá lớn: ${stat.size} bytes (giới hạn ${MAX_READ_BYTES}).`,
    };
  }
  return {
    skill: name,
    path: `skills/${name}/SKILL.md`,
    content: readFileSync(path, "utf8"),
  };
}

function writeSkill(
  name: string,
  content: string
): { skill: string; path: string; content: string } | { error: string } {
  if (!NAME_RE.test(name)) return { error: `Tên skill không hợp lệ: ${name}` };
  if (!content.trim()) return { error: "Nội dung skill không được để trống." };
  const dir = join(SKILLS_DIR, name);
  mkdirSync(dir, { recursive: true });
  const text = content.endsWith("\n") ? content : content + "\n";
  writeFileSync(join(dir, "SKILL.md"), text, "utf8");
  return readSkill(name);
}

export async function skillsRoutes(app: FastifyInstance) {
  app.get(
    "/skills",
    { preHandler: [verifyToken, requireRole("expert")] },
    async () => ({ skills: listSkills() })
  );

  app.get<{ Params: { name: string } }>(
    "/skills/:name",
    { preHandler: [verifyToken, requireRole("expert")] },
    async (req, reply) => {
      const result = readSkill(req.params.name);
      if ("error" in result) {
        reply.code(404).send(result);
        return;
      }
      return result;
    }
  );

  app.post(
    "/skills",
    { preHandler: [verifyToken, requireRole("expert")] },
    async (req, reply) => {
      const parsed = CreateSchema.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({ error: "Invalid body", details: parsed.error });
        return;
      }
      const result = writeSkill(parsed.data.name, parsed.data.content);
      if ("error" in result) {
        reply.code(400).send(result);
        return;
      }
      return result;
    }
  );

  app.put<{ Params: { name: string } }>(
    "/skills/:name",
    { preHandler: [verifyToken, requireRole("expert")] },
    async (req, reply) => {
      const parsed = UpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({ error: "Invalid body", details: parsed.error });
        return;
      }
      if (!NAME_RE.test(req.params.name)) {
        reply.code(400).send({ error: "Tên skill không hợp lệ" });
        return;
      }
      const result = writeSkill(req.params.name, parsed.data.content);
      if ("error" in result) {
        reply.code(400).send(result);
        return;
      }
      return result;
    }
  );

  app.delete<{ Params: { name: string } }>(
    "/skills/:name",
    { preHandler: [verifyToken, requireRole("expert")] },
    async (req, reply) => {
      const name = req.params.name;
      if (!NAME_RE.test(name)) {
        reply.code(400).send({ error: `Tên skill không hợp lệ: ${name}` });
        return;
      }
      const dir = join(SKILLS_DIR, name);
      if (!existsSync(dir)) {
        reply.code(404).send({ error: `Không tìm thấy skill: ${name}` });
        return;
      }
      if (!statSync(dir).isDirectory()) {
        reply.code(400).send({ error: `Đường dẫn không phải thư mục: ${dir}` });
        return;
      }
      rmSync(dir, { recursive: true, force: true });
      return {
        ok: true,
        deleted: name,
        skills: listSkills(),
        message: `Đã xoá skill "${name}".`,
      };
    }
  );
}
