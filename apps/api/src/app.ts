import Fastify, { type FastifyInstance } from "fastify";
import { connectDB } from "@pr_hospitalagent/api-shared";
import { loadEnv } from "./config/env.ts";
import { registerCors } from "./plugins/cors.ts";
import { registerJwt } from "./plugins/jwt.ts";
import { registerErrorHandler } from "./plugins/error-handler.ts";
import { registerHealth } from "./plugins/health.ts";
import { registerRoutes } from "./routes/index.ts";

export async function buildApp(): Promise<{
  app: FastifyInstance;
  port: number;
}> {
  const env = loadEnv();
  const app = Fastify({ logger: true });

  await registerCors(app, env.corsOrigin);
  await registerJwt(app, env.jwtSecret);
  registerErrorHandler(app);

  await connectDB();

  registerHealth(app);
  await registerRoutes(app);

  return { app, port: env.port };
}
