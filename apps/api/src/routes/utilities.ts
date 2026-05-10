import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Utility } from "@pr_hospitalagent/types";
import { connectDB } from "../db/client.ts";
import { verifyAuth } from "../auth/middleware.ts";
import { requireRole } from "../auth/role-guard.ts";

const UtilType = z.enum(["Điện", "Nước", "Internet", "Gas"]);
const Status = z.enum(["Chưa thanh toán", "Đã thanh toán"]);
const Period = z.string().regex(/^\d{4}-\d{2}$/, "period phải có dạng YYYY-MM");

const CreateSchema = z.object({
  type: UtilType,
  period: Period,
  amount: z.number().nonnegative(),
  usage: z.number().nonnegative(),
  unit: z.string().min(1),
  paidDate: z.union([z.string(), z.date()]).nullable().optional(),
  status: Status,
  notes: z.string().optional(),
});

const UpdateSchema = z
  .object({
    type: UtilType.optional(),
    period: Period.optional(),
    amount: z.number().nonnegative().optional(),
    usage: z.number().nonnegative().optional(),
    unit: z.string().min(1).optional(),
    paidDate: z.union([z.string(), z.date()]).nullable().optional(),
    status: Status.optional(),
    notes: z.string().optional(),
  })
  .strict();

async function nextUtilityId(): Promise<string> {
  const db = await connectDB();
  const docs = await db
    .collection<{ id: string }>("utilities")
    .find({ id: { $regex: "^UT\\d+$" } }, { projection: { id: 1, _id: 0 } })
    .toArray();
  let maxNum = 0;
  let maxLen = 3;
  for (const { id } of docs) {
    const m = id.match(/^UT(\d+)$/);
    if (!m) continue;
    const n = Number(m[1]);
    if (n > maxNum) {
      maxNum = n;
      maxLen = m[1]!.length;
    }
  }
  return "UT" + String(maxNum + 1).padStart(Math.max(3, maxLen), "0");
}

export async function utilitiesRoutes(app: FastifyInstance) {
  app.get(
    "/utilities",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async () => {
      const db = await connectDB();
      const docs = await db
        .collection<Utility>("utilities")
        .find({}, { projection: { _id: 0 } })
        .sort({ period: -1, type: 1 })
        .toArray();
      return { count: docs.length, utilities: docs };
    }
  );

  app.get<{ Params: { id: string } }>(
    "/utilities/:id",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req, reply) => {
      const db = await connectDB();
      const doc = await db
        .collection<Utility>("utilities")
        .findOne({ id: req.params.id }, { projection: { _id: 0 } });
      if (!doc) {
        reply.code(404).send({ error: `Không tìm thấy hoá đơn ${req.params.id}` });
        return;
      }
      return doc;
    }
  );

  app.post(
    "/utilities",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req, reply) => {
      const parsed = CreateSchema.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({ error: "Invalid body", details: parsed.error });
        return;
      }
      const data = parsed.data;
      const id = await nextUtilityId();
      const db = await connectDB();
      const doc: Utility = {
        id,
        type: data.type,
        period: data.period,
        amount: data.amount,
        usage: data.usage,
        unit: data.unit,
        paidDate: data.paidDate ? new Date(data.paidDate) : null,
        status: data.status,
        notes: data.notes,
        createdAt: new Date(),
      };
      await db.collection<Utility>("utilities").insertOne(doc);
      return doc;
    }
  );

  app.patch<{ Params: { id: string } }>(
    "/utilities/:id",
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
        "type",
        "period",
        "amount",
        "usage",
        "unit",
        "status",
        "notes",
      ] as const) {
        if (data[key] !== undefined) $set[key] = data[key];
      }
      if (data.paidDate !== undefined) {
        $set.paidDate = data.paidDate ? new Date(data.paidDate) : null;
      }
      if (Object.keys($set).length === 0) {
        reply.code(400).send({ error: "Không có trường nào để cập nhật." });
        return;
      }
      const db = await connectDB();
      const res = await db
        .collection<Utility>("utilities")
        .updateOne({ id: req.params.id }, { $set });
      if (res.matchedCount === 0) {
        reply.code(404).send({ error: `Không tìm thấy hoá đơn ${req.params.id}` });
        return;
      }
      const updated = await db
        .collection<Utility>("utilities")
        .findOne({ id: req.params.id }, { projection: { _id: 0 } });
      return updated;
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/utilities/:id",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req, reply) => {
      const db = await connectDB();
      const res = await db
        .collection<Utility>("utilities")
        .deleteOne({ id: req.params.id });
      if (res.deletedCount === 0) {
        reply.code(404).send({ error: `Không tìm thấy hoá đơn ${req.params.id}` });
        return;
      }
      return { ok: true, deleted: req.params.id };
    }
  );
}
