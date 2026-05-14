import { z } from "zod";

export const DrugCheckSchema = z.object({
  drugs: z.array(z.string().min(1)).min(1),
});

export type DrugCheckInput = z.infer<typeof DrugCheckSchema>;
