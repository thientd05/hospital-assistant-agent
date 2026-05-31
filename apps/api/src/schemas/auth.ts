import { z } from "zod";

export const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// Đăng ký công khai — CHỈ tạo tài khoản bệnh nhân (bác sĩ/chuyên gia do quản lý cấp thủ công).
// Bệnh nhân chỉ cần SĐT + mật khẩu; họ tên/tuổi/giới/địa chỉ do AI thu thập sau
// trong đoạn chat hoặc bệnh nhân tự sửa trong cài đặt. SĐT là khoá đăng nhập.
export const RegisterSchema = z.object({
  phone: z
    .string()
    .min(8, "Số điện thoại không hợp lệ.")
    .regex(/^[0-9+\s.-]+$/, "Số điện thoại chỉ gồm chữ số và ký tự + - . cách."),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự."),
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
    age: z.number().int().nonnegative().optional(),
    gender: z.enum(["Nam", "Nữ"]).optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
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
