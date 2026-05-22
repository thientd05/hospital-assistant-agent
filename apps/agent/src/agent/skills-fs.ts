import { join } from "node:path";

// Shared filesystem constants/helpers for skill files. Skills live at
// `apps/agent/src/agent/skills/<name>/SKILL.md`; this module is in `agent/`,
// so its dirname is the canonical anchor for SKILLS_DIR.
export const SKILLS_DIR = join(import.meta.dirname, "skills");
export const NAME_RE = /^[A-Za-z0-9_-]+$/;
export const MAX_SKILL_BYTES = 200_000;

// Parse the YAML-ish frontmatter block of a SKILL.md. Returns null when there
// is no `--- ... ---` block; otherwise returns whichever of name/description
// were present.
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
