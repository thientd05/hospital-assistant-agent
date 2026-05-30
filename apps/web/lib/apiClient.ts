import { AGENT_URL, API_URL } from "./api";
import { getAccessToken, refreshAccessToken } from "./tokenStore";

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

type ApiInit = Omit<RequestInit, "body"> & {
  token?: string | null;
  body?: unknown;
};

function makeApi(baseUrl: string) {
  return async function api<T = unknown>(
    path: string,
    init: ApiInit = {}
  ): Promise<T> {
    const { token, headers, body, ...rest } = init;

    let finalBody: BodyInit | undefined;
    const baseHeaders: Record<string, string> = {
      ...((headers as Record<string, string>) ?? {}),
    };
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
        if (!baseHeaders["Content-Type"]) {
          baseHeaders["Content-Type"] = "application/json";
        }
      }
    }

    // Caller có thể truyền token cố định (token !== undefined) — khi đó KHÔNG
    // tự refresh. Mặc định dùng access token trong store + refresh-on-401.
    const explicitToken = token !== undefined;

    const doFetch = (tok: string | null) =>
      fetch(`${baseUrl}${path}`, {
        ...rest,
        headers: {
          ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
          ...baseHeaders,
        },
        body: finalBody,
      });

    let res = await doFetch(explicitToken ? token : getAccessToken());
    if (res.status === 401 && !explicitToken) {
      const fresh = await refreshAccessToken();
      if (fresh) res = await doFetch(fresh);
    }

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
  };
}

export const api = makeApi(API_URL);
export const apiAgent = makeApi(AGENT_URL);

function makeClient(call: ReturnType<typeof makeApi>) {
  return {
    get: <T = unknown>(path: string, init?: ApiInit) =>
      call<T>(path, { ...init, method: "GET" }),
    post: <T = unknown>(path: string, body?: unknown, init?: ApiInit) =>
      call<T>(path, { ...init, method: "POST", body }),
    patch: <T = unknown>(path: string, body?: unknown, init?: ApiInit) =>
      call<T>(path, { ...init, method: "PATCH", body }),
    put: <T = unknown>(path: string, body?: unknown, init?: ApiInit) =>
      call<T>(path, { ...init, method: "PUT", body }),
    delete: <T = unknown>(path: string, init?: ApiInit) =>
      call<T>(path, { ...init, method: "DELETE" }),
  };
}

export const http = makeClient(api);
export const httpAgent = makeClient(apiAgent);
