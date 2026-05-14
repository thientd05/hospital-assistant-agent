import type { FastifyInstance } from "fastify";
import { verifyAuth, requireRole } from "@pr_hospitalagent/api-shared";
import {
  AppointmentCreateSchema,
  AppointmentUpdateSchema,
} from "../schemas/appointment.ts";
import { parseBody } from "../lib/validate.ts";
import { appointmentService } from "../services/appointment.service.ts";
import { UnauthorizedError } from "../lib/errors.ts";

export async function appointmentsRoutes(app: FastifyInstance) {
  app.get(
    "/appointments",
    { preHandler: [verifyAuth, requireRole("doctor", "manager")] },
    async (req) => {
      const filter =
        req.authRole === "doctor" && req.doctor ? req.doctor.id : undefined;
      return appointmentService.list(filter);
    }
  );

  app.post(
    "/appointments",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req) => {
      if (!req.doctor) throw new UnauthorizedError();
      return appointmentService.create(
        req.doctor.id,
        parseBody(AppointmentCreateSchema, req.body)
      );
    }
  );

  app.patch<{ Params: { id: string } }>(
    "/appointments/:id",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req) => {
      if (!req.doctor) throw new UnauthorizedError();
      return appointmentService.update(
        req.doctor.id,
        req.params.id,
        parseBody(AppointmentUpdateSchema, req.body)
      );
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/appointments/:id",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req) => {
      if (!req.doctor) throw new UnauthorizedError();
      return appointmentService.delete(req.doctor.id, req.params.id);
    }
  );
}
