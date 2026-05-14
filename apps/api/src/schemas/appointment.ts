import { z } from "zod";
import { DateLike } from "./common.ts";

export const AppointmentStatusEnum = z.enum([
  "Chờ duyệt",
  "Đã duyệt",
  "Thành công",
]);

export const AppointmentCreateSchema = z.object({
  patientId: z.string().min(1),
  doctorId: z.string().min(1).optional(),
  scheduledAt: DateLike,
  reason: z.string().min(1),
  status: AppointmentStatusEnum.optional(),
});

export const AppointmentUpdateSchema = z
  .object({
    patientId: z.string().min(1).optional(),
    scheduledAt: DateLike.optional(),
    reason: z.string().min(1).optional(),
    status: AppointmentStatusEnum.optional(),
  })
  .strict();

export type AppointmentCreate = z.infer<typeof AppointmentCreateSchema>;
export type AppointmentUpdate = z.infer<typeof AppointmentUpdateSchema>;
