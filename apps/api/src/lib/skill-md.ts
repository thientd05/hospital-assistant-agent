// Helper cho skill markdown (SKILL.md). Nội dung skill lưu ở Mongo; description
// suy ra từ frontmatter `--- ... ---` khi đọc (giữ nguyên hành vi cũ của agent).
export const NAME_RE = /^[A-Za-z0-9_-]+$/;
export const MAX_SKILL_BYTES = 200_000;

// Parse khối frontmatter YAML-ish của SKILL.md. Trả null khi không có khối `--- ... ---`;
// ngược lại trả các field name/description có mặt.
export function parseSkillFrontmatter(
  content: string
): { name?: string; description?: string } | null {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const result: { name?: string; description?: string } = {};
  for (const line of m[1]!.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      if (key === "description") result.description = value;
      else if (key === "name") result.name = value;
    }
  }
  return result;
}

export function skillDescription(content: string): string {
  return parseSkillFrontmatter(content)?.description ?? "(không có mô tả)";
}
