import type { FastifyReply, FastifyRequest } from "fastify";
import type {} from "@fastify/jwt";
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
    payload: { sub: string; role: AuthRole; type: "access" | "refresh" };
    user: {
      sub: string;
      role: AuthRole;
      // Token cũ (trước cơ chế 2-token) không có `type` → coi như access.
      type?: "access" | "refresh";
      iat: number;
      exp: number;
    };
  }
}

export async function verifyAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    reply.code(401).send({ error: "Unauthorized" });
    return reply;
  }

  // Refresh token CHỈ dùng ở /auth/refresh — không cho truy cập tài nguyên.
  if (req.user.type === "refresh") {
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

  req.doctor = doctor as DoctorPublic;
  req.authRole = "doctor";
}
