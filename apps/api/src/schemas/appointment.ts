import { z } from "zod";
import { DateLike } from "./common.ts";

export const AppointmentStatusEnum = z.enum(["Chờ duyệt", "Đã duyệt"]);

export const AppointmentUpdateSchema = z
  .object({
    patientId: z.string().min(1).optional(),
    scheduledAt: DateLike.optional(),
    reason: z.string().min(1).optional(),
    patientNote: z.string().optional(),
    status: AppointmentStatusEnum.optional(),
  })
  .strict();

// Bệnh nhân tự đặt lịch: thời gian + tóm tắt (do trợ lý ảo tổng hợp) + lời nhắn
// tuỳ chọn; doctorId tuỳ chọn (rỗng/không truyền = vào hàng chờ chung, bác sĩ nào
// duyệt trước thì nhận).
export const AppointmentPatientCreateSchema = z
  .object({
    scheduledAt: DateLike,
    // Tóm tắt từ trợ lý ảo: tuỳ chọn (rỗng khi chưa trò chuyện / chưa đủ data).
    reason: z.string().optional(),
    patientNote: z.string().optional(),
    doctorId: z.string().optional(),
  })
  .strict();

export type AppointmentUpdate = z.infer<typeof AppointmentUpdateSchema>;
export type AppointmentPatientCreate = z.infer<
  typeof AppointmentPatientCreateSchema
>;
