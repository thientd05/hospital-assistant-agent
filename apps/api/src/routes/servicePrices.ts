import type { FastifyInstance } from "fastify";
import { verifyAuth, requireRole } from "@pr_hospitalagent/api-shared";
import { servicePriceService } from "../services/servicePrice.service.ts";

export async function servicePricesRoutes(app: FastifyInstance) {
  // Bảng giá dịch vụ khám (tham khảo) — agent bệnh nhân tra qua tool
  // `read_service_prices`. Chỉ ĐỌC, không có UI CRUD / panel.
  app.get(
    "/service-prices",
    { preHandler: [verifyAuth, requireRole("patient")] },
    async () => {
      const services = await servicePriceService.list();
      return { count: services.length, services };
    }
  );
}
