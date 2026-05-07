import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type AuthRole = "doctor" | "manager" | "patient" | "expert";

type SkillsAccess = string[] | "all";
type RoleAccess = { tools: string[]; skills: SkillsAccess };
type AccessConfig = Record<AuthRole, RoleAccess>;

const CONFIG_PATH = join(import.meta.dirname, "config.json");
const SKILLS_DIR = join(import.meta.dirname, "skills");

let cached: AccessConfig | null = null;

function loadConfig(): AccessConfig {
  if (cached) return cached;
  const raw = readFileSync(CONFIG_PATH, "utf8");
  const parsed = JSON.parse(raw) as AccessConfig;
  if (!parsed.doctor || !parsed.manager || !parsed.patient || !parsed.expert) {
    throw new Error(
      "config.json phải có khối 'doctor', 'manager', 'patient' và 'expert' (mỗi khối gồm 'tools' và 'skills')."
    );
  }
  cached = parsed;
  return cached;
}

function listAllSkills(): string[] {
  if (!existsSync(SKILLS_DIR)) return [];
  return readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

export function getAllowedTools(role: AuthRole): Set<string> {
  return new Set(loadConfig()[role].tools);
}

export function getAllowedSkills(role: AuthRole): Set<string> {
  const skills = loadConfig()[role].skills;
  if (skills === "all") return new Set(listAllSkills());
  return new Set(skills);
}
