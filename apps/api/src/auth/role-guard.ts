import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthRole } from "./middleware.ts";

export function requireRole(...allowedRoles: AuthRole[]) {
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
