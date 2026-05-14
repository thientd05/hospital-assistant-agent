import { z } from "zod";

export const DoctorCreateSchema = z.object({
  fullName: z.string().min(1),
  title: z.string().min(1),
  department: z.string().min(1),
  specialty: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  address: z.string().min(1),
  username: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
});

export const DoctorUpdateSchema = z
  .object({
    fullName: z.string().min(1).optional(),
    title: z.string().min(1).optional(),
    department: z.string().min(1).optional(),
    specialty: z.string().min(1).optional(),
    phone: z.string().min(1).optional(),
    email: z.string().email().optional(),
    address: z.string().min(1).optional(),
    password: z.string().min(1).optional(),
  })
  .strict();

export type DoctorCreate = z.infer<typeof DoctorCreateSchema>;
export type DoctorUpdate = z.infer<typeof DoctorUpdateSchema>;
