import { connectDB } from "@pr_hospitalagent/api-shared";

const COLLECTION = "conversations";

// Stored message = Anthropic.MessageParam (raw). Định nghĩa structural ở đây để
// tầng API không phải phụ thuộc @anthropic-ai/sdk.
export type StoredBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: unknown }
  | { type: string; [k: string]: unknown };

export type StoredMessage = {
  role: "user" | "assistant";
  content: string | StoredBlock[];
};

export type ConversationDoc = {
  id: string;
  title: string;
  doctorId?: string;
  patientId?: string;
  messages: StoredMessage[];
  createdAt: Date;
  updatedAt: Date;
};

const SUMMARY_PROJECTION = {
  _id: 0,
  id: 1,
  title: 1,
  updatedAt: 1,
  doctorId: 1,
  patientId: 1,
} as const;

async function coll() {
  const db = await connectDB();
  return db.collection<ConversationDoc>(COLLECTION);
}

export const conversationRepo = {
  // `doctorId` giữ ID owner bất kỳ role (lý do lịch sử).
  async listByOwner(ownerId: string) {
    const c = await coll();
    return c
      .find({ doctorId: ownerId }, { projection: SUMMARY_PROJECTION })
      .sort({ updatedAt: -1 })
      .toArray();
  },

  async findByOwner(id: string, ownerId: string) {
    const c = await coll();
    return c.findOne({ id, doctorId: ownerId }, { projection: { _id: 0 } });
  },

  async listByPattern(pattern: RegExp) {
    const c = await coll();
    return c
      .find({ doctorId: { $regex: pattern } }, { projection: SUMMARY_PROJECTION })
      .sort({ updatedAt: -1 })
      .toArray();
  },

  async findByPattern(id: string, pattern: RegExp) {
    const c = await coll();
    return c.findOne(
      { id, doctorId: { $regex: pattern } },
      { projection: { _id: 0 } }
    );
  },

  async findById(id: string) {
    const c = await coll();
    return c.findOne({ id }, { projection: { _id: 0 } });
  },

  async upsert(
    id: string,
    ownerId: string,
    data: { title?: string; messages: StoredMessage[] }
  ) {
    const c = await coll();
    const now = new Date();
    const existing = await c.findOne({ id }, { projection: { _id: 0, title: 1 } });
    await c.updateOne(
      { id },
      {
        $set: {
          id,
          doctorId: ownerId,
          title: data.title ?? existing?.title ?? "",
          messages: data.messages,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );
    return c.findOne({ id }, { projection: { _id: 0 } });
  },

  async appendMessage(id: string, message: StoredMessage) {
    const c = await coll();
    const now = new Date();
    await c.updateOne(
      { id },
      { $push: { messages: message }, $set: { updatedAt: now } }
    );
    return now;
  },

  async delete(id: string, ownerId: string) {
    const c = await coll();
    const res = await c.deleteOne({ id, doctorId: ownerId });
    return res.deletedCount > 0;
  },
};
