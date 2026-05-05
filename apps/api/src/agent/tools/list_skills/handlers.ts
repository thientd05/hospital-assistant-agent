import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { SKILLS_DIR } from "../shared.ts";

export function handleListSkills(): string {
  if (!existsSync(SKILLS_DIR)) {
    return JSON.stringify({ skills: [] });
  }
  const skills: { name: string; description: string }[] = [];
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
    skills.push({ name: entry.name, description });
  }
  return JSON.stringify({ skills });
}
