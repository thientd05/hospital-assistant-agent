import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type {
  LabResult,
  Patient,
  PatientPublic,
} from "@pr_hospitalagent/types";
import { connectDB } from "../db/client.ts";
import { verifyAuth } from "../auth/middleware.ts";
import { requireRole } from "../auth/role-guard.ts";
import { hashPassword } from "../auth/password.ts";

const VITAL_DEFAULTS = {
  spO2: 0,
  heartRate: 0,
  bloodPressure: "",
  temperature: 0,
};

const VitalSchema = z
  .object({
    spO2: z.number().optional(),
    heartRate: z.number().optional(),
    bloodPressure: z.string().optional(),
    temperature: z.number().optional(),
  })
  .partial();

const LabSchema = z.object({
  name: z.string().min(1),
  value: z.union([z.string(), z.number()]),
  unit: z.string(),
  referenceRange: z.string(),
  isAbnormal: z.boolean(),
  recordedAt: z
    .union([z.string(), z.date()])
    .optional()
    .transform((v) => {
      if (!v) return new Date();
      return v instanceof Date ? v : new Date(v);
    }),
});

const CreateSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().nonnegative(),
  gender: z.enum(["Nam", "Nữ"]),
  ward: z.string().min(1),
  diagnoses: z.array(z.string()).optional().default([]),
  medications: z.array(z.string()).optional().default([]),
  vitals: VitalSchema.optional(),
});

const UpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    age: z.number().int().nonnegative().optional(),
    gender: z.enum(["Nam", "Nữ"]).optional(),
    ward: z.string().min(1).optional(),
    diagnoses: z.array(z.string()).optional(),
    medications: z.array(z.string()).optional(),
    vitals: VitalSchema.optional(),
  })
  .strict();

async function nextPatientId(): Promise<string> {
  const db = await connectDB();
  const docs = await db
    .collection<{ id: string }>("patients")
    .find({ id: { $regex: "^BN\\d+$" } }, { projection: { id: 1, _id: 0 } })
    .toArray();
  let maxNum = 0;
  let maxLen = 3;
  for (const { id } of docs) {
    const m = id.match(/^BN(\d+)$/);
    if (!m) continue;
    const n = Number(m[1]);
    if (n > maxNum) {
      maxNum = n;
      maxLen = m[1]!.length;
    }
  }
  const next = maxNum + 1;
  return "BN" + String(next).padStart(Math.max(3, maxLen), "0");
}

export async function patientsRoutes(app: FastifyInstance) {
  // GET /patients — list (doctor + manager)
  app.get(
    "/patients",
    { preHandler: [verifyAuth, requireRole("doctor", "manager")] },
    async () => {
      const db = await connectDB();
      const docs = await db
        .collection<Patient>("patients")
        .find(
          {},
          {
            projection: {
              _id: 0,
              id: 1,
              name: 1,
              age: 1,
              gender: 1,
              ward: 1,
              diagnoses: 1,
            },
          }
        )
        .sort({ id: -1 })
        .toArray();
      return { count: docs.length, patients: docs };
    }
  );

  // GET /patients/:id — full record (doctor only)
  app.get<{ Params: { id: string } }>(
    "/patients/:id",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req, reply) => {
      const db = await connectDB();
      const patient = await db
        .collection<Patient>("patients")
        .findOne(
          { id: req.params.id },
          { projection: { _id: 0, passwordHash: 0 } }
        );
      if (!patient) {
        reply.code(404).send({ error: `Không tìm thấy bệnh nhân ${req.params.id}` });
        return;
      }
      return patient as PatientPublic;
    }
  );

  // POST /patients — create (doctor only)
  app.post(
    "/patients",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req, reply) => {
      const parsed = CreateSchema.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({ error: "Invalid body", details: parsed.error });
        return;
      }
      const data = parsed.data;
      const id = await nextPatientId();
      const username = id.toLowerCase();
      const password = `matkhau${username}`;
      const patient: Patient = {
        id,
        username,
        passwordHash: hashPassword(password),
        name: data.name,
        age: data.age,
        gender: data.gender,
        ward: data.ward,
        diagnoses: data.diagnoses ?? [],
        medications: data.medications ?? [],
        vitals: {
          ...VITAL_DEFAULTS,
          ...(data.vitals ?? {}),
          recordedAt: new Date(),
        },
        labResults: [],
      };
      const db = await connectDB();
      await db.collection<Patient>("patients").insertOne(patient);
      const { passwordHash, ...rest } = patient;
      return rest;
    }
  );

  // PATCH /patients/:id — partial update (doctor only)
  app.patch<{ Params: { id: string } }>(
    "/patients/:id",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req, reply) => {
      const parsed = UpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({ error: "Invalid body", details: parsed.error });
        return;
      }
      const $set: Record<string, unknown> = {};
      const data = parsed.data;
      if (data.name !== undefined) $set.name = data.name;
      if (data.age !== undefined) $set.age = data.age;
      if (data.gender !== undefined) $set.gender = data.gender;
      if (data.ward !== undefined) $set.ward = data.ward;
      if (data.diagnoses !== undefined) $set.diagnoses = data.diagnoses;
      if (data.medications !== undefined) $set.medications = data.medications;
      if (data.vitals) {
        for (const [k, v] of Object.entries(data.vitals)) {
          $set[`vitals.${k}`] = v;
        }
        $set["vitals.recordedAt"] = new Date();
      }
      if (Object.keys($set).length === 0) {
        reply.code(400).send({ error: "Không có trường nào để cập nhật." });
        return;
      }
      const db = await connectDB();
      const res = await db
        .collection<Patient>("patients")
        .updateOne({ id: req.params.id }, { $set });
      if (res.matchedCount === 0) {
        reply.code(404).send({ error: `Không tìm thấy bệnh nhân ${req.params.id}` });
        return;
      }
      const updated = await db
        .collection<Patient>("patients")
        .findOne(
          { id: req.params.id },
          { projection: { _id: 0, passwordHash: 0 } }
        );
      return updated as PatientPublic;
    }
  );

  // DELETE /patients/:id (doctor only)
  app.delete<{ Params: { id: string } }>(
    "/patients/:id",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req, reply) => {
      const db = await connectDB();
      const res = await db
        .collection<Patient>("patients")
        .deleteOne({ id: req.params.id });
      if (res.deletedCount === 0) {
        reply.code(404).send({ error: `Không tìm thấy bệnh nhân ${req.params.id}` });
        return;
      }
      return { ok: true, deleted: req.params.id };
    }
  );

  // GET /patients/:id/labs — embedded labResults
  app.get<{ Params: { id: string } }>(
    "/patients/:id/labs",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req, reply) => {
      const db = await connectDB();
      const patient = await db
        .collection<Patient>("patients")
        .findOne(
          { id: req.params.id },
          { projection: { _id: 0, id: 1, name: 1, labResults: 1 } }
        );
      if (!patient) {
        reply.code(404).send({ error: `Không tìm thấy bệnh nhân ${req.params.id}` });
        return;
      }
      return {
        patientId: patient.id,
        patientName: patient.name,
        labResults: patient.labResults ?? [],
      };
    }
  );

  // POST /patients/:id/labs — append lab result
  app.post<{ Params: { id: string } }>(
    "/patients/:id/labs",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req, reply) => {
      const parsed = LabSchema.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({ error: "Invalid body", details: parsed.error });
        return;
      }
      const lab: LabResult = parsed.data as LabResult;
      const db = await connectDB();
      const res = await db
        .collection<Patient>("patients")
        .updateOne({ id: req.params.id }, { $push: { labResults: lab } });
      if (res.matchedCount === 0) {
        reply.code(404).send({ error: `Không tìm thấy bệnh nhân ${req.params.id}` });
        return;
      }
      return { ok: true, lab };
    }
  );

  // DELETE /patients/:id/labs/:index — remove lab by index in array
  app.delete<{ Params: { id: string; index: string } }>(
    "/patients/:id/labs/:index",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req, reply) => {
      const idx = Number(req.params.index);
      if (!Number.isInteger(idx) || idx < 0) {
        reply.code(400).send({ error: "index không hợp lệ" });
        return;
      }
      const db = await connectDB();
      const patient = await db
        .collection<Patient>("patients")
        .findOne({ id: req.params.id }, { projection: { labResults: 1 } });
      if (!patient) {
        reply.code(404).send({ error: `Không tìm thấy bệnh nhân ${req.params.id}` });
        return;
      }
      const labs = patient.labResults ?? [];
      if (idx >= labs.length) {
        reply.code(404).send({ error: `Lab index ${idx} ngoài phạm vi` });
        return;
      }
      const newLabs = labs.filter((_, i) => i !== idx);
      await db
        .collection<Patient>("patients")
        .updateOne({ id: req.params.id }, { $set: { labResults: newLabs } });
      return { ok: true, removedIndex: idx };
    }
  );
}
