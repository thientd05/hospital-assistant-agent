import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  DOCTOR_ID_RE,
  MAX_READ_BYTES,
  MEMORY_FILES,
  WORKSPACES_DIR,
} from "../shared.ts";

export function handleReadMemory(doctorId: string, file: string): string {
  if (!DOCTOR_ID_RE.test(doctorId)) {
    return JSON.stringify({ error: `Mã bác sĩ không hợp lệ: ${doctorId}` });
  }
  if (!file || !MEMORY_FILES.has(file)) {
    return JSON.stringify({
      error:
        "Chỉ được đọc USER.md, SOUL.md hoặc MEMORY.md qua tool này. AGENT.md bị cấm đọc.",
    });
  }
  const path = join(WORKSPACES_DIR, doctorId, file);
  if (!existsSync(path)) {
    return JSON.stringify({
      error: `File ${file} chưa tồn tại trong workspace.`,
    });
  }
  const stat = statSync(path);
  if (!stat.isFile()) {
    return JSON.stringify({ error: `Đường dẫn không phải file: ${path}` });
  }
  if (stat.size > MAX_READ_BYTES) {
    return JSON.stringify({
      error: `File quá lớn: ${stat.size} bytes (giới hạn ${MAX_READ_BYTES}).`,
    });
  }
  const content = readFileSync(path, "utf8");
  return JSON.stringify({
    file,
    path: `workspaces/${doctorId}/${file}`,
    content,
  });
}
