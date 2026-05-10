import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Payroll } from "@pr_hospitalagent/types";
import { connectDB } from "../db/client.ts";
import { verifyAuth } from "../auth/middleware.ts";
import { requireRole } from "../auth/role-guard.ts";

const Role = z.enum(["doctor", "expert", "manager"]);
const Status = z.enum(["Chưa thanh toán", "Đã thanh toán"]);
const Period = z.string().regex(/^\d{4}-\d{2}$/, "period phải có dạng YYYY-MM");

const CreateSchema = z.object({
  employeeId: z.string().min(1),
  employeeRole: Role,
  employeeName: z.string().min(1),
  period: Period,
  baseSalary: z.number().nonnegative(),
  bonus: z.number().nonnegative(),
  deduction: z.number().nonnegative(),
  paidDate: z.union([z.string(), z.date()]).nullable().optional(),
  status: Status,
  notes: z.string().optional(),
});

const UpdateSchema = z
  .object({
    employeeId: z.string().min(1).optional(),
    employeeRole: Role.optional(),
    employeeName: z.string().min(1).optional(),
    period: Period.optional(),
    baseSalary: z.number().nonnegative().optional(),
    bonus: z.number().nonnegative().optional(),
    deduction: z.number().nonnegative().optional(),
    paidDate: z.union([z.string(), z.date()]).nullable().optional(),
    status: Status.optional(),
    notes: z.string().optional(),
  })
  .strict();

async function nextPayrollId(): Promise<string> {
  const db = await connectDB();
  const docs = await db
    .collection<{ id: string }>("payroll")
    .find({ id: { $regex: "^LG\\d+$" } }, { projection: { id: 1, _id: 0 } })
    .toArray();
  let maxNum = 0;
  let maxLen = 3;
  for (const { id } of docs) {
    const m = id.match(/^LG(\d+)$/);
    if (!m) continue;
    const n = Number(m[1]);
    if (n > maxNum) {
      maxNum = n;
      maxLen = m[1]!.length;
    }
  }
  return "LG" + String(maxNum + 1).padStart(Math.max(3, maxLen), "0");
}

export async function payrollRoutes(app: FastifyInstance) {
  app.get(
    "/payroll",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async () => {
      const db = await connectDB();
      const docs = await db
        .collection<Payroll>("payroll")
        .find({}, { projection: { _id: 0 } })
        .sort({ period: -1, employeeId: 1 })
        .toArray();
      return { count: docs.length, payroll: docs };
    }
  );

  app.get<{ Params: { id: string } }>(
    "/payroll/:id",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req, reply) => {
      const db = await connectDB();
      const doc = await db
        .collection<Payroll>("payroll")
        .findOne({ id: req.params.id }, { projection: { _id: 0 } });
      if (!doc) {
        reply.code(404).send({ error: `Không tìm thấy bản lương ${req.params.id}` });
        return;
      }
      return doc;
    }
  );

  app.post(
    "/payroll",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req, reply) => {
      const parsed = CreateSchema.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({ error: "Invalid body", details: parsed.error });
        return;
      }
      const data = parsed.data;
      const id = await nextPayrollId();
      const net = data.baseSalary + data.bonus - data.deduction;
      const db = await connectDB();
      const doc: Payroll = {
        id,
        employeeId: data.employeeId,
        employeeRole: data.employeeRole,
        employeeName: data.employeeName,
        period: data.period,
        baseSalary: data.baseSalary,
        bonus: data.bonus,
        deduction: data.deduction,
        net,
        paidDate: data.paidDate ? new Date(data.paidDate) : null,
        status: data.status,
        notes: data.notes,
        createdAt: new Date(),
      };
      await db.collection<Payroll>("payroll").insertOne(doc);
      return doc;
    }
  );

  app.patch<{ Params: { id: string } }>(
    "/payroll/:id",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req, reply) => {
      const parsed = UpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({ error: "Invalid body", details: parsed.error });
        return;
      }
      const data = parsed.data;
      const db = await connectDB();
      const existing = await db
        .collection<Payroll>("payroll")
        .findOne({ id: req.params.id }, { projection: { _id: 0 } });
      if (!existing) {
        reply.code(404).send({ error: `Không tìm thấy bản lương ${req.params.id}` });
        return;
      }
      const $set: Record<string, unknown> = {};
      for (const key of [
        "employeeId",
        "employeeRole",
        "employeeName",
        "period",
        "status",
        "notes",
      ] as const) {
        if (data[key] !== undefined) $set[key] = data[key];
      }
      if (data.paidDate !== undefined) {
        $set.paidDate = data.paidDate ? new Date(data.paidDate) : null;
      }
      const baseSalary = data.baseSalary ?? existing.baseSalary;
      const bonus = data.bonus ?? existing.bonus;
      const deduction = data.deduction ?? existing.deduction;
      if (
        data.baseSalary !== undefined ||
        data.bonus !== undefined ||
        data.deduction !== undefined
      ) {
        $set.baseSalary = baseSalary;
        $set.bonus = bonus;
        $set.deduction = deduction;
        $set.net = baseSalary + bonus - deduction;
      }
      if (Object.keys($set).length === 0) {
        reply.code(400).send({ error: "Không có trường nào để cập nhật." });
        return;
      }
      await db
        .collection<Payroll>("payroll")
        .updateOne({ id: req.params.id }, { $set });
      const updated = await db
        .collection<Payroll>("payroll")
        .findOne({ id: req.params.id }, { projection: { _id: 0 } });
      return updated;
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/payroll/:id",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req, reply) => {
      const db = await connectDB();
      const res = await db
        .collection<Payroll>("payroll")
        .deleteOne({ id: req.params.id });
      if (res.deletedCount === 0) {
        reply.code(404).send({ error: `Không tìm thấy bản lương ${req.params.id}` });
        return;
      }
      return { ok: true, deleted: req.params.id };
    }
  );
}
