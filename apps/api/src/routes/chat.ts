import type { FastifyInstance } from "fastify";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { connectDB } from "../db/client.ts";
import { runAgentLoop } from "../agent/loop.ts";
import { verifyAuth } from "../auth/middleware.ts";

const BodySchema = z.object({
  conversationId: z.string().nullish(),
  message: z.string().min(1),
  model: z.enum(["haiku", "sonnet"]).optional().default("haiku"),
});

type StoredMessage = Anthropic.MessageParam;

type ConversationDoc = {
  id: string;
  title: string;
  doctorId?: string;
  patientId?: string;
  messages: StoredMessage[];
  createdAt: Date;
  updatedAt: Date;
};

function sse(reply: any, payload: unknown) {
  reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function chatRoutes(app: FastifyInstance) {
  app.post("/chat", { preHandler: verifyAuth }, async (req, reply) => {
    const parsed = BodySchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400).send({ error: "Invalid body", details: parsed.error });
      return;
    }
    const { conversationId, message, model } = parsed.data;
    const ownerId = req.doctor?.id ?? req.manager?.id ?? req.patient?.id;
    if (!ownerId || !req.authRole) {
      reply.code(401).send({ error: "Unauthorized" });
      return;
    }
    const doctorId = ownerId;
    const role = req.authRole;

    reply.header("Content-Type", "text/event-stream");
    reply.header("Cache-Control", "no-cache");
    reply.header("Connection", "keep-alive");
    reply.hijack();
    for (const [k, v] of Object.entries(reply.getHeaders())) {
      if (v !== undefined) reply.raw.setHeader(k, v as string | string[]);
    }
    reply.raw.writeHead(200);

    const db = await connectDB();
    const conversations = db.collection<ConversationDoc>("conversations");

    let convoId = conversationId;
    let history: StoredMessage[] = [];
    let existing: ConversationDoc | null = null;
    if (convoId) {
      existing = await conversations.findOne({ id: convoId, doctorId });
      if (existing) history = existing.messages ?? [];
    }
    if (!convoId) {
      convoId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }

    const userMsg: StoredMessage = { role: "user", content: message };
    const messages: StoredMessage[] = [...history, userMsg];

    try {
      const finalMessages = await runAgentLoop(
        messages,
        model,
        (text) => sse(reply, { type: "text", content: text }),
        (tc) =>
          sse(reply, {
            type: "tool_call",
            id: tc.id,
            name: tc.name,
            input: tc.input,
            status: tc.status,
            result: tc.result,
          }),
        doctorId,
        role
      );

      sse(reply, { type: "done", conversationId: convoId });

      const now = new Date();
      await conversations.updateOne(
        { id: convoId },
        {
          $set: {
            id: convoId,
            doctorId,
            title: existing?.title ?? message.slice(0, 60),
            messages: finalMessages,
            updatedAt: now,
          },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      sse(reply, { type: "error", message: msg });
      app.log.error({ err }, "chat handler failed");
    } finally {
      reply.raw.end();
    }
  });
}
