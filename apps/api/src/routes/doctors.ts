import type { FastifyInstance } from "fastify";
import { verifyAuth, requireRole } from "@pr_hospitalagent/api-shared";
import {
  DoctorCreateSchema,
  DoctorUpdateSchema,
} from "../schemas/doctor.ts";
import { parseBody } from "../lib/validate.ts";
import { doctorService } from "../services/doctor.service.ts";

export async function doctorsRoutes(app: FastifyInstance) {
  app.get(
    "/doctors",
    { preHandler: [verifyAuth, requireRole("doctor", "manager")] },
    async () => {
      const doctors = await doctorService.list();
      return { count: doctors.length, doctors };
    }
  );

  app.get<{ Params: { id: string } }>(
    "/doctors/:id",
    { preHandler: [verifyAuth, requireRole("doctor", "manager")] },
    async (req) => doctorService.get(req.params.id)
  );

  app.post(
    "/doctors",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req) => doctorService.create(parseBody(DoctorCreateSchema, req.body))
  );

  app.patch<{ Params: { id: string } }>(
    "/doctors/:id",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req) =>
      doctorService.update(req.params.id, parseBody(DoctorUpdateSchema, req.body))
  );

  app.delete<{ Params: { id: string } }>(
    "/doctors/:id",
    { preHandler: [verifyAuth, requireRole("manager")] },
    async (req) => doctorService.delete(req.params.id)
  );
}
