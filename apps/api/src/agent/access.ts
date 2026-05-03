import { readFileSync } from "node:fs";
import { join } from "node:path";

export type AuthRole = "doctor" | "manager" | "patient";

type RoleAccess = { tools: string[]; skills: string[] };
type AccessConfig = Record<AuthRole, RoleAccess>;

const CONFIG_PATH = join(import.meta.dirname, "config.json");

let cached: AccessConfig | null = null;

function loadConfig(): AccessConfig {
  if (cached) return cached;
  const raw = readFileSync(CONFIG_PATH, "utf8");
  const parsed = JSON.parse(raw) as AccessConfig;
  if (!parsed.doctor || !parsed.manager || !parsed.patient) {
    throw new Error(
      "config.json phải có khối 'doctor', 'manager' và 'patient' (mỗi khối gồm 'tools' và 'skills')."
    );
  }
  cached = parsed;
  return cached;
}

export function getAllowedTools(role: AuthRole): Set<string> {
  return new Set(loadConfig()[role].tools);
}

export function getAllowedSkills(role: AuthRole): Set<string> {
  return new Set(loadConfig()[role].skills);
}
