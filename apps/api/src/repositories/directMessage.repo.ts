import type { DirectMessage, DirectThread } from "@pr_hospitalagent/types";
import { connectDB } from "@pr_hospitalagent/api-shared";
import { nextId } from "../lib/id-generator.ts";

const COLLECTION = "directmessages";

async function coll() {
  const db = await connectDB();
  return db.collection<DirectThread>(COLLECTION);
}

export const directMessageRepo = {
  nextId: () => nextId(COLLECTION, "DM", 3),

  // Thread của đúng 1 cặp (doctorId, patientId) — null nếu chưa có.
  async findPair(doctorId: string, patientId: string) {
    const c = await coll();
    return c.findOne({ doctorId, patientId }, { projection: { _id: 0 } });
  },

  async listByDoctor(doctorId: string) {
    const c = await coll();
    return c
      .find({ doctorId }, { projection: { _id: 0 } })
      .sort({ updatedAt: -1 })
      .toArray();
  },

  async listByPatient(patientId: string) {
    const c = await coll();
    return c
      .find({ patientId }, { projection: { _id: 0 } })
      .sort({ updatedAt: -1 })
      .toArray();
  },

  // Thêm tin vào thread (tạo thread rỗng nếu chưa có). Trả thời điểm gửi.
  async appendMessage(
    doctorId: string,
    patientId: string,
    message: DirectMessage
  ): Promise<Date> {
    const c = await coll();
    const now = message.createdAt;
    const existing = await c.findOne(
      { doctorId, patientId },
      { projection: { _id: 0, id: 1 } }
    );
    if (!existing) {
      await c.insertOne({
        id: await directMessageRepo.nextId(),
        doctorId,
        patientId,
        messages: [message],
        createdAt: now,
        updatedAt: now,
      });
      return now;
    }
    await c.updateOne(
      { doctorId, patientId },
      { $push: { messages: message }, $set: { updatedAt: now } }
    );
    return now;
  },
};
