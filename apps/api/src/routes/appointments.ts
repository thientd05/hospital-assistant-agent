import type { FastifyInstance } from "fastify";
import { verifyAuth, requireRole } from "@pr_hospitalagent/api-shared";
import {
  AppointmentUpdateSchema,
  AppointmentPatientCreateSchema,
} from "../schemas/appointment.ts";
import { parseBody } from "../lib/validate.ts";
import { appointmentService } from "../services/appointment.service.ts";
import { UnauthorizedError } from "../lib/errors.ts";

export async function appointmentsRoutes(app: FastifyInstance) {
  app.get(
    "/appointments",
    { preHandler: [verifyAuth, requireRole("doctor", "manager", "patient")] },
    async (req) => {
      if (req.authRole === "patient" && req.patient) {
        return appointmentService.list({ patientId: req.patient.id });
      }
      if (req.authRole === "doctor" && req.doctor) {
        // Bác sĩ thấy lịch của mình + hàng chờ chung (để nhận).
        return appointmentService.list({
          doctorId: req.doctor.id,
          includePool: true,
        });
      }
      // manager: toàn bộ.
      return appointmentService.list({});
    }
  );

  // Chỉ bệnh nhân tự đặt lịch. Bác sĩ không tạo lịch (chỉ duyệt/nhận từ hàng chờ).
  app.post(
    "/appointments",
    { preHandler: [verifyAuth, requireRole("patient")] },
    async (req) => {
      if (!req.patient) throw new UnauthorizedError();
      return appointmentService.createForPatient(
        req.patient.id,
        parseBody(AppointmentPatientCreateSchema, req.body)
      );
    }
  );

  // Bác sĩ duyệt/nhận lịch (Chờ duyệt → Đã duyệt). Dùng cho cả lịch hàng chờ chung.
  app.post<{ Params: { id: string } }>(
    "/appointments/:id/accept",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req) => {
      if (!req.doctor) throw new UnauthorizedError();
      return appointmentService.accept(req.doctor.id, req.params.id);
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
