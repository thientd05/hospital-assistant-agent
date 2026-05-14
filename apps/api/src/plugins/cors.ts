import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";

export async function registerCors(app: FastifyInstance, origin: string) {
  await app.register(cors, { origin });
}
