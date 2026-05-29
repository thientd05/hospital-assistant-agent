// HTTP client gọi REST backend (apps/api). Agent KHÔNG chạm Mongo trực tiếp —
// mọi persistence (workspace, conversations) đi qua đây, forward JWT của user.

const API_URL = process.env.API_URL ?? "http://localhost:3001";

type StoredMessage = { role: "user" | "assistant"; content: unknown };

async function call<T>(
  token: string,
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  let body: string | undefined;
  if (init.body !== undefined) {
    body = JSON.stringify(init.body);
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${API_URL}${path}`, {
    method: init.method ?? "GET",
    headers,
    body,
  });
  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  if (!res.ok) {
    const msg =
      parsed && typeof parsed === "object" && "error" in parsed
        ? String((parsed as { error: unknown }).error)
        : `HTTP ${res.status}`;
    const err = new Error(`Backend ${path} thất bại: ${msg}`) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }
  return parsed as T;
}

export async function fetchWorkspace(
  token: string
): Promise<{ memory: string; soul: string; user: string }> {
  return call(token, "/api/workspace");
}

// Boot prompt (AGENT.md) theo vai trò — lưu Mongo, đọc qua REST. Thiếu = "".
export async function fetchBoot(
  token: string,
  role: string
): Promise<string> {
  const res = await call<{ role: string; content: string }>(
    token,
    `/api/boots/${role}`
  );
  return res.content;
}

// Danh sách skill (name + description suy từ frontmatter) để build index.
export async function fetchSkills(
  token: string
): Promise<{ name: string; description: string }[]> {
  const res = await call<{ skills: { name: string; description: string }[] }>(
    token,
    "/api/skills"
  );
  return res.skills;
}

// Body skill đầy đủ; 404 → null.
export async function fetchSkill(
  token: string,
  name: string
): Promise<{ skill: string; path: string; content: string } | null> {
  try {
    return await call(token, `/api/skills/${name}`);
  } catch (err) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}

export async function writeWorkspaceFile(
  token: string,
  file: string,
  content: string
): Promise<void> {
  await call(token, `/api/workspace/files/${file}`, {
    method: "PUT",
    body: { content },
  });
}

// Trả history thô để loop resume; 404 → null (hội thoại mới).
export async function fetchConversationRaw(
  token: string,
  id: string
): Promise<{ id: string; title: string; messages: StoredMessage[] } | null> {
  try {
    return await call(token, `/api/conversations/${id}/raw`);
  } catch (err) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}

export async function saveConversation(
  token: string,
  id: string,
  data: { title?: string; messages: StoredMessage[] }
): Promise<void> {
  await call(token, `/api/conversations/${id}`, { method: "PUT", body: data });
}
