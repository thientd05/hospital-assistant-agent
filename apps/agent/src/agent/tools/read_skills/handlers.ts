import { getAllowedSkills, type AuthRole } from "../../access.ts";
import { fetchSkill } from "../../api-client.ts";

const NAME_RE = /^[A-Za-z0-9_-]+$/;

type SkillResult = { name: string; content: string } | { name: string; error: string };

// Đọc body một skill (kèm validate tên + allowlist). Lỗi trả về dạng { name, error }
// để KHÔNG chặn các skill khác trong cùng yêu cầu (partial success).
async function readOne(
  name: string,
  role: AuthRole,
  token: string
): Promise<SkillResult> {
  if (!NAME_RE.test(name)) {
    return { name, error: `Tên skill không hợp lệ: ${name}` };
  }
  if (!getAllowedSkills(role).includes(name)) {
    return { name, error: `Skill "${name}" không khả dụng cho vai trò "${role}".` };
  }
  // Body skill lưu ở Mongo, đọc qua REST backend (agent không chạm Mongo/FS).
  const skill = await fetchSkill(token, name);
  if (!skill) {
    return { name, error: `Không tìm thấy skill: ${name}` };
  }
  return { name, content: skill.content };
}

export async function handleReadSkills(
  input: Record<string, unknown>,
  role: AuthRole,
  token: string
): Promise<string> {
  const names = Array.isArray(input.names)
    ? input.names.filter((n): n is string => typeof n === "string")
    : [];
  if (names.length === 0) {
    return JSON.stringify({ error: "Thiếu tham số `names` (mảng tên skill)." });
  }
  // Đọc song song; loại trùng tên để khỏi đọc lại.
  const unique = [...new Set(names)];
  const skills = await Promise.all(unique.map((n) => readOne(n, role, token)));
  return JSON.stringify({ skills });
}
