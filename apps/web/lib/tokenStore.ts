// Nguồn sự thật cho token phía client (ngoài React) — dùng chung bởi apiClient,
// useChat và các hook gọi fetch thủ công. Cơ chế 2-token:
//   - access token (auth:token): sống 10 phút, gửi kèm mọi request.
//   - refresh token (auth:refresh): sống 2 tiếng, chỉ dùng để xin access mới.
// Hết hạn refresh (2h) → xoá sạch + phát sự kiện "auth:expired" để đăng xuất.
import { ACCOUNT_KEY, API_URL, REFRESH_KEY, TOKEN_KEY } from "./api";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(token: string, refreshToken: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function setAccessToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ACCOUNT_KEY);
}

// Phiên hết hạn hẳn (refresh không đổi được nữa) → báo cho AuthProvider đăng xuất.
function notifyExpired() {
  clearTokens();
  window.dispatchEvent(new Event("auth:expired"));
}

// Gộp các lần refresh đồng thời vào MỘT request /auth/refresh duy nhất.
let inflight: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  if (inflight) return inflight;
  inflight = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      notifyExpired();
      return null;
    }
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        // Refresh hết hạn/không hợp lệ → phải đăng nhập lại.
        notifyExpired();
        return null;
      }
      const data = (await res.json()) as { token: string };
      setAccessToken(data.token);
      return data.token;
    } catch {
      // Lỗi mạng tạm thời — KHÔNG xoá token, để lần sau thử lại.
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

// fetch có gắn sẵn access token; gặp 401 thì tự refresh + thử lại đúng MỘT lần.
export async function authFetch(
  input: string,
  init: RequestInit = {},
  retry = true
): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(input, { ...init, headers });
  if (res.status === 401 && retry) {
    const fresh = await refreshAccessToken();
    if (fresh) return authFetch(input, init, false);
  }
  return res;
}
