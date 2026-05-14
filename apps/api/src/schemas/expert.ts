import { z } from "zod";

export const ExpertCreateSchema = z.object({
  fullName: z.string().min(1),
  title: z.string().min(1),
  expertise: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  address: z.string().min(1),
  username: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
});

export const ExpertUpdateSchema = z
  .object({
    fullName: z.string().min(1).optional(),
    title: z.string().min(1).optional(),
    expertise: z.string().min(1).optional(),
    phone: z.string().min(1).optional(),
    email: z.string().email().optional(),
    address: z.string().min(1).optional(),
    password: z.string().min(1).optional(),
  })
  .strict();

export type ExpertCreate = z.infer<typeof ExpertCreateSchema>;
export type ExpertUpdate = z.infer<typeof ExpertUpdateSchema>;
