import { API_URL, TOKEN_KEY } from "./api";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
    this.name = "ApiError";
  }
}

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

type ApiInit = Omit<RequestInit, "body"> & {
  token?: string | null;
  body?: unknown;
};

export async function api<T = unknown>(
  path: string,
  init: ApiInit = {}
): Promise<T> {
  const { token, headers, body, ...rest } = init;
  const tok = token === undefined ? readToken() : token;

  const finalHeaders: Record<string, string> = {
    ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
    ...((headers as Record<string, string>) ?? {}),
  };

  let finalBody: BodyInit | undefined;
  if (body !== undefined && body !== null) {
    if (
      typeof body === "string" ||
      body instanceof FormData ||
      body instanceof Blob ||
      body instanceof ArrayBuffer
    ) {
      finalBody = body as BodyInit;
    } else {
      finalBody = JSON.stringify(body);
      if (!finalHeaders["Content-Type"]) {
        finalHeaders["Content-Type"] = "application/json";
      }
    }
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: finalBody,
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
      (parsed && typeof parsed === "object" && "error" in parsed
        ? String((parsed as { error: unknown }).error)
        : null) ?? res.statusText ?? `HTTP ${res.status}`;
    throw new ApiError(res.status, msg, parsed);
  }

  return parsed as T;
}

export const http = {
  get: <T = unknown>(path: string, init?: ApiInit) =>
    api<T>(path, { ...init, method: "GET" }),
  post: <T = unknown>(path: string, body?: unknown, init?: ApiInit) =>
    api<T>(path, { ...init, method: "POST", body }),
  patch: <T = unknown>(path: string, body?: unknown, init?: ApiInit) =>
    api<T>(path, { ...init, method: "PATCH", body }),
  put: <T = unknown>(path: string, body?: unknown, init?: ApiInit) =>
    api<T>(path, { ...init, method: "PUT", body }),
  delete: <T = unknown>(path: string, init?: ApiInit) =>
    api<T>(path, { ...init, method: "DELETE" }),
};
