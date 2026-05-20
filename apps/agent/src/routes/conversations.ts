import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import Anthropic from "@anthropic-ai/sdk";
import {
  connectDB,
  requireRole,
  verifyAuth,
} from "@pr_hospitalagent/api-shared";
import type { Message, MessagePart, ToolCall } from "@pr_hospitalagent/types";

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
  return req.doctor?.id ?? req.patient?.id ?? null;
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

    // assistant — giữ thứ tự xen kẽ thật giữa text và tool qua `parts`.
    let text = "";
    const toolCalls: ToolCall[] = [];
    const parts: MessagePart[] = [];
    const pushText = (t: string) => {
      if (!t) return;
      const last = parts[parts.length - 1];
      if (last && last.type === "text") last.text += t;
      else parts.push({ type: "text", text: t });
    };
    if (typeof msg.content === "string") {
      text = msg.content;
      pushText(msg.content);
    } else {
      for (const block of msg.content) {
        if (block.type === "text") {
          text += block.text;
          pushText(block.text);
        } else if (block.type === "tool_use") {
          const result = results.get(block.id);
          const tc: ToolCall = {
            id: block.id,
            name: block.name,
            input: block.input as Record<string, unknown>,
            result,
            status: "done",
          };
          toolCalls.push(tc);
          parts.push({ type: "tool", toolCall: tc });
        }
      }
    }
    out.push({
      id: nextId(),
      role: "assistant",
      content: text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      parts: parts.length > 0 ? parts : undefined,
      createdAt: fallbackDate,
    });
  }

  return out;
}

export async function conversationsRoutes(app: FastifyInstance) {
  app.get(
    "/conversations",
    { preHandler: [verifyAuth, requireRole("doctor", "patient")] },
    async (req, reply) => {
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
    }
  );

  app.get(
    "/conversations/patients",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (_req, _reply) => {
      const db = await connectDB();
      const conversations = db.collection<ConversationDoc>("conversations");
      const patients = db.collection<{ id: string; name: string }>("patients");
      const docs = await conversations
        .find(
          { doctorId: { $regex: /^BN\d+$/i } },
          {
            projection: { _id: 0, id: 1, title: 1, updatedAt: 1, doctorId: 1 },
          }
        )
        .sort({ updatedAt: -1 })
        .toArray();
      const ownerIds = Array.from(
        new Set(docs.map((d) => d.doctorId).filter((x): x is string => !!x))
      );
      const owners = ownerIds.length
        ? await patients
            .find(
              { id: { $in: ownerIds } },
              { projection: { _id: 0, id: 1, name: 1 } }
            )
            .toArray()
        : [];
      const nameById = new Map(owners.map((o) => [o.id, o.name]));
      return {
        conversations: docs.map((d) => ({
          id: d.id,
          title: d.title,
          updatedAt: d.updatedAt,
          ownerId: d.doctorId,
          ownerName: d.doctorId ? nameById.get(d.doctorId) ?? null : null,
        })),
      };
    }
  );

  app.get<{ Params: { id: string } }>(
    "/conversations/patients/:id",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req, reply) => {
      const db = await connectDB();
      const conversations = db.collection<ConversationDoc>("conversations");
      const doc = await conversations.findOne(
        {
          id: req.params.id,
          doctorId: { $regex: /^BN\d+$/i },
        },
        { projection: { _id: 0 } }
      );
      if (!doc) {
        reply.code(404).send({ error: "Patient conversation not found" });
        return;
      }
      let ownerName: string | null = null;
      if (doc.doctorId) {
        const patients = db.collection<{ id: string; name: string }>(
          "patients"
        );
        const owner = await patients.findOne(
          { id: doc.doctorId },
          { projection: { _id: 0, name: 1 } }
        );
        ownerName = owner?.name ?? null;
      }
      return {
        id: doc.id,
        title: doc.title,
        ownerId: doc.doctorId ?? null,
        ownerName,
        messages: convertMessages(doc.messages ?? [], doc.createdAt),
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    }
  );

  app.post<{ Params: { id: string }; Body: { message?: unknown } }>(
    "/conversations/patients/:id/reply",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req, reply) => {
      const raw = (req.body ?? {}) as { message?: unknown };
      const text =
        typeof raw.message === "string" ? raw.message.trim() : "";
      if (!text) {
        reply.code(400).send({ error: "message phải là chuỗi không rỗng" });
        return;
      }
      const doctor = req.doctor;
      if (!doctor) {
        reply.code(401).send({ error: "Unauthorized" });
        return;
      }
      const db = await connectDB();
      const conversations = db.collection<ConversationDoc>("conversations");
      const existing = await conversations.findOne({
        id: req.params.id,
        doctorId: { $regex: /^BN\d+$/i },
      });
      if (!existing) {
        reply.code(404).send({ error: "Patient conversation not found" });
        return;
      }
      // Đính kèm danh tính bác sĩ để cả bệnh nhân lẫn AI ở các lượt sau hiểu
      // đây là tin nhắn do bác sĩ nhắn thay AI.
      const finalText = `**Bác sĩ ${doctor.fullName} (nhắn thay AI)**: ${text}`;
      const now = new Date();
      const newMsg: StoredMessage = {
        role: "assistant",
        content: finalText,
      };
      const updatedMessages = [...(existing.messages ?? []), newMsg];
      await conversations.updateOne(
        { id: existing.id },
        { $set: { messages: updatedMessages, updatedAt: now } }
      );
      return {
        ok: true,
        conversationId: existing.id,
        message: {
          id: `msg_${updatedMessages.length - 1}`,
          role: "assistant" as const,
          content: finalText,
          createdAt: now,
        },
      };
    }
  );

  // === Audit (chuyên gia) — CHỈ ĐỌC ===
  // Chuyên gia xem mọi hội thoại chatbot (với bác sĩ + bệnh nhân) để đánh giá
  // chất lượng trả lời, từ đó điều chỉnh skill. Không sửa/xoá.
  type OwnerRole = "doctor" | "patient" | "unknown";
  const ownerRoleOf = (id?: string): OwnerRole =>
    !id ? "unknown" : /^BS/i.test(id) ? "doctor" : /^BN/i.test(id) ? "patient" : "unknown";

  app.get(
    "/conversations/audit",
    { preHandler: [verifyAuth, requireRole("expert")] },
    async () => {
      const db = await connectDB();
      const conversations = db.collection<ConversationDoc>("conversations");
      const docs = await conversations
        .find(
          { doctorId: { $regex: /^(BS|BN)\d+$/i } },
          {
            projection: { _id: 0, id: 1, title: 1, updatedAt: 1, doctorId: 1 },
          }
        )
        .sort({ updatedAt: -1 })
        .toArray();
      const ids = Array.from(
        new Set(docs.map((d) => d.doctorId).filter((x): x is string => !!x))
      );
      const doctorIds = ids.filter((id) => /^BS/i.test(id));
      const patientIds = ids.filter((id) => /^BN/i.test(id));
      const [doctors, patients] = await Promise.all([
        doctorIds.length
          ? db
              .collection<{ id: string; name: string }>("doctors")
              .find({ id: { $in: doctorIds } }, { projection: { _id: 0, id: 1, name: 1 } })
              .toArray()
          : [],
        patientIds.length
          ? db
              .collection<{ id: string; name: string }>("patients")
              .find({ id: { $in: patientIds } }, { projection: { _id: 0, id: 1, name: 1 } })
              .toArray()
          : [],
      ]);
      const nameById = new Map<string, string>();
      for (const d of doctors) nameById.set(d.id, d.name);
      for (const p of patients) nameById.set(p.id, p.name);
      return {
        conversations: docs.map((d) => ({
          id: d.id,
          title: d.title,
          updatedAt: d.updatedAt,
          ownerId: d.doctorId ?? null,
          ownerName: d.doctorId ? nameById.get(d.doctorId) ?? null : null,
          ownerRole: ownerRoleOf(d.doctorId),
        })),
      };
    }
  );

  app.get<{ Params: { id: string } }>(
    "/conversations/audit/:id",
    { preHandler: [verifyAuth, requireRole("expert")] },
    async (req, reply) => {
      const db = await connectDB();
      const conversations = db.collection<ConversationDoc>("conversations");
      const doc = await conversations.findOne(
        { id: req.params.id },
        { projection: { _id: 0 } }
      );
      if (!doc) {
        reply.code(404).send({ error: "Conversation not found" });
        return;
      }
      const ownerRole = ownerRoleOf(doc.doctorId);
      let ownerName: string | null = null;
      if (doc.doctorId && ownerRole !== "unknown") {
        const coll = ownerRole === "doctor" ? "doctors" : "patients";
        const owner = await db
          .collection<{ id: string; name: string }>(coll)
          .findOne({ id: doc.doctorId }, { projection: { _id: 0, name: 1 } });
        ownerName = owner?.name ?? null;
      }
      return {
        id: doc.id,
        title: doc.title,
        ownerId: doc.doctorId ?? null,
        ownerName,
        ownerRole,
        messages: convertMessages(doc.messages ?? [], doc.createdAt),
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    }
  );

  app.get<{ Params: { id: string } }>(
    "/conversations/:id",
    { preHandler: [verifyAuth, requireRole("doctor", "patient")] },
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
    { preHandler: [verifyAuth, requireRole("doctor", "patient")] },
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
