import type { FastifyInstance } from "fastify";
import { verifyAuth, requireRole } from "@pr_hospitalagent/api-shared";
import {
  ExpertCreateSchema,
  ExpertUpdateSchema,
} from "../schemas/expert.ts";
import { parseBody } from "../lib/validate.ts";
import { expertService } from "../services/expert.service.ts";

export async function expertsRoutes(app: FastifyInstance) {
  app.get(
    "/experts",
    { preHandler: [verifyAuth, requireRole("manager", "expert")] },
    async () => {
      const experts = await expertService.list();
      return { count: experts.length, experts };
    }
  );

  app.get<{ Params: { id: string } }>(
    "/experts/:id",
    { preHandler: [verifyAuth, requireRole("manager", "expert")] },
    async (req) => expertService.get(req.params.id)
  );

  app.post(
    "/experts",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req) => expertService.create(parseBody(ExpertCreateSchema, req.body))
  );

  app.patch<{ Params: { id: string } }>(
    "/experts/:id",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req) =>
      expertService.update(req.params.id, parseBody(ExpertUpdateSchema, req.body))
  );

  app.delete<{ Params: { id: string } }>(
    "/experts/:id",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req) => expertService.delete(req.params.id)
  );
}
