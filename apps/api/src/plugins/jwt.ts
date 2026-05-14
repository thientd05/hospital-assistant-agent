import type { FastifyInstance } from "fastify";
import jwt from "@fastify/jwt";

export async function registerJwt(app: FastifyInstance, secret: string) {
  await app.register(jwt, { secret });
}
