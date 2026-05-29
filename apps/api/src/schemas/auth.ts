import { z } from "zod";

export const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// Đăng ký công khai — CHỈ tạo tài khoản bệnh nhân (bác sĩ/chuyên gia do quản lý cấp thủ công).
export const RegisterSchema = z.object({
  username: z
    .string()
    .min(3, "Tên đăng nhập phải có ít nhất 3 ký tự.")
    .max(30, "Tên đăng nhập tối đa 30 ký tự.")
    .regex(
      /^[a-z0-9._]+$/,
      "Tên đăng nhập chỉ gồm chữ thường, số, dấu chấm hoặc gạch dưới."
    ),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự."),
  name: z.string().min(1, "Vui lòng nhập họ tên."),
  age: z.number().int().nonnegative("Tuổi không hợp lệ."),
  gender: z.enum(["Nam", "Nữ"]),
  ward: z.string().min(1, "Vui lòng nhập phường/xã."),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

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
