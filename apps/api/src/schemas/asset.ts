import { z } from "zod";
import { DateLike } from "./common.ts";

export const AssetCategoryEnum = z.enum([
  "Thiết bị y tế",
  "Nội thất",
  "Máy tính",
  "Khác",
]);
export const AssetConditionEnum = z.enum([
  "Tốt",
  "Bình thường",
  "Cần sửa",
  "Hỏng",
]);

export const AssetCreateSchema = z.object({
  name: z.string().min(1),
  category: AssetCategoryEnum,
  location: z.string().min(1),
  purchaseDate: DateLike,
  purchasePrice: z.number().nonnegative(),
  depreciationYears: z.number().int().nonnegative(),
  condition: AssetConditionEnum,
  notes: z.string().optional(),
});

export const AssetUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    category: AssetCategoryEnum.optional(),
    location: z.string().min(1).optional(),
    purchaseDate: DateLike.optional(),
    purchasePrice: z.number().nonnegative().optional(),
    depreciationYears: z.number().int().nonnegative().optional(),
    condition: AssetConditionEnum.optional(),
    notes: z.string().optional(),
  })
  .strict();

export type AssetCreate = z.infer<typeof AssetCreateSchema>;
export type AssetUpdate = z.infer<typeof AssetUpdateSchema>;
