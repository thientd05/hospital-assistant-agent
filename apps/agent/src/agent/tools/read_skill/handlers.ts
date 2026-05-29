import { getAllowedSkills, type AuthRole } from "../../access.ts";
import { fetchSkill } from "../../api-client.ts";

const NAME_RE = /^[A-Za-z0-9_-]+$/;

export async function handleReadSkill(
  input: Record<string, unknown>,
  role: AuthRole,
  token: string
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
  // Body skill lưu ở Mongo, đọc qua REST backend (agent không chạm Mongo/FS).
  const skill = await fetchSkill(token, name);
  if (!skill) {
    return JSON.stringify({ error: `Không tìm thấy skill: ${name}` });
  }
  return JSON.stringify({ name, content: skill.content });
}
