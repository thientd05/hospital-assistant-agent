import type { FastifyInstance } from "fastify";
import { verifyAuth, requireRole } from "@pr_hospitalagent/api-shared";
import {
  PayrollCreateSchema,
  PayrollUpdateSchema,
} from "../schemas/payroll.ts";
import { parseBody } from "../lib/validate.ts";
import { payrollService } from "../services/payroll.service.ts";

export async function payrollRoutes(app: FastifyInstance) {
  app.get(
    "/payroll",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async () => {
      const payroll = await payrollService.list();
      return { count: payroll.length, payroll };
    }
  );

  app.get<{ Params: { id: string } }>(
    "/payroll/:id",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req) => payrollService.get(req.params.id)
  );

  app.post(
    "/payroll",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req) => payrollService.create(parseBody(PayrollCreateSchema, req.body))
  );

  app.patch<{ Params: { id: string } }>(
    "/payroll/:id",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req) =>
      payrollService.update(req.params.id, parseBody(PayrollUpdateSchema, req.body))
  );

  app.delete<{ Params: { id: string } }>(
    "/payroll/:id",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req) => payrollService.delete(req.params.id)
  );
}
