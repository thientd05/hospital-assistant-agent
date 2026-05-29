import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { chatRoutes } from "./routes/chat.ts";
import { skillsRoutes } from "./routes/skills.ts";

export async function buildAgentApp(): Promise<{
  app: FastifyInstance;
  port: number;
}> {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is required (set it in .env)");
  }

  const app = Fastify({ logger: true });

  const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3000";
  await app.register(cors, { origin: corsOrigin });
  await app.register(jwt, { secret: jwtSecret });

  // Agent stateless về DB — không connectDB. Persistence đi qua REST backend.
  app.get("/health", async () => ({ status: "ok" }));

  await app.register(chatRoutes, { prefix: "/api" });
  await app.register(skillsRoutes, { prefix: "/api" });

  const port = Number(process.env.AGENT_PORT ?? 3002);
  return { app, port };
}
