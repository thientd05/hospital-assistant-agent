import type { FastifyError, FastifyInstance } from "fastify";
import { AppError } from "../lib/errors.ts";

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((err: FastifyError, _req, reply) => {
    if (err instanceof AppError) {
      const body: { error: string; details?: unknown } = { error: err.message };
      if (err.details !== undefined) body.details = err.details;
      reply.code(err.statusCode).send(body);
      return;
    }
    if (err.validation) {
      reply.code(400).send({ error: "Invalid body", details: err.validation });
      return;
    }
    app.log.error(err);
    reply.code(500).send({ error: "Internal server error" });
  });
}
