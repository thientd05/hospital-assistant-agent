import { z } from "zod";
import { DateLike, PeriodSchema } from "./common.ts";

export const RevenueSourceEnum = z.enum([
  "Khám bệnh",
  "Xét nghiệm",
  "Bán thuốc",
  "Dịch vụ khác",
]);

export const RevenueCreateSchema = z.object({
  source: RevenueSourceEnum,
  period: PeriodSchema,
  amount: z.number().nonnegative(),
  date: DateLike,
  patientId: z.string().optional(),
  notes: z.string().optional(),
});

export const RevenueUpdateSchema = z
  .object({
    source: RevenueSourceEnum.optional(),
    period: PeriodSchema.optional(),
    amount: z.number().nonnegative().optional(),
    date: DateLike.optional(),
    patientId: z.string().optional(),
    notes: z.string().optional(),
  })
  .strict();

export type RevenueCreate = z.infer<typeof RevenueCreateSchema>;
export type RevenueUpdate = z.infer<typeof RevenueUpdateSchema>;
