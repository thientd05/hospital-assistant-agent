import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  Doctor,
  DoctorPublic,
  Expert,
  ExpertPublic,
  Manager,
  ManagerPublic,
  Patient,
  PatientPublic,
} from "@pr_hospitalagent/types";
import { connectDB } from "../db/client.ts";
import {
  ensureDoctorWorkspace,
  ensureExpertWorkspace,
  ensureManagerWorkspace,
  ensurePatientWorkspace,
} from "../agent/workspace.ts";

export type AuthRole = "doctor" | "manager" | "patient" | "expert";

declare module "fastify" {
  interface FastifyRequest {
    doctor?: DoctorPublic;
    manager?: ManagerPublic;
    patient?: PatientPublic;
    expert?: ExpertPublic;
    authRole?: AuthRole;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; role: AuthRole };
    user: { sub: string; role: AuthRole; iat: number; exp: number };
  }
}

export async function verifyAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    reply.code(401).send({ error: "Unauthorized" });
    return reply;
  }

  const { sub, role } = req.user;
  const db = await connectDB();

  if (role === "patient") {
    const patient = await db
      .collection<Patient>("patients")
      .findOne({ id: sub }, { projection: { _id: 0, passwordHash: 0 } });
    if (!patient) {
      reply.code(401).send({ error: "Unauthorized" });
      return reply;
    }

    try {
      const ensured = ensurePatientWorkspace(patient.id);
      if (!ensured.alreadyComplete) {
        req.log.info(
          {
            patientId: patient.id,
            createdDir: ensured.createdDir,
            createdFiles: ensured.createdFiles,
          },
          "Bootstrapped patient workspace"
        );
      }
    } catch (err) {
      req.log.error(
        { err, patientId: patient.id },
        "Failed to bootstrap patient workspace"
      );
    }

    req.patient = patient as PatientPublic;
    req.authRole = "patient";
    return;
  }

  if (role === "manager") {
    const manager = await db
      .collection<Manager>("managers")
      .findOne({ id: sub }, { projection: { _id: 0, passwordHash: 0 } });
    if (!manager) {
      reply.code(401).send({ error: "Unauthorized" });
      return reply;
    }

    try {
      const ensured = ensureManagerWorkspace(manager.id);
      if (!ensured.alreadyComplete) {
        req.log.info(
          {
            managerId: manager.id,
            createdDir: ensured.createdDir,
            createdFiles: ensured.createdFiles,
          },
          "Bootstrapped manager workspace"
        );
      }
    } catch (err) {
      req.log.error(
        { err, managerId: manager.id },
        "Failed to bootstrap manager workspace"
      );
    }

    req.manager = manager as ManagerPublic;
    req.authRole = "manager";
    return;
  }

  if (role === "expert") {
    const expert = await db
      .collection<Expert>("experts")
      .findOne({ id: sub }, { projection: { _id: 0, passwordHash: 0 } });
    if (!expert) {
      reply.code(401).send({ error: "Unauthorized" });
      return reply;
    }

    try {
      const ensured = ensureExpertWorkspace(expert.id);
      if (!ensured.alreadyComplete) {
        req.log.info(
          {
            expertId: expert.id,
            createdDir: ensured.createdDir,
            createdFiles: ensured.createdFiles,
          },
          "Bootstrapped expert workspace"
        );
      }
    } catch (err) {
      req.log.error(
        { err, expertId: expert.id },
        "Failed to bootstrap expert workspace"
      );
    }

    req.expert = expert as ExpertPublic;
    req.authRole = "expert";
    return;
  }

  const doctor = await db
    .collection<Doctor>("doctors")
    .findOne({ id: sub }, { projection: { _id: 0, passwordHash: 0 } });

  if (!doctor) {
    reply.code(401).send({ error: "Unauthorized" });
    return reply;
  }

  try {
    const ensured = ensureDoctorWorkspace(doctor.id);
    if (!ensured.alreadyComplete) {
      req.log.info(
        {
          doctorId: doctor.id,
          createdDir: ensured.createdDir,
          createdFiles: ensured.createdFiles,
        },
        "Bootstrapped doctor workspace"
      );
    }
  } catch (err) {
    req.log.error(
      { err, doctorId: doctor.id },
      "Failed to bootstrap doctor workspace"
    );
  }

  req.doctor = doctor as DoctorPublic;
  req.authRole = "doctor";
}

