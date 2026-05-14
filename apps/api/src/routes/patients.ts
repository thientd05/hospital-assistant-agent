import type { FastifyInstance } from "fastify";
import { verifyAuth, requireRole } from "@pr_hospitalagent/api-shared";
import {
  PatientCreateSchema,
  PatientUpdateSchema,
  LabSchema,
} from "../schemas/patient.ts";
import { parseBody } from "../lib/validate.ts";
import { patientService } from "../services/patient.service.ts";

export async function patientsRoutes(app: FastifyInstance) {
  app.get(
    "/patients",
    { preHandler: [verifyAuth, requireRole("doctor", "manager")] },
    async () => {
      const patients = await patientService.list();
      return { count: patients.length, patients };
    }
  );

  app.get<{ Params: { id: string } }>(
    "/patients/:id",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req) => patientService.get(req.params.id)
  );

  app.post(
    "/patients",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req) => patientService.create(parseBody(PatientCreateSchema, req.body))
  );

  app.patch<{ Params: { id: string } }>(
    "/patients/:id",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req) =>
      patientService.update(req.params.id, parseBody(PatientUpdateSchema, req.body))
  );

  app.delete<{ Params: { id: string } }>(
    "/patients/:id",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req) => patientService.delete(req.params.id)
  );

  // Nested labs
  app.get<{ Params: { id: string } }>(
    "/patients/:id/labs",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req) => patientService.listLabs(req.params.id)
  );

  app.post<{ Params: { id: string } }>(
    "/patients/:id/labs",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req) =>
      patientService.addLab(req.params.id, parseBody(LabSchema, req.body))
  );

  app.delete<{ Params: { id: string; index: string } }>(
    "/patients/:id/labs/:index",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req) =>
      patientService.removeLab(req.params.id, req.params.index)
  );
}
