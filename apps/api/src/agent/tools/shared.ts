import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import type { Vital } from "@pr_hospitalagent/types";

const TOOLS_DIR = import.meta.dirname;
export const AGENT_ROOT = resolve(TOOLS_DIR, "..");
export const SKILLS_DIR = join(AGENT_ROOT, "skills");
export const WORKSPACES_DIR = join(AGENT_ROOT, "workspaces");

export const DOCTOR_ID_RE = /^[A-Za-z0-9_-]+$/;
export const SKILL_NAME_RE = /^[A-Za-z0-9_-]+$/;
export const PATIENT_ID_RE = /^BN\d+$/i;
export const MEMORY_FILES = new Set(["USER.md", "SOUL.md", "MEMORY.md"]);
export const MAX_READ_BYTES = 200_000;

export const VITAL_DEFAULTS: Vital = {
  spO2: 0,
  heartRate: 0,
  bloodPressure: "",
  temperature: 0,
  recordedAt: new Date(0),
};

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export function asNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

export function asGender(v: unknown): "Nam" | "Nữ" | undefined {
  return v === "Nam" || v === "Nữ" ? v : undefined;
}

export function asStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const arr = v.filter((x): x is string => typeof x === "string");
  return arr.length === v.length ? arr : undefined;
}

export function writeWorkspaceFile(
  doctorId: string,
  name: string,
  content: string
): string {
  if (!DOCTOR_ID_RE.test(doctorId)) {
    return JSON.stringify({ error: `Mã bác sĩ không hợp lệ: ${doctorId}` });
  }
  const dir = join(WORKSPACES_DIR, doctorId);
  mkdirSync(dir, { recursive: true });
  const text = content.endsWith("\n") ? content : content + "\n";
  writeFileSync(join(dir, name), text, "utf8");
  return JSON.stringify({
    ok: true,
    file: `workspaces/${doctorId}/${name}`,
    message: `Đã cập nhật ${name}. Nội dung mới sẽ áp dụng từ tin nhắn tiếp theo.`,
  });
}

export function buildVitalsPartial(raw: unknown): Partial<Vital> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const v = raw as Record<string, unknown>;
  const out: Partial<Vital> = {};
  if (asNumber(v.spO2) !== undefined) out.spO2 = v.spO2 as number;
  if (asNumber(v.heartRate) !== undefined)
    out.heartRate = v.heartRate as number;
  if (asString(v.bloodPressure) !== undefined)
    out.bloodPressure = v.bloodPressure as string;
  if (asNumber(v.temperature) !== undefined)
    out.temperature = v.temperature as number;
  return Object.keys(out).length > 0 ? out : undefined;
}
