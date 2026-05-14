import { z } from "zod";

export const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const DoctorProfileSchema = z
  .object({
    fullName: z.string().min(1).optional(),
    title: z.string().min(1).optional(),
    department: z.string().min(1).optional(),
    specialty: z.string().min(1).optional(),
    phone: z.string().min(1).optional(),
    email: z.string().email().optional(),
    address: z.string().min(1).optional(),
  })
  .strict();

export const ManagerProfileSchema = z
  .object({
    fullName: z.string().min(1).optional(),
    title: z.string().min(1).optional(),
    clinicName: z.string().min(1).optional(),
    phone: z.string().min(1).optional(),
    email: z.string().email().optional(),
    address: z.string().min(1).optional(),
  })
  .strict();

export const ExpertProfileSchema = z
  .object({
    fullName: z.string().min(1).optional(),
    title: z.string().min(1).optional(),
    expertise: z.string().min(1).optional(),
    phone: z.string().min(1).optional(),
    email: z.string().email().optional(),
    address: z.string().min(1).optional(),
  })
  .strict();

export const PatientProfileSchema = z
  .object({
    name: z.string().min(1).optional(),
    ward: z.string().min(1).optional(),
  })
  .strict();

export const PasswordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, "Mật khẩu mới phải có ít nhất 6 ký tự."),
});

export type DoctorProfilePatch = z.infer<typeof DoctorProfileSchema>;
export type ManagerProfilePatch = z.infer<typeof ManagerProfileSchema>;
export type ExpertProfilePatch = z.infer<typeof ExpertProfileSchema>;
export type PatientProfilePatch = z.infer<typeof PatientProfileSchema>;
