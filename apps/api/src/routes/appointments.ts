import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Appointment, Patient } from "@pr_hospitalagent/types";
import { connectDB } from "../db/client.ts";
import { verifyAuth } from "../auth/middleware.ts";
import { requireRole } from "../auth/role-guard.ts";

const StatusEnum = z.enum(["Chờ duyệt", "Đã duyệt", "Thành công"]);

const CreateSchema = z.object({
  patientId: z.string().min(1),
  doctorId: z.string().min(1).optional(),
  scheduledAt: z.union([z.string(), z.date()]),
  reason: z.string().min(1),
  status: StatusEnum.optional(),
});

const UpdateSchema = z
  .object({
    patientId: z.string().min(1).optional(),
    scheduledAt: z.union([z.string(), z.date()]).optional(),
    reason: z.string().min(1).optional(),
    status: StatusEnum.optional(),
  })
  .strict();

async function nextAppointmentId(): Promise<string> {
  const db = await connectDB();
  const docs = await db
    .collection<{ id: string }>("appointments")
    .find({ id: { $regex: "^APT\\d+$" } }, { projection: { id: 1, _id: 0 } })
    .toArray();
  let maxNum = 0;
  let maxLen = 4;
  for (const { id } of docs) {
    const m = id.match(/^APT(\d+)$/);
    if (!m) continue;
    const n = Number(m[1]);
    if (n > maxNum) {
      maxNum = n;
      maxLen = m[1]!.length;
    }
  }
  return "APT" + String(maxNum + 1).padStart(Math.max(4, maxLen), "0");
}

async function joinPatientNames(rows: Appointment[]) {
  if (rows.length === 0) return [];
  const db = await connectDB();
  const patientIds = Array.from(new Set(rows.map((r) => r.patientId)));
  const patients = await db
    .collection<Patient>("patients")
    .find(
      { id: { $in: patientIds } },
      { projection: { id: 1, name: 1, _id: 0 } }
    )
    .toArray();
  const nameById = new Map(patients.map((p) => [p.id, p.name]));
  return rows.map((a) => ({
    id: a.id,
    patientId: a.patientId,
    patientName: nameById.get(a.patientId) ?? null,
    doctorId: a.doctorId,
    scheduledAt: a.scheduledAt,
    reason: a.reason,
    status: a.status,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  }));
}

export async function appointmentsRoutes(app: FastifyInstance) {
  // GET /appointments — doctor: own; manager: all
  app.get(
    "/appointments",
    { preHandler: [verifyAuth, requireRole("doctor", "manager")] },
    async (req) => {
      const db = await connectDB();
      const filter: Record<string, unknown> =
        req.authRole === "doctor" && req.doctor
          ? { doctorId: req.doctor.id }
          : {};
      const rows = await db
        .collection<Appointment>("appointments")
        .find(filter)
        .sort({ scheduledAt: 1 })
        .toArray();
      return joinPatientNames(rows);
    }
  );

  // POST /appointments — doctor only (creates for self)
  app.post(
    "/appointments",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req, reply) => {
      const parsed = CreateSchema.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({ error: "Invalid body", details: parsed.error });
        return;
      }
      const data = parsed.data;
      if (!req.doctor) {
        reply.code(401).send({ error: "Unauthorized" });
        return;
      }
      const doctorId = data.doctorId ?? req.doctor.id;
      // doctors can only book for themselves
      if (doctorId !== req.doctor.id) {
        reply
          .code(403)
          .send({ error: "Bác sĩ chỉ tạo được lịch cho chính mình." });
        return;
      }
      const db = await connectDB();
      const patient = await db
        .collection<Patient>("patients")
        .findOne({ id: data.patientId }, { projection: { id: 1 } });
      if (!patient) {
        reply.code(404).send({ error: `Không tìm thấy bệnh nhân ${data.patientId}` });
        return;
      }
      const id = await nextAppointmentId();
      const now = new Date();
      const appointment: Appointment = {
        id,
        patientId: data.patientId,
        doctorId,
        scheduledAt:
          data.scheduledAt instanceof Date
            ? data.scheduledAt
            : new Date(data.scheduledAt),
        reason: data.reason,
        status: data.status ?? "Chờ duyệt",
        createdAt: now,
        updatedAt: now,
      };
      await db.collection<Appointment>("appointments").insertOne(appointment);
      return appointment;
    }
  );

  // PATCH /appointments/:id — doctor only (own)
  app.patch<{ Params: { id: string } }>(
    "/appointments/:id",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req, reply) => {
      const parsed = UpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({ error: "Invalid body", details: parsed.error });
        return;
      }
      if (!req.doctor) {
        reply.code(401).send({ error: "Unauthorized" });
        return;
      }
      const db = await connectDB();
      const existing = await db
        .collection<Appointment>("appointments")
        .findOne({ id: req.params.id });
      if (!existing) {
        reply.code(404).send({ error: `Không tìm thấy lịch hẹn ${req.params.id}` });
        return;
      }
      if (existing.doctorId !== req.doctor.id) {
        reply.code(403).send({ error: "Không phải lịch hẹn của bạn." });
        return;
      }
      const $set: Record<string, unknown> = { updatedAt: new Date() };
      const data = parsed.data;
      if (data.patientId !== undefined) $set.patientId = data.patientId;
      if (data.reason !== undefined) $set.reason = data.reason;
      if (data.status !== undefined) $set.status = data.status;
      if (data.scheduledAt !== undefined) {
        $set.scheduledAt =
          data.scheduledAt instanceof Date
            ? data.scheduledAt
            : new Date(data.scheduledAt);
      }
      await db
        .collection<Appointment>("appointments")
        .updateOne({ id: req.params.id }, { $set });
      const updated = await db
        .collection<Appointment>("appointments")
        .findOne({ id: req.params.id }, { projection: { _id: 0 } });
      return updated;
    }
  );

  // DELETE /appointments/:id — doctor only (own)
  app.delete<{ Params: { id: string } }>(
    "/appointments/:id",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req, reply) => {
      if (!req.doctor) {
        reply.code(401).send({ error: "Unauthorized" });
        return;
      }
      const db = await connectDB();
      const existing = await db
        .collection<Appointment>("appointments")
        .findOne({ id: req.params.id });
      if (!existing) {
        reply.code(404).send({ error: `Không tìm thấy lịch hẹn ${req.params.id}` });
        return;
      }
      if (existing.doctorId !== req.doctor.id) {
        reply.code(403).send({ error: "Không phải lịch hẹn của bạn." });
        return;
      }
      await db
        .collection<Appointment>("appointments")
        .deleteOne({ id: req.params.id });
      return { ok: true, deleted: req.params.id };
    }
  );
}
