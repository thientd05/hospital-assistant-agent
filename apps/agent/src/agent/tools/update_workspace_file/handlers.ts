import type { WorkspaceKey } from "@pr_hospitalagent/types";
import { fetchWorkspace, writeWorkspaceFile } from "../../api-client.ts";

const MAX_BYTES = 200_000;

const FILE_NAME: Record<WorkspaceKey, string> = {
  memory: "MEMORY.md",
  soul: "SOUL.md",
  user: "USER.md",
};

type Mode = "overwrite" | "append" | "edit";

function fail(error: string): string {
  return JSON.stringify({ error });
}

export async function handleUpdateWorkspaceFile(
  input: Record<string, unknown>,
  token: string
): Promise<string> {
  const fileKey = typeof input.file === "string" ? input.file : "";
  if (!(fileKey in FILE_NAME)) {
    return fail(
      `Loại file không hợp lệ: "${fileKey}". Chỉ chấp nhận: memory, soul, user.`
    );
  }
  const key = fileKey as WorkspaceKey;
  const name = FILE_NAME[key];
  const mode: Mode =
    input.mode === "append" || input.mode === "edit"
      ? input.mode
      : "overwrite";

  let next: string;

  if (mode === "overwrite") {
    if (typeof input.content !== "string") {
      return fail("Chế độ `overwrite` cần tham số `content` (chuỗi).");
    }
    next = input.content;
  } else if (mode === "append") {
    if (typeof input.content !== "string" || input.content === "") {
      return fail("Chế độ `append` cần `content` không rỗng.");
    }
    const current = (await fetchWorkspace(token))[key] ?? "";
    next =
      current.trim() === ""
        ? input.content
        : `${current.trimEnd()}\n${input.content}`;
  } else {
    // edit — thay đoạn `old_string` (phải khớp chính xác & DUY NHẤT) bằng `new_string`.
    if (typeof input.old_string !== "string" || input.old_string === "") {
      return fail("Chế độ `edit` cần `old_string` không rỗng.");
    }
    if (typeof input.new_string !== "string") {
      return fail("Chế độ `edit` cần `new_string` (chuỗi, có thể rỗng để xoá).");
    }
    const current = (await fetchWorkspace(token))[key] ?? "";
    const occurrences = current.split(input.old_string).length - 1;
    if (occurrences === 0) {
      return fail(
        `Không tìm thấy \`old_string\` trong ${name}. Chép lại CHÍNH XÁC đoạn cần sửa từ nội dung file ở đầu system prompt.`
      );
    }
    if (occurrences > 1) {
      return fail(
        `\`old_string\` xuất hiện ${occurrences} lần trong ${name} — không rõ chỗ nào. Thêm ngữ cảnh để đoạn cần sửa là DUY NHẤT.`
      );
    }
    // split/join thay vì String.replace để tránh diễn giải ký tự đặc biệt ($&, $1…).
    next = current.split(input.old_string).join(input.new_string);
  }

  if (Buffer.byteLength(next, "utf8") > MAX_BYTES) {
    return fail(`Nội dung quá lớn (giới hạn ${MAX_BYTES} bytes).`);
  }

  try {
    await writeWorkspaceFile(token, name, next);
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }

  return JSON.stringify({ file: name, mode, content: next });
}
