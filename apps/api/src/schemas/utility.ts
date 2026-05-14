import { z } from "zod";
import { DateLike, PeriodSchema } from "./common.ts";

export const UtilityTypeEnum = z.enum(["Điện", "Nước", "Internet", "Gas"]);
export const UtilityStatusEnum = z.enum(["Chưa thanh toán", "Đã thanh toán"]);

export const UtilityCreateSchema = z.object({
  type: UtilityTypeEnum,
  period: PeriodSchema,
  amount: z.number().nonnegative(),
  usage: z.number().nonnegative(),
  unit: z.string().min(1),
  paidDate: DateLike.nullable().optional(),
  status: UtilityStatusEnum,
  notes: z.string().optional(),
});

export const UtilityUpdateSchema = z
  .object({
    type: UtilityTypeEnum.optional(),
    period: PeriodSchema.optional(),
    amount: z.number().nonnegative().optional(),
    usage: z.number().nonnegative().optional(),
    unit: z.string().min(1).optional(),
    paidDate: DateLike.nullable().optional(),
    status: UtilityStatusEnum.optional(),
    notes: z.string().optional(),
  })
  .strict();

export type UtilityCreate = z.infer<typeof UtilityCreateSchema>;
export type UtilityUpdate = z.infer<typeof UtilityUpdateSchema>;
