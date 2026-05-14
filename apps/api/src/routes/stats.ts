import type { FastifyInstance } from "fastify";
import { verifyAuth, requireRole } from "@pr_hospitalagent/api-shared";
import { customersStatsService } from "../services/stats/customers.service.ts";
import { financialStatsService } from "../services/stats/financial.service.ts";

function intParam(value: unknown, fallback: number): number {
  if (typeof value === "string" && Number(value) > 0) {
    return Math.floor(Number(value));
  }
  return fallback;
}

export async function statsRoutes(app: FastifyInstance) {
  app.get(
    "/stats/customers",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req) => {
      const q = req.query as Record<string, unknown>;
      return customersStatsService.build({
        topDiagnoses: intParam(q.topDiagnoses, 10),
        topWards: intParam(q.topWards, 10),
      });
    }
  );

  app.get(
    "/stats/financial",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async () => financialStatsService.build()
  );
}
