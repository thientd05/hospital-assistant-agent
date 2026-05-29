import { z } from "zod";
import { DateLike } from "./common.ts";

export const AppointmentStatusEnum = z.enum([
  "Chờ duyệt",
  "Đã duyệt",
  "Thành công",
]);

export const AppointmentUpdateSchema = z
  .object({
    patientId: z.string().min(1).optional(),
    scheduledAt: DateLike.optional(),
    reason: z.string().min(1).optional(),
    status: AppointmentStatusEnum.optional(),
  })
  .strict();

// Bệnh nhân tự đặt lịch: chỉ thời gian + lý do; doctorId tuỳ chọn
// (rỗng/không truyền = vào hàng chờ chung, bác sĩ nào duyệt trước thì nhận).
export const AppointmentPatientCreateSchema = z
  .object({
    scheduledAt: DateLike,
    reason: z.string().min(1),
    doctorId: z.string().optional(),
  })
  .strict();

export type AppointmentUpdate = z.infer<typeof AppointmentUpdateSchema>;
export type AppointmentPatientCreate = z.infer<
  typeof AppointmentPatientCreateSchema
>;
