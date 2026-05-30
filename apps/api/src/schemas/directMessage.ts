import { z } from "zod";

export const DirectSendSchema = z.object({
  message: z.string().min(1),
});

export type DirectSend = z.infer<typeof DirectSendSchema>;
