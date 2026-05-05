import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DOCTOR_ID_RE, WORKSPACES_DIR } from "../shared.ts";

export function handleUpdateMemory(doctorId: string, entry: string): string {
  if (!DOCTOR_ID_RE.test(doctorId)) {
    return JSON.stringify({ error: `Mã bác sĩ không hợp lệ: ${doctorId}` });
  }
  const trimmed = typeof entry === "string" ? entry.trim() : "";
  if (!trimmed) {
    return JSON.stringify({ error: "Nội dung mục kinh nghiệm rỗng." });
  }
  const dir = join(WORKSPACES_DIR, doctorId);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "MEMORY.md");
  const existing = existsSync(path) ? readFileSync(path, "utf8") : "";
  const base = existing.replace(/\s+$/, "");
  const next = base ? `${base}\n\n${trimmed}\n` : `${trimmed}\n`;
  writeFileSync(path, next, "utf8");
  return JSON.stringify({
    ok: true,
    file: `workspaces/${doctorId}/MEMORY.md`,
    appendedChars: trimmed.length,
    message: "Đã ghi thêm vào MEMORY.md.",
  });
}
