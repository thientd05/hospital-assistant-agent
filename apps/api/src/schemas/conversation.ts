import { z } from "zod";

// messages = Anthropic MessageParam[]; lưu raw, không bóc tách sâu ở tầng API.
export const ConversationSaveSchema = z.object({
  title: z.string().optional(),
  messages: z.array(z.unknown()),
});

export type ConversationSave = z.infer<typeof ConversationSaveSchema>;
