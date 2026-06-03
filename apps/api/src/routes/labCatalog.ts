import type { FastifyInstance } from "fastify";
import { verifyAuth, requireRole } from "@pr_hospitalagent/api-shared";
import { labCatalogService } from "../services/labCatalog.service.ts";

export async function labCatalogRoutes(app: FastifyInstance) {
  // Danh mục xét nghiệm (đọc-only) cho dropdown khi bác sĩ thêm kết quả ở tab Hồ sơ.
  app.get(
    "/lab-catalog",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async () => {
      const catalog = await labCatalogService.list();
      return { count: catalog.length, catalog };
    }
  );
}
