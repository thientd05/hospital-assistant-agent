import { z } from "zod";

// Bệnh nhân chấm 1–5 sao cho một câu trả lời (lượt) của chatbot.
export const RatingSetSchema = z.object({
  stars: z.number().int().min(1).max(5),
});

export type RatingSet = z.infer<typeof RatingSetSchema>;
