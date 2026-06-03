import { z } from "zod";

export const VitalSchema = z
  .object({
    spO2: z.number().optional(),
    heartRate: z.number().optional(),
    bloodPressure: z.string().optional(),
    temperature: z.number().optional(),
  })
  .partial();

// Bác sĩ CHỈ nhập tên + kết quả. Đơn vị, khoảng tham chiếu và cờ bất thường do
// server tự suy từ danh mục xét nghiệm (collection `labcatalogs`) trong service — KHÔNG nhận từ client.
export const LabSchema = z
  .object({
    name: z.string().min(1),
    value: z.union([z.string(), z.number()]),
    recordedAt: z
      .union([z.string(), z.date()])
      .optional()
      .transform((v) => {
        if (!v) return new Date();
        return v instanceof Date ? v : new Date(v);
      }),
  })
  .strict();

export const HomeVitalSchema = z
  .object({
    spO2: z.number().optional(),
    heartRate: z.number().optional(),
    bloodPressure: z.string().optional(),
    temperature: z.number().optional(),
    note: z.string().optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.spO2 !== undefined ||
      v.heartRate !== undefined ||
      v.bloodPressure !== undefined ||
      v.temperature !== undefined,
    { message: "Cần nhập ít nhất một chỉ số." }
  );

// Bác sĩ CHỈ sửa được phần lâm sàng: Khoa, chẩn đoán, thuốc, sinh hiệu.
// Thông tin cá nhân (name/age/gender/address/phone) do BỆNH NHÂN tự sửa qua
// /auth/me/profile (PatientProfileSchema); mã BN (id) không ai sửa. .strict()
// chặn lớp 2 nếu FE/agent lỡ gửi trường cấm.
export const PatientUpdateSchema = z
  .object({
    ward: z.string().min(1).optional(),
    diagnoses: z.array(z.string()).optional(),
    // Mỗi thuốc = { tên thuốc (từ danh mục), chỉ định dùng do bác sĩ tự nhập }.
    medications: z
      .array(
        z
          .object({
            name: z.string().min(1),
            instruction: z.string(),
          })
          .strict()
      )
      .optional(),
    vitals: VitalSchema.optional(),
  })
  .strict();

export type PatientUpdate = z.infer<typeof PatientUpdateSchema>;
export type LabInput = z.infer<typeof LabSchema>;
export type HomeVitalInput = z.infer<typeof HomeVitalSchema>;
