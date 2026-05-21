import type { WorkspaceKey } from "@pr_hospitalagent/types";
import { writeWorkspaceFile } from "../../api-client.ts";

const MAX_BYTES = 200_000;

const FILE_NAME: Record<WorkspaceKey, string> = {
  memory: "MEMORY.md",
  soul: "SOUL.md",
  user: "USER.md",
};

export async function handleUpdateWorkspaceFile(
  input: Record<string, unknown>,
  token: string
): Promise<string> {
  const fileKey = typeof input.file === "string" ? input.file : "";
  if (!(fileKey in FILE_NAME)) {
    return JSON.stringify({
      error: `Loại file không hợp lệ: "${fileKey}". Chỉ chấp nhận: memory, soul, user.`,
    });
  }
  const key = fileKey as WorkspaceKey;
  if (typeof input.content !== "string") {
    return JSON.stringify({ error: "Thiếu hoặc sai tham số `content`." });
  }
  if (Buffer.byteLength(input.content, "utf8") > MAX_BYTES) {
    return JSON.stringify({
      error: `Nội dung quá lớn (giới hạn ${MAX_BYTES} bytes).`,
    });
  }

  try {
    await writeWorkspaceFile(token, FILE_NAME[key], input.content);
  } catch (err) {
    return JSON.stringify({
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return JSON.stringify({ file: FILE_NAME[key], content: input.content });
}
