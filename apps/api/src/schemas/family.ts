import { z } from "zod";

// BN mời người nhà theo SĐT.
export const FamilyInviteCreateSchema = z
  .object({
    phone: z.string().trim().min(1, "Vui lòng nhập số điện thoại."),
  })
  .strict();

// Đổi tên nhóm gia đình (ai trong nhóm cũng đổi được).
export const FamilyRenameSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Tên gia đình không được để trống.")
      .max(100, "Tên gia đình tối đa 100 ký tự."),
  })
  .strict();

export type FamilyInviteCreate = z.infer<typeof FamilyInviteCreateSchema>;
export type FamilyRename = z.infer<typeof FamilyRenameSchema>;
