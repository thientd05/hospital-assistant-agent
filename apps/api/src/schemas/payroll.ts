import { z } from "zod";
import { DateLike, PeriodSchema } from "./common.ts";

export const PayrollRoleEnum = z.enum(["doctor", "expert", "manager"]);
export const PayrollStatusEnum = z.enum(["Chưa thanh toán", "Đã thanh toán"]);

export const PayrollCreateSchema = z.object({
  employeeId: z.string().min(1),
  employeeRole: PayrollRoleEnum,
  employeeName: z.string().min(1),
  period: PeriodSchema,
  baseSalary: z.number().nonnegative(),
  bonus: z.number().nonnegative(),
  deduction: z.number().nonnegative(),
  paidDate: DateLike.nullable().optional(),
  status: PayrollStatusEnum,
  notes: z.string().optional(),
});

export const PayrollUpdateSchema = z
  .object({
    employeeId: z.string().min(1).optional(),
    employeeRole: PayrollRoleEnum.optional(),
    employeeName: z.string().min(1).optional(),
    period: PeriodSchema.optional(),
    baseSalary: z.number().nonnegative().optional(),
    bonus: z.number().nonnegative().optional(),
    deduction: z.number().nonnegative().optional(),
    paidDate: DateLike.nullable().optional(),
    status: PayrollStatusEnum.optional(),
    notes: z.string().optional(),
  })
  .strict();

export type PayrollCreate = z.infer<typeof PayrollCreateSchema>;
export type PayrollUpdate = z.infer<typeof PayrollUpdateSchema>;
