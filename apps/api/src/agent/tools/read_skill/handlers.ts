import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { MAX_READ_BYTES, SKILLS_DIR, SKILL_NAME_RE } from "../shared.ts";

export function handleReadSkill(name: string): string {
  if (!name || typeof name !== "string" || !SKILL_NAME_RE.test(name)) {
    return JSON.stringify({ error: `Tên kỹ năng không hợp lệ: ${name}` });
  }
  const path = join(SKILLS_DIR, name, "SKILL.md");
  if (!existsSync(path)) {
    return JSON.stringify({ error: `Không tìm thấy kỹ năng: ${name}` });
  }
  const stat = statSync(path);
  if (!stat.isFile()) {
    return JSON.stringify({ error: `Đường dẫn không phải file: ${path}` });
  }
  if (stat.size > MAX_READ_BYTES) {
    return JSON.stringify({
      error: `File quá lớn: ${stat.size} bytes (giới hạn ${MAX_READ_BYTES}).`,
    });
  }
  const content = readFileSync(path, "utf8");
  return JSON.stringify({
    skill: name,
    path: `skills/${name}/SKILL.md`,
    content,
  });
}
