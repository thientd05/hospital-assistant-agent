import { readFileSync } from "node:fs";
import { join } from "node:path";

export type AuthRole = "doctor" | "manager" | "patient" | "expert";

type RoleAccess = { tools: string[]; skills: string[] };
type AccessConfig = Record<AuthRole, RoleAccess>;

const CONFIG_PATH = join(import.meta.dirname, "config.json");

let cached: AccessConfig | null = null;

function loadConfig(): AccessConfig {
  if (cached) return cached;
  const raw = readFileSync(CONFIG_PATH, "utf8");
  const parsed = JSON.parse(raw) as AccessConfig;
  for (const role of ["doctor", "manager", "patient", "expert"] as const) {
    const block = parsed[role];
    if (!block || !Array.isArray(block.tools) || !Array.isArray(block.skills)) {
      throw new Error(
        `config.json: thiếu hoặc sai khối "${role}" — cần { tools: string[], skills: string[] }.`
      );
    }
  }
  cached = parsed;
  return cached;
}

export function getAllowedTools(role: AuthRole): Set<string> {
  return new Set(loadConfig()[role].tools);
}

export function getAllowedSkills(role: AuthRole): string[] {
  return loadConfig()[role].skills;
}
