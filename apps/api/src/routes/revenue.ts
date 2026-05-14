import type { FastifyInstance } from "fastify";
import { verifyAuth, requireRole } from "@pr_hospitalagent/api-shared";
import {
  RevenueCreateSchema,
  RevenueUpdateSchema,
} from "../schemas/revenue.ts";
import { parseBody } from "../lib/validate.ts";
import { revenueService } from "../services/revenue.service.ts";

export async function revenueRoutes(app: FastifyInstance) {
  app.get(
    "/revenue",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async () => {
      const revenue = await revenueService.list();
      return { count: revenue.length, revenue };
    }
  );

  app.get<{ Params: { id: string } }>(
    "/revenue/:id",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req) => revenueService.get(req.params.id)
  );

  app.post(
    "/revenue",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req) => revenueService.create(parseBody(RevenueCreateSchema, req.body))
  );

  app.patch<{ Params: { id: string } }>(
    "/revenue/:id",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req) =>
      revenueService.update(req.params.id, parseBody(RevenueUpdateSchema, req.body))
  );

  app.delete<{ Params: { id: string } }>(
    "/revenue/:id",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req) => revenueService.delete(req.params.id)
  );
}
