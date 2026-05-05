import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SKILLS_DIR, SKILL_NAME_RE } from "../shared.ts";

export function handleWriteSkill(name: string, content: string): string {
  if (!name || typeof name !== "string" || !SKILL_NAME_RE.test(name)) {
    return JSON.stringify({ error: `Tên skill không hợp lệ: ${name}` });
  }
  if (!content || typeof content !== "string" || !content.trim()) {
    return JSON.stringify({ error: "Nội dung skill không được để trống." });
  }
  const dir = join(SKILLS_DIR, name);
  mkdirSync(dir, { recursive: true });
  const text = content.endsWith("\n") ? content : content + "\n";
  writeFileSync(join(dir, "SKILL.md"), text, "utf8");
  return JSON.stringify({
    ok: true,
    skill: name,
    path: `skills/${name}/SKILL.md`,
    message: `Đã lưu skill "${name}". Skill sẽ khả dụng trong thư viện từ cuộc trò chuyện tiếp theo.`,
  });
}
