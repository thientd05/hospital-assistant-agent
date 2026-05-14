import type { FastifyInstance } from "fastify";
import { verifyAuth, requireRole } from "@pr_hospitalagent/api-shared";
import {
  UtilityCreateSchema,
  UtilityUpdateSchema,
} from "../schemas/utility.ts";
import { parseBody } from "../lib/validate.ts";
import { utilityService } from "../services/utility.service.ts";

export async function utilitiesRoutes(app: FastifyInstance) {
  app.get(
    "/utilities",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async () => {
      const utilities = await utilityService.list();
      return { count: utilities.length, utilities };
    }
  );

  app.get<{ Params: { id: string } }>(
    "/utilities/:id",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req) => utilityService.get(req.params.id)
  );

  app.post(
    "/utilities",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req) => utilityService.create(parseBody(UtilityCreateSchema, req.body))
  );

  app.patch<{ Params: { id: string } }>(
    "/utilities/:id",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req) =>
      utilityService.update(req.params.id, parseBody(UtilityUpdateSchema, req.body))
  );

  app.delete<{ Params: { id: string } }>(
    "/utilities/:id",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req) => utilityService.delete(req.params.id)
  );
}
