import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const AGENT_DIR = resolve(import.meta.dirname);
const WORKSPACES_DIR = join(AGENT_DIR, "workspaces");
const REQUIRED_FILES = ["USER.md", "SOUL.md", "MEMORY.md"] as const;
const ID_RE = /^[A-Za-z0-9_-]+$/;

export type EnsureWorkspaceResult = {
  id: string;
  createdDir: boolean;
  createdFiles: string[];
  alreadyComplete: boolean;
};

function ensureWorkspace(id: string): EnsureWorkspaceResult {
  if (!ID_RE.test(id)) {
    throw new Error(`Mã không hợp lệ: ${id}`);
  }
  const dir = join(WORKSPACES_DIR, id);
  let createdDir = false;
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    createdDir = true;
  }
  const createdFiles: string[] = [];
  for (const file of REQUIRED_FILES) {
    const path = join(dir, file);
    if (!existsSync(path)) {
      writeFileSync(path, "", "utf8");
      createdFiles.push(file);
    }
  }
  return {
    id,
    createdDir,
    createdFiles,
    alreadyComplete: !createdDir && createdFiles.length === 0,
  };
}

export function ensureDoctorWorkspace(doctorId: string): EnsureWorkspaceResult {
  return ensureWorkspace(doctorId);
}

export function ensurePatientWorkspace(
  patientId: string
): EnsureWorkspaceResult {
  return ensureWorkspace(patientId);
}
