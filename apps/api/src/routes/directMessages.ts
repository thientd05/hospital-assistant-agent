import type { FastifyInstance } from "fastify";
import { verifyAuth, requireRole } from "@pr_hospitalagent/api-shared";
import { parseBody } from "../lib/validate.ts";
import { UnauthorizedError } from "../lib/errors.ts";
import { DirectSendSchema } from "../schemas/directMessage.ts";
import { directMessageService } from "../services/directMessage.service.ts";

export async function directMessagesRoutes(app: FastifyInstance) {
  // === Bác sĩ ↔ bệnh nhân mình quản lý ===
  app.get(
    "/direct-messages",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req) => {
      if (!req.doctor) throw new UnauthorizedError();
      return directMessageService.listForDoctor(req.doctor.id);
    }
  );

  app.get<{ Params: { patientId: string } }>(
    "/direct-messages/:patientId",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req) => {
      if (!req.doctor) throw new UnauthorizedError();
      return directMessageService.getForDoctor(
        req.doctor.id,
        req.params.patientId
      );
    }
  );

  app.post<{ Params: { patientId: string } }>(
    "/direct-messages/:patientId",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req) => {
      if (!req.doctor) throw new UnauthorizedError();
      const { message } = parseBody(DirectSendSchema, req.body);
      return directMessageService.sendFromDoctor(
        req.doctor.id,
        req.params.patientId,
        message
      );
    }
  );

  // === Bệnh nhân ↔ bác sĩ quản lý mình ===
  app.get(
    "/me/direct-messages",
    { preHandler: [verifyAuth, requireRole("patient")] },
    async (req) => {
      if (!req.patient) throw new UnauthorizedError();
      return directMessageService.listForPatient(req.patient.id);
    }
  );

  app.get<{ Params: { doctorId: string } }>(
    "/me/direct-messages/:doctorId",
    { preHandler: [verifyAuth, requireRole("patient")] },
    async (req) => {
      if (!req.patient) throw new UnauthorizedError();
      return directMessageService.getForPatient(
        req.patient.id,
        req.params.doctorId
      );
    }
  );

  app.post<{ Params: { doctorId: string } }>(
    "/me/direct-messages/:doctorId",
    { preHandler: [verifyAuth, requireRole("patient")] },
    async (req) => {
      if (!req.patient) throw new UnauthorizedError();
      const { message } = parseBody(DirectSendSchema, req.body);
      return directMessageService.sendFromPatient(
        req.patient.id,
        req.params.doctorId,
        message
      );
    }
  );
}
