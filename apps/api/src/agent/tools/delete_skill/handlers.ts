import { existsSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { SKILLS_DIR, SKILL_NAME_RE } from "../shared.ts";
import { handleListSkills } from "../list_skills/handlers.ts";

export function handleDeleteSkill(name: string): string {
  if (!name || typeof name !== "string" || !SKILL_NAME_RE.test(name)) {
    return JSON.stringify({ error: `Tên skill không hợp lệ: ${name}` });
  }
  const dir = join(SKILLS_DIR, name);
  if (!existsSync(dir)) {
    return JSON.stringify({ error: `Không tìm thấy skill: ${name}` });
  }
  if (!statSync(dir).isDirectory()) {
    return JSON.stringify({ error: `Đường dẫn không phải thư mục: ${dir}` });
  }
  rmSync(dir, { recursive: true, force: true });

  const listed = JSON.parse(handleListSkills()) as {
    skills: { name: string; description: string }[];
  };
  return JSON.stringify({
    ok: true,
    deleted: name,
    skills: listed.skills,
    message: `Đã xoá skill "${name}". Skill sẽ biến mất khỏi thư viện từ cuộc trò chuyện tiếp theo.`,
  });
}
