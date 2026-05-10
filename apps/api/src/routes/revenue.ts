import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Revenue } from "@pr_hospitalagent/types";
import { connectDB } from "../db/client.ts";
import { verifyAuth } from "../auth/middleware.ts";
import { requireRole } from "../auth/role-guard.ts";

const Source = z.enum(["Khám bệnh", "Xét nghiệm", "Bán thuốc", "Dịch vụ khác"]);
const Period = z.string().regex(/^\d{4}-\d{2}$/, "period phải có dạng YYYY-MM");

const CreateSchema = z.object({
  source: Source,
  period: Period,
  amount: z.number().nonnegative(),
  date: z.union([z.string(), z.date()]),
  patientId: z.string().optional(),
  notes: z.string().optional(),
});

const UpdateSchema = z
  .object({
    source: Source.optional(),
    period: Period.optional(),
    amount: z.number().nonnegative().optional(),
    date: z.union([z.string(), z.date()]).optional(),
    patientId: z.string().optional(),
    notes: z.string().optional(),
  })
  .strict();

async function nextRevenueId(): Promise<string> {
  const db = await connectDB();
  const docs = await db
    .collection<{ id: string }>("revenue")
    .find({ id: { $regex: "^DT\\d+$" } }, { projection: { id: 1, _id: 0 } })
    .toArray();
  let maxNum = 0;
  let maxLen = 3;
  for (const { id } of docs) {
    const m = id.match(/^DT(\d+)$/);
    if (!m) continue;
    const n = Number(m[1]);
    if (n > maxNum) {
      maxNum = n;
      maxLen = m[1]!.length;
    }
  }
  return "DT" + String(maxNum + 1).padStart(Math.max(3, maxLen), "0");
}

export async function revenueRoutes(app: FastifyInstance) {
  app.get(
    "/revenue",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async () => {
      const db = await connectDB();
      const docs = await db
        .collection<Revenue>("revenue")
        .find({}, { projection: { _id: 0 } })
        .sort({ date: -1 })
        .toArray();
      return { count: docs.length, revenue: docs };
    }
  );

  app.get<{ Params: { id: string } }>(
    "/revenue/:id",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req, reply) => {
      const db = await connectDB();
      const doc = await db
        .collection<Revenue>("revenue")
        .findOne({ id: req.params.id }, { projection: { _id: 0 } });
      if (!doc) {
        reply.code(404).send({ error: `Không tìm thấy doanh thu ${req.params.id}` });
        return;
      }
      return doc;
    }
  );

  app.post(
    "/revenue",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req, reply) => {
      const parsed = CreateSchema.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({ error: "Invalid body", details: parsed.error });
        return;
      }
      const data = parsed.data;
      const id = await nextRevenueId();
      const db = await connectDB();
      const doc: Revenue = {
        id,
        source: data.source,
        period: data.period,
        amount: data.amount,
        date: new Date(data.date),
        patientId: data.patientId,
        notes: data.notes,
        createdAt: new Date(),
      };
      await db.collection<Revenue>("revenue").insertOne(doc);
      return doc;
    }
  );

  app.patch<{ Params: { id: string } }>(
    "/revenue/:id",
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
        "source",
        "period",
        "amount",
        "patientId",
        "notes",
      ] as const) {
        if (data[key] !== undefined) $set[key] = data[key];
      }
      if (data.date !== undefined) {
        $set.date = new Date(data.date);
      }
      if (Object.keys($set).length === 0) {
        reply.code(400).send({ error: "Không có trường nào để cập nhật." });
        return;
      }
      const db = await connectDB();
      const res = await db
        .collection<Revenue>("revenue")
        .updateOne({ id: req.params.id }, { $set });
      if (res.matchedCount === 0) {
        reply.code(404).send({ error: `Không tìm thấy doanh thu ${req.params.id}` });
        return;
      }
      const updated = await db
        .collection<Revenue>("revenue")
        .findOne({ id: req.params.id }, { projection: { _id: 0 } });
      return updated;
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/revenue/:id",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req, reply) => {
      const db = await connectDB();
      const res = await db
        .collection<Revenue>("revenue")
        .deleteOne({ id: req.params.id });
      if (res.deletedCount === 0) {
        reply.code(404).send({ error: `Không tìm thấy doanh thu ${req.params.id}` });
        return;
      }
      return { ok: true, deleted: req.params.id };
    }
  );
}
