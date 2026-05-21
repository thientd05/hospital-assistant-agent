import { z } from "zod";

// messages = Anthropic MessageParam[]; lưu raw, không bóc tách sâu ở tầng API.
export const ConversationSaveSchema = z.object({
  title: z.string().optional(),
  messages: z.array(z.unknown()),
});

export const PatientReplySchema = z.object({
  message: z.string().min(1),
});

export type ConversationSave = z.infer<typeof ConversationSaveSchema>;
export type PatientReply = z.infer<typeof PatientReplySchema>;
