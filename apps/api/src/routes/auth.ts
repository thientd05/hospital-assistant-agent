import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Doctor, Expert, Manager, Patient } from "@pr_hospitalagent/types";
import { connectDB } from "../db/client.ts";
import { hashPassword, verifyPassword } from "../auth/password.ts";
import { verifyAuth } from "../auth/middleware.ts";
import {
  ensureDoctorWorkspace,
  ensurePatientWorkspace,
} from "../agent/workspace.ts";

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

function publicDoctor(doc: Doctor) {
  const { passwordHash, ...rest } = doc;
  return rest;
}

function publicManager(mgr: Manager) {
  const { passwordHash, ...rest } = mgr;
  return rest;
}

function publicPatient(pat: Patient) {
  const { passwordHash, ...rest } = pat;
  return rest;
}

function publicExpert(exp: Expert) {
  const { passwordHash, ...rest } = exp;
  return rest;
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", async (req, reply) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400).send({ error: "Invalid body" });
      return;
    }
    const { username, password } = parsed.data;

    const db = await connectDB();

    const doctor = await db
      .collection<Doctor>("doctors")
      .findOne({ username });
    if (doctor && verifyPassword(password, doctor.passwordHash)) {
      try {
        const ensured = ensureDoctorWorkspace(doctor.id);
        if (!ensured.alreadyComplete) {
          app.log.info(
            {
              doctorId: doctor.id,
              createdDir: ensured.createdDir,
              createdFiles: ensured.createdFiles,
            },
            "Bootstrapped doctor workspace"
          );
        }
      } catch (err) {
        app.log.error(
          { err, doctorId: doctor.id },
          "Failed to bootstrap doctor workspace"
        );
      }

      const token = app.jwt.sign(
        { sub: doctor.id, role: "doctor" },
        { expiresIn: "24h" }
      );
      return { token, role: "doctor" as const, doctor: publicDoctor(doctor) };
    }

    const manager = await db
      .collection<Manager>("managers")
      .findOne({ username });
    if (manager && verifyPassword(password, manager.passwordHash)) {
      const token = app.jwt.sign(
        { sub: manager.id, role: "manager" },
        { expiresIn: "24h" }
      );
      return {
        token,
        role: "manager" as const,
        manager: publicManager(manager),
      };
    }

    const expert = await db
      .collection<Expert>("experts")
      .findOne({ username });
    if (expert && verifyPassword(password, expert.passwordHash)) {
      const token = app.jwt.sign(
        { sub: expert.id, role: "expert" },
        { expiresIn: "24h" }
      );
      return {
        token,
        role: "expert" as const,
        expert: publicExpert(expert),
      };
    }

    const patient = await db
      .collection<Patient>("patients")
      .findOne({ username });
    if (patient && verifyPassword(password, patient.passwordHash)) {
      try {
        const ensured = ensurePatientWorkspace(patient.id);
        if (!ensured.alreadyComplete) {
          app.log.info(
            {
              patientId: patient.id,
              createdDir: ensured.createdDir,
              createdFiles: ensured.createdFiles,
            },
            "Bootstrapped patient workspace"
          );
        }
      } catch (err) {
        app.log.error(
          { err, patientId: patient.id },
          "Failed to bootstrap patient workspace"
        );
      }

      const token = app.jwt.sign(
        { sub: patient.id, role: "patient" },
        { expiresIn: "24h" }
      );
      return {
        token,
        role: "patient" as const,
        patient: publicPatient(patient),
      };
    }

    reply.code(401).send({ error: "Sai tên đăng nhập hoặc mật khẩu" });
  });

  app.get("/auth/me", { preHandler: verifyAuth }, async (req) => {
    if (req.authRole === "manager" && req.manager) {
      return { role: "manager" as const, manager: req.manager };
    }
    if (req.authRole === "patient" && req.patient) {
      return { role: "patient" as const, patient: req.patient };
    }
    if (req.authRole === "expert" && req.expert) {
      return { role: "expert" as const, expert: req.expert };
    }
    return { role: "doctor" as const, doctor: req.doctor };
  });

  app.post("/auth/logout", { preHandler: verifyAuth }, async () => ({
    ok: true,
  }));

  const DoctorProfileSchema = z
    .object({
      fullName: z.string().min(1).optional(),
      title: z.string().min(1).optional(),
      department: z.string().min(1).optional(),
      specialty: z.string().min(1).optional(),
      phone: z.string().min(1).optional(),
      email: z.string().email().optional(),
      address: z.string().min(1).optional(),
    })
    .strict();

  const ManagerProfileSchema = z
    .object({
      fullName: z.string().min(1).optional(),
      title: z.string().min(1).optional(),
      clinicName: z.string().min(1).optional(),
      phone: z.string().min(1).optional(),
      email: z.string().email().optional(),
      address: z.string().min(1).optional(),
    })
    .strict();

  const ExpertProfileSchema = z
    .object({
      fullName: z.string().min(1).optional(),
      title: z.string().min(1).optional(),
      expertise: z.string().min(1).optional(),
      phone: z.string().min(1).optional(),
      email: z.string().email().optional(),
      address: z.string().min(1).optional(),
    })
    .strict();

  const PatientProfileSchema = z
    .object({
      name: z.string().min(1).optional(),
      ward: z.string().min(1).optional(),
    })
    .strict();

  app.patch(
    "/auth/me/profile",
    { preHandler: verifyAuth },
    async (req, reply) => {
      const db = await connectDB();

      if (req.authRole === "doctor" && req.doctor) {
        const parsed = DoctorProfileSchema.safeParse(req.body);
        if (!parsed.success) {
          reply.code(400).send({ error: "Invalid body", details: parsed.error });
          return;
        }
        const $set = parsed.data;
        if (Object.keys($set).length === 0) {
          reply.code(400).send({ error: "Không có trường nào để cập nhật." });
          return;
        }
        await db
          .collection<Doctor>("doctors")
          .updateOne({ id: req.doctor.id }, { $set });
        const updated = await db
          .collection<Doctor>("doctors")
          .findOne(
            { id: req.doctor.id },
            { projection: { _id: 0, passwordHash: 0 } }
          );
        return { role: "doctor" as const, doctor: updated };
      }

      if (req.authRole === "manager" && req.manager) {
        const parsed = ManagerProfileSchema.safeParse(req.body);
        if (!parsed.success) {
          reply.code(400).send({ error: "Invalid body", details: parsed.error });
          return;
        }
        const $set = parsed.data;
        if (Object.keys($set).length === 0) {
          reply.code(400).send({ error: "Không có trường nào để cập nhật." });
          return;
        }
        await db
          .collection<Manager>("managers")
          .updateOne({ id: req.manager.id }, { $set });
        const updated = await db
          .collection<Manager>("managers")
          .findOne(
            { id: req.manager.id },
            { projection: { _id: 0, passwordHash: 0 } }
          );
        return { role: "manager" as const, manager: updated };
      }

      if (req.authRole === "expert" && req.expert) {
        const parsed = ExpertProfileSchema.safeParse(req.body);
        if (!parsed.success) {
          reply.code(400).send({ error: "Invalid body", details: parsed.error });
          return;
        }
        const $set = parsed.data;
        if (Object.keys($set).length === 0) {
          reply.code(400).send({ error: "Không có trường nào để cập nhật." });
          return;
        }
        await db
          .collection<Expert>("experts")
          .updateOne({ id: req.expert.id }, { $set });
        const updated = await db
          .collection<Expert>("experts")
          .findOne(
            { id: req.expert.id },
            { projection: { _id: 0, passwordHash: 0 } }
          );
        return { role: "expert" as const, expert: updated };
      }

      if (req.authRole === "patient" && req.patient) {
        const parsed = PatientProfileSchema.safeParse(req.body);
        if (!parsed.success) {
          reply.code(400).send({ error: "Invalid body", details: parsed.error });
          return;
        }
        const $set = parsed.data;
        if (Object.keys($set).length === 0) {
          reply.code(400).send({ error: "Không có trường nào để cập nhật." });
          return;
        }
        await db
          .collection<Patient>("patients")
          .updateOne({ id: req.patient.id }, { $set });
        const updated = await db
          .collection<Patient>("patients")
          .findOne(
            { id: req.patient.id },
            { projection: { _id: 0, passwordHash: 0 } }
          );
        return { role: "patient" as const, patient: updated };
      }

      reply.code(401).send({ error: "Unauthorized" });
    }
  );

  const PasswordChangeSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6, "Mật khẩu mới phải có ít nhất 6 ký tự."),
  });

  app.post(
    "/auth/me/password",
    { preHandler: verifyAuth },
    async (req, reply) => {
      const parsed = PasswordChangeSchema.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({
          error: parsed.error.issues[0]?.message ?? "Invalid body",
        });
        return;
      }
      const { currentPassword, newPassword } = parsed.data;
      const db = await connectDB();

      const collectionName =
        req.authRole === "doctor"
          ? "doctors"
          : req.authRole === "manager"
          ? "managers"
          : req.authRole === "expert"
          ? "experts"
          : req.authRole === "patient"
          ? "patients"
          : null;
      const id =
        req.doctor?.id ??
        req.manager?.id ??
        req.expert?.id ??
        req.patient?.id ??
        null;

      if (!collectionName || !id) {
        reply.code(401).send({ error: "Unauthorized" });
        return;
      }

      const account = await db
        .collection<{ id: string; passwordHash: string }>(collectionName)
        .findOne({ id });
      if (!account) {
        reply.code(404).send({ error: "Tài khoản không tồn tại." });
        return;
      }
      if (!verifyPassword(currentPassword, account.passwordHash)) {
        reply.code(400).send({ error: "Mật khẩu hiện tại không đúng." });
        return;
      }
      await db
        .collection(collectionName)
        .updateOne({ id }, { $set: { passwordHash: hashPassword(newPassword) } });
      return { ok: true };
    }
  );
}
