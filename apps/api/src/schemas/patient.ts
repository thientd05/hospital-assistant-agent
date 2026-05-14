import { z } from "zod";

export const VitalSchema = z
  .object({
    spO2: z.number().optional(),
    heartRate: z.number().optional(),
    bloodPressure: z.string().optional(),
    temperature: z.number().optional(),
  })
  .partial();

export const LabSchema = z.object({
  name: z.string().min(1),
  value: z.union([z.string(), z.number()]),
  unit: z.string(),
  referenceRange: z.string(),
  isAbnormal: z.boolean(),
  recordedAt: z
    .union([z.string(), z.date()])
    .optional()
    .transform((v) => {
      if (!v) return new Date();
      return v instanceof Date ? v : new Date(v);
    }),
});

export const PatientCreateSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().nonnegative(),
  gender: z.enum(["Nam", "Nữ"]),
  ward: z.string().min(1),
  diagnoses: z.array(z.string()).optional().default([]),
  medications: z.array(z.string()).optional().default([]),
  vitals: VitalSchema.optional(),
});

export const PatientUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    age: z.number().int().nonnegative().optional(),
    gender: z.enum(["Nam", "Nữ"]).optional(),
    ward: z.string().min(1).optional(),
    diagnoses: z.array(z.string()).optional(),
    medications: z.array(z.string()).optional(),
    vitals: VitalSchema.optional(),
  })
  .strict();

export type PatientCreate = z.infer<typeof PatientCreateSchema>;
export type PatientUpdate = z.infer<typeof PatientUpdateSchema>;
export type LabInput = z.infer<typeof LabSchema>;
