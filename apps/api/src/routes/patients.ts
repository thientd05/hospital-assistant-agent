import type { FastifyInstance } from "fastify";
import { verifyAuth, requireRole } from "@pr_hospitalagent/api-shared";
import {
  PatientUpdateSchema,
  LabSchema,
  HomeVitalSchema,
} from "../schemas/patient.ts";
import { parseBody } from "../lib/validate.ts";
import { patientService } from "../services/patient.service.ts";
import { doctorRepo } from "../repositories/doctor.repo.ts";
import { UnauthorizedError } from "../lib/errors.ts";

export async function patientsRoutes(app: FastifyInstance) {
  // --- Bệnh nhân tự phục vụ (id lấy từ JWT, KHÔNG qua :id) ---
  app.get(
    "/me/managing-doctors",
    { preHandler: [verifyAuth, requireRole("patient")] },
    async (req) => {
      if (!req.patient) throw new UnauthorizedError();
      const doctors = await doctorRepo.listManaging(req.patient.id);
      return { count: doctors.length, doctors };
    }
  );

  app.get(
    "/me/labs",
    { preHandler: [verifyAuth, requireRole("patient")] },
    async (req) => {
      if (!req.patient) throw new UnauthorizedError();
      return patientService.listLabs(req.patient.id);
    }
  );

  app.get(
    "/me/home-vitals",
    { preHandler: [verifyAuth, requireRole("patient")] },
    async (req) => {
      if (!req.patient) throw new UnauthorizedError();
      return patientService.listHomeVitals(req.patient.id);
    }
  );

  app.post(
    "/me/home-vitals",
    { preHandler: [verifyAuth, requireRole("patient")] },
    async (req) => {
      if (!req.patient) throw new UnauthorizedError();
      return patientService.addHomeVital(
        req.patient.id,
        parseBody(HomeVitalSchema, req.body)
      );
    }
  );

  // --- Bác sĩ / quản lý ---
  app.get(
    "/patients",
    { preHandler: [verifyAuth, requireRole("doctor", "manager")] },
    async (req) => {
      // Bác sĩ chỉ thấy BN mình quản lý; manager thấy toàn bộ.
      const doctorId =
        req.authRole === "doctor" && req.doctor ? req.doctor.id : undefined;
      const patients = await patientService.list({ doctorId });
      return { count: patients.length, patients };
    }
  );

  app.get<{ Params: { id: string } }>(
    "/patients/:id",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req) => {
      await patientService.assertManagedBy(req.doctor!.id, req.params.id);
      return patientService.get(req.params.id);
    }
  );

  app.patch<{ Params: { id: string } }>(
    "/patients/:id",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req) => {
      await patientService.assertManagedBy(req.doctor!.id, req.params.id);
      return patientService.update(
        req.params.id,
        parseBody(PatientUpdateSchema, req.body)
      );
    }
  );

  // Nested labs
  app.get<{ Params: { id: string } }>(
    "/patients/:id/labs",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req) => {
      await patientService.assertManagedBy(req.doctor!.id, req.params.id);
      return patientService.listLabs(req.params.id);
    }
  );

  app.post<{ Params: { id: string } }>(
    "/patients/:id/labs",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req) => {
      await patientService.assertManagedBy(req.doctor!.id, req.params.id);
      return patientService.addLab(
        req.params.id,
        parseBody(LabSchema, req.body)
      );
    }
  );

  app.delete<{ Params: { id: string; index: string } }>(
    "/patients/:id/labs/:index",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req) => {
      await patientService.assertManagedBy(req.doctor!.id, req.params.id);
      return patientService.removeLab(req.params.id, req.params.index);
    }
  );
}
