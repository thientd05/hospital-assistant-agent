import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { getAllowedSkills, type AuthRole } from "../../access.ts";

const SKILLS_DIR = join(import.meta.dirname, "..", "..", "skills");
const NAME_RE = /^[A-Za-z0-9_-]+$/;
const MAX_BYTES = 200_000;

export async function handleReadSkill(
  input: Record<string, unknown>,
  role: AuthRole
): Promise<string> {
  const name = typeof input.name === "string" ? input.name : "";
  if (!name) {
    return JSON.stringify({ error: "Thiếu tham số `name`." });
  }
  if (!NAME_RE.test(name)) {
    return JSON.stringify({ error: `Tên skill không hợp lệ: ${name}` });
  }
  if (!getAllowedSkills(role).includes(name)) {
    return JSON.stringify({
      error: `Skill "${name}" không khả dụng cho vai trò "${role}".`,
    });
  }
  const path = join(SKILLS_DIR, name, "SKILL.md");
  if (!existsSync(path)) {
    return JSON.stringify({ error: `Không tìm thấy skill: ${name}` });
  }
  const stat = statSync(path);
  if (!stat.isFile()) {
    return JSON.stringify({ error: `Đường dẫn không phải file: ${path}` });
  }
  if (stat.size > MAX_BYTES) {
    return JSON.stringify({
      error: `File skill "${name}" quá lớn: ${stat.size} bytes (giới hạn ${MAX_BYTES}).`,
    });
  }
  const content = readFileSync(path, "utf8");
  return JSON.stringify({ name, content });
}
