import type { FastifyInstance } from "fastify";
import { verifyAuth, requireRole } from "@pr_hospitalagent/api-shared";
import { AssetCreateSchema, AssetUpdateSchema } from "../schemas/asset.ts";
import { parseBody } from "../lib/validate.ts";
import { assetService } from "../services/asset.service.ts";

export async function assetsRoutes(app: FastifyInstance) {
  app.get(
    "/assets",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async () => {
      const assets = await assetService.list();
      return { count: assets.length, assets };
    }
  );

  app.get<{ Params: { id: string } }>(
    "/assets/:id",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req) => assetService.get(req.params.id)
  );

  app.post(
    "/assets",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req) => assetService.create(parseBody(AssetCreateSchema, req.body))
  );

  app.patch<{ Params: { id: string } }>(
    "/assets/:id",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req) =>
      assetService.update(req.params.id, parseBody(AssetUpdateSchema, req.body))
  );

  app.delete<{ Params: { id: string } }>(
    "/assets/:id",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req) => assetService.delete(req.params.id)
  );
}
