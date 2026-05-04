import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Doctor, Expert, Manager, Patient } from "@pr_hospitalagent/types";
import { connectDB } from "../db/client.ts";
import { verifyPassword } from "../auth/password.ts";
import { verifyAuth } from "../auth/middleware.ts";
import {
  ensureDoctorWorkspace,
  ensureExpertWorkspace,
  ensureManagerWorkspace,
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
      try {
        const ensured = ensureManagerWorkspace(manager.id);
        if (!ensured.alreadyComplete) {
          app.log.info(
            {
              managerId: manager.id,
              createdDir: ensured.createdDir,
              createdFiles: ensured.createdFiles,
            },
            "Bootstrapped manager workspace"
          );
        }
      } catch (err) {
        app.log.error(
          { err, managerId: manager.id },
          "Failed to bootstrap manager workspace"
        );
      }

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
      try {
        const ensured = ensureExpertWorkspace(expert.id);
        if (!ensured.alreadyComplete) {
          app.log.info(
            {
              expertId: expert.id,
              createdDir: ensured.createdDir,
              createdFiles: ensured.createdFiles,
            },
            "Bootstrapped expert workspace"
          );
        }
      } catch (err) {
        app.log.error(
          { err, expertId: expert.id },
          "Failed to bootstrap expert workspace"
        );
      }

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
}
