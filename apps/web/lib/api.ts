export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const TOKEN_KEY = "auth:token";
export const ACCOUNT_KEY = "auth:account";

export function authHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function authFetch(
  path: string,
  init: RequestInit & { token: string | null }
): Promise<Response> {
  const { token, headers, ...rest } = init;
  return fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      ...authHeaders(token),
      ...(headers ?? {}),
    },
  });
}
