import type { FastifyInstance } from "fastify";
import { verifyAuth, requireRole } from "@pr_hospitalagent/api-shared";
import { medicationService } from "../services/medication.service.ts";

export async function medicationsRoutes(app: FastifyInstance) {
  // Danh mục thuốc cho bác sĩ kê đơn (form chọn thuốc ở tab Hồ sơ).
  app.get(
    "/medications",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async () => {
      const medications = await medicationService.list();
      return { count: medications.length, medications };
    }
  );
}
