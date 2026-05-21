import type { FastifyInstance } from "fastify";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import {
  connectDB,
  requireRole,
  verifyAuth,
} from "@pr_hospitalagent/api-shared";
import { runAgentLoop } from "../agent/loop.ts";
import { getRefreshTarget } from "../agent/tool-refresh-map.ts";
import {
  createPanelClient,
  resolvePanelCommand,
} from "../agent/panel-bridge.ts";

const BodySchema = z.object({
  conversationId: z.string().nullish(),
  message: z.string().min(1),
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
  app.post(
    "/chat",
    {
      preHandler: [verifyAuth, requireRole("doctor", "patient")],
    },
    async (req, reply) => {
    const parsed = BodySchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400).send({ error: "Invalid body", details: parsed.error });
      return;
    }
    const { conversationId, message } = parsed.data;
    const ownerId = req.doctor?.id ?? req.patient?.id;
    if (
      !ownerId ||
      (req.authRole !== "doctor" && req.authRole !== "patient")
    ) {
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

    const panel = createPanelClient(ownerId, (frame) => sse(reply, frame));

    try {
      const finalMessages = await runAgentLoop(
        messages,
        (text) => sse(reply, { type: "text", content: text }),
        (tc) =>
          sse(reply, {
            type: "tool_call",
            id: tc.id,
            name: tc.name,
            input: tc.input,
            status: tc.status,
            result: tc.result,
            refresh: tc.status === "done" ? getRefreshTarget(tc.name) : undefined,
          }),
        doctorId,
        role,
        panel
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
    }
  );

  app.post<{ Params: { commandId: string } }>(
    "/chat/tool-callback/:commandId",
    { preHandler: [verifyAuth, requireRole("doctor", "patient")] },
    async (req, reply) => {
      const ownerId = req.doctor?.id ?? req.patient?.id;
      if (!ownerId) {
        reply.code(401).send({ error: "Unauthorized" });
        return;
      }
      const body = (req.body ?? {}) as { result?: unknown };
      const outcome = resolvePanelCommand(
        req.params.commandId,
        ownerId,
        body.result
      );
      if (outcome === "not-found") {
        reply
          .code(404)
          .send({ error: "Pending command không tồn tại hoặc đã hết hạn." });
        return;
      }
      if (outcome === "wrong-owner") {
        reply.code(403).send({ error: "Sai chủ sở hữu command." });
        return;
      }
      return { ok: true };
    }
  );
}
