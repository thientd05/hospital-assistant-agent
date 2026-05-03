import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import Anthropic from "@anthropic-ai/sdk";
import { connectDB } from "../db/client.ts";
import { verifyAuth } from "../auth/middleware.ts";
import type { Message, ToolCall } from "@pr_hospitalagent/types";

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

function ownerId(req: FastifyRequest): string | null {
  return req.doctor?.id ?? req.manager?.id ?? req.patient?.id ?? null;
}

function unauthorized(reply: FastifyReply) {
  reply.code(401).send({ error: "Unauthorized" });
}

function toolResultText(
  content: Anthropic.ToolResultBlockParam["content"]
): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((b) => {
      if (typeof b === "string") return b;
      if (b && typeof b === "object" && "type" in b && b.type === "text") {
        return (b as { text?: string }).text ?? "";
      }
      return "";
    })
    .join("");
}

function collectToolResults(stored: StoredMessage[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const msg of stored) {
    if (msg.role !== "user" || typeof msg.content === "string") continue;
    for (const block of msg.content) {
      if (block.type === "tool_result") {
        out.set(block.tool_use_id, toolResultText(block.content));
      }
    }
  }
  return out;
}

function convertMessages(
  stored: StoredMessage[],
  fallbackDate: Date
): Message[] {
  const results = collectToolResults(stored);
  const out: Message[] = [];
  let counter = 0;
  const nextId = () => `msg_${counter++}`;

  for (const msg of stored) {
    if (msg.role === "user") {
      if (typeof msg.content === "string") {
        out.push({
          id: nextId(),
          role: "user",
          content: msg.content,
          createdAt: fallbackDate,
        });
        continue;
      }
      const text = msg.content
        .filter(
          (b): b is Anthropic.TextBlockParam =>
            typeof b === "object" && b !== null && "type" in b && b.type === "text"
        )
        .map((b) => b.text)
        .join("");
      if (text) {
        out.push({
          id: nextId(),
          role: "user",
          content: text,
          createdAt: fallbackDate,
        });
      }
      // pure tool_result user messages are skipped — they're folded into the
      // preceding assistant message's toolCalls.
      continue;
    }

    // assistant
    let text = "";
    const toolCalls: ToolCall[] = [];
    if (typeof msg.content === "string") {
      text = msg.content;
    } else {
      for (const block of msg.content) {
        if (block.type === "text") {
          text += block.text;
        } else if (block.type === "tool_use") {
          const result = results.get(block.id);
          toolCalls.push({
            id: block.id,
            name: block.name,
            input: block.input as Record<string, unknown>,
            result,
            status: "done",
          });
        }
      }
    }
    out.push({
      id: nextId(),
      role: "assistant",
      content: text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      createdAt: fallbackDate,
    });
  }

  return out;
}

export async function conversationsRoutes(app: FastifyInstance) {
  app.get("/conversations", { preHandler: verifyAuth }, async (req, reply) => {
    const id = ownerId(req);
    if (!id) return unauthorized(reply);
    const db = await connectDB();
    const collection = db.collection<ConversationDoc>("conversations");
    const docs = await collection
      .find(
        { doctorId: id },
        {
          projection: { _id: 0, id: 1, title: 1, updatedAt: 1, patientId: 1 },
        }
      )
      .sort({ updatedAt: -1 })
      .toArray();
    return { conversations: docs };
  });

  app.get<{ Params: { id: string } }>(
    "/conversations/:id",
    { preHandler: verifyAuth },
    async (req, reply) => {
      const owner = ownerId(req);
      if (!owner) return unauthorized(reply);
      const db = await connectDB();
      const collection = db.collection<ConversationDoc>("conversations");
      const doc = await collection.findOne(
        { id: req.params.id, doctorId: owner },
        { projection: { _id: 0 } }
      );
      if (!doc) {
        reply.code(404).send({ error: "Conversation not found" });
        return;
      }
      return {
        id: doc.id,
        title: doc.title,
        patientId: doc.patientId,
        messages: convertMessages(doc.messages ?? [], doc.createdAt),
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/conversations/:id",
    { preHandler: verifyAuth },
    async (req, reply) => {
      const owner = ownerId(req);
      if (!owner) return unauthorized(reply);
      const db = await connectDB();
      const collection = db.collection<ConversationDoc>("conversations");
      const result = await collection.deleteOne({
        id: req.params.id,
        doctorId: owner,
      });
      if (result.deletedCount === 0) {
        reply.code(404).send({ error: "Conversation not found" });
        return;
      }
      return { ok: true };
    }
  );
}
