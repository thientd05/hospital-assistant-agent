import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { chatRoutes } from "./routes/chat.ts";

export async function buildAgentApp(): Promise<{
  app: FastifyInstance;
  port: number;
}> {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is required (set it in .env)");
  }
  // Cơ chế 2-token dùng 2 secret — chia sẻ chung với REST qua root .env.
  // Agent chỉ verify access (request.jwtVerify = JWT_SECRET); refresh token
  // gửi nhầm vào agent sẽ FAIL chữ ký (khác key). Namespace refresh đăng ký
  // để 2 service đối xứng (cùng có cả 2 secret).
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!jwtRefreshSecret) {
    throw new Error("JWT_REFRESH_SECRET is required (set it in .env)");
  }

  const app = Fastify({ logger: true });

  const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3000";
  await app.register(cors, { origin: corsOrigin });
  await app.register(jwt, { secret: jwtSecret });
  await app.register(jwt, {
    secret: jwtRefreshSecret,
    namespace: "refresh",
    jwtVerify: "refreshJwtVerify",
    jwtSign: "refreshJwtSign",
  });

  // Agent stateless về DB — không connectDB. Persistence đi qua REST backend.
  app.get("/health", async () => ({ status: "ok" }));

  // Skills CRUD đã chuyển sang apps/api (Mongo). Agent chỉ còn chat.
  await app.register(chatRoutes, { prefix: "/api" });

  const port = Number(process.env.AGENT_PORT ?? 3002);
  return { app, port };
}
