import type { FastifyInstance } from "fastify";
import { verifyAuth, requireRole } from "@pr_hospitalagent/api-shared";
import { DrugCheckSchema } from "../schemas/drug-check.ts";
import { parseBody } from "../lib/validate.ts";
import { drugCheckService } from "../services/drug-check.service.ts";

export async function drugCheckRoutes(app: FastifyInstance) {
  app.post(
    "/drug-check",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req) => {
      const { drugs } = parseBody(DrugCheckSchema, req.body);
      return drugCheckService.check(drugs);
    }
  );
}
