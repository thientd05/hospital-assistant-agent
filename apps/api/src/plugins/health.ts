import type { FastifyInstance } from "fastify";

export function registerHealth(app: FastifyInstance) {
  app.get("/health", async () => ({ status: "ok", db: "connected" }));
}
