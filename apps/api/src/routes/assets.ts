import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Asset } from "@pr_hospitalagent/types";
import { connectDB } from "../db/client.ts";
import { verifyAuth } from "../auth/middleware.ts";
import { requireRole } from "../auth/role-guard.ts";

const Category = z.enum(["Thiết bị y tế", "Nội thất", "Máy tính", "Khác"]);
const Condition = z.enum(["Tốt", "Bình thường", "Cần sửa", "Hỏng"]);

const CreateSchema = z.object({
  name: z.string().min(1),
  category: Category,
  location: z.string().min(1),
  purchaseDate: z.union([z.string(), z.date()]),
  purchasePrice: z.number().nonnegative(),
  depreciationYears: z.number().int().nonnegative(),
  condition: Condition,
  notes: z.string().optional(),
});

const UpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    category: Category.optional(),
    location: z.string().min(1).optional(),
    purchaseDate: z.union([z.string(), z.date()]).optional(),
    purchasePrice: z.number().nonnegative().optional(),
    depreciationYears: z.number().int().nonnegative().optional(),
    condition: Condition.optional(),
    notes: z.string().optional(),
  })
  .strict();

async function nextAssetId(): Promise<string> {
  const db = await connectDB();
  const docs = await db
    .collection<{ id: string }>("assets")
    .find({ id: { $regex: "^TS\\d+$" } }, { projection: { id: 1, _id: 0 } })
    .toArray();
  let maxNum = 0;
  let maxLen = 3;
  for (const { id } of docs) {
    const m = id.match(/^TS(\d+)$/);
    if (!m) continue;
    const n = Number(m[1]);
    if (n > maxNum) {
      maxNum = n;
      maxLen = m[1]!.length;
    }
  }
  return "TS" + String(maxNum + 1).padStart(Math.max(3, maxLen), "0");
}

export async function assetsRoutes(app: FastifyInstance) {
  app.get(
    "/assets",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async () => {
      const db = await connectDB();
      const docs = await db
        .collection<Asset>("assets")
        .find({}, { projection: { _id: 0 } })
        .sort({ id: 1 })
        .toArray();
      return { count: docs.length, assets: docs };
    }
  );

  app.get<{ Params: { id: string } }>(
    "/assets/:id",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req, reply) => {
      const db = await connectDB();
      const asset = await db
        .collection<Asset>("assets")
        .findOne({ id: req.params.id }, { projection: { _id: 0 } });
      if (!asset) {
        reply.code(404).send({ error: `Không tìm thấy tài sản ${req.params.id}` });
        return;
      }
      return asset;
    }
  );

  app.post(
    "/assets",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req, reply) => {
      const parsed = CreateSchema.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({ error: "Invalid body", details: parsed.error });
        return;
      }
      const data = parsed.data;
      const id = await nextAssetId();
      const db = await connectDB();
      const asset: Asset = {
        id,
        name: data.name,
        category: data.category,
        location: data.location,
        purchaseDate: new Date(data.purchaseDate),
        purchasePrice: data.purchasePrice,
        depreciationYears: data.depreciationYears,
        condition: data.condition,
        notes: data.notes,
        createdAt: new Date(),
      };
      await db.collection<Asset>("assets").insertOne(asset);
      return asset;
    }
  );

  app.patch<{ Params: { id: string } }>(
    "/assets/:id",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req, reply) => {
      const parsed = UpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({ error: "Invalid body", details: parsed.error });
        return;
      }
      const $set: Record<string, unknown> = {};
      const data = parsed.data;
      for (const key of [
        "name",
        "category",
        "location",
        "purchasePrice",
        "depreciationYears",
        "condition",
        "notes",
      ] as const) {
        if (data[key] !== undefined) $set[key] = data[key];
      }
      if (data.purchaseDate !== undefined) {
        $set.purchaseDate = new Date(data.purchaseDate);
      }
      if (Object.keys($set).length === 0) {
        reply.code(400).send({ error: "Không có trường nào để cập nhật." });
        return;
      }
      const db = await connectDB();
      const res = await db
        .collection<Asset>("assets")
        .updateOne({ id: req.params.id }, { $set });
      if (res.matchedCount === 0) {
        reply.code(404).send({ error: `Không tìm thấy tài sản ${req.params.id}` });
        return;
      }
      const updated = await db
        .collection<Asset>("assets")
        .findOne({ id: req.params.id }, { projection: { _id: 0 } });
      return updated;
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/assets/:id",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req, reply) => {
      const db = await connectDB();
      const res = await db
        .collection<Asset>("assets")
        .deleteOne({ id: req.params.id });
      if (res.deletedCount === 0) {
        reply.code(404).send({ error: `Không tìm thấy tài sản ${req.params.id}` });
        return;
      }
      return { ok: true, deleted: req.params.id };
    }
  );
}
