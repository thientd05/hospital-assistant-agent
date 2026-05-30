import type { FastifyReply, FastifyRequest } from "fastify";
import type {} from "@fastify/jwt";

// Agent chỉ phục vụ doctor + patient.
export type AgentRole = "doctor" | "manager" | "patient" | "expert";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; role: AgentRole; type: "access" | "refresh" };
    user: {
      sub: string;
      role: AgentRole;
      // Token cũ (trước cơ chế 2-token) không có `type` → coi như access.
      type?: "access" | "refresh";
      iat: number;
      exp: number;
    };
  }
}

declare module "fastify" {
  interface FastifyRequest {
    authRole?: AgentRole;
  }
}

// Xác thực JWT KHÔNG chạm DB — id + role nằm sẵn trong payload.
// Đây là điểm mấu chốt giúp agent service "cực nhẹ": không cần Mongo để auth.
export async function verifyToken(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    reply.code(401).send({ error: "Unauthorized" });
    return reply;
  }
  // Refresh token CHỈ dùng ở /auth/refresh (REST) — không cho vào agent.
  if (req.user.type === "refresh") {
    reply.code(401).send({ error: "Unauthorized" });
    return reply;
  }
  req.authRole = req.user.role;
}

// Thuần — chỉ đọc req.authRole, không DB. (Bản sao của api-shared để agent tự chủ.)
export function requireRole(...allowedRoles: AgentRole[]) {
  return async function (req: FastifyRequest, reply: FastifyReply) {
    if (!req.authRole || !allowedRoles.includes(req.authRole)) {
      reply.code(403).send({
        error: "Forbidden",
        message: `Vai trò "${req.authRole ?? "unknown"}" không có quyền truy cập tài nguyên này.`,
      });
      return reply;
    }
  };
}

// Lấy bearer token từ request để forward sang REST backend.
export function bearerToken(req: FastifyRequest): string {
  const h = req.headers.authorization ?? "";
  return h.startsWith("Bearer ") ? h.slice(7) : "";
}
