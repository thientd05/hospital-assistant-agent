export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const AGENT_URL =
  process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:3002";

export const TOKEN_KEY = "auth:token";
export const REFRESH_KEY = "auth:refresh";
export const ACCOUNT_KEY = "auth:account";

// localStorage key (theo từng user) lưu trạng thái chat đang mở (mode + conv id).
// Khôi phục khi refresh; bị xoá khi ĐĂNG NHẬP MỚI → mặc định đoạn chat mới với AI.
export const CHAT_STATE_KEY_PREFIX = "chat:lastState:";
