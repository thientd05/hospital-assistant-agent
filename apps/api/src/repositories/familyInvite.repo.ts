import type { FamilyInvite, FamilyInviteStatus } from "@pr_hospitalagent/types";
import { connectDB } from "@pr_hospitalagent/api-shared";
import { nextId } from "../lib/id-generator.ts";

const COLLECTION = "familyinvites";

async function coll() {
  const db = await connectDB();
  return db.collection<FamilyInvite>(COLLECTION);
}

export const familyInviteRepo = {
  nextId: () => nextId(COLLECTION, "FI", 3),

  async insert(invite: FamilyInvite) {
    const c = await coll();
    await c.insertOne(invite);
  },

  async findById(id: string) {
    const c = await coll();
    return c.findOne({ id }, { projection: { _id: 0 } });
  },

  // Lời mời đang chờ giữa đúng một cặp (from → to) — để chống mời trùng.
  async findPendingPair(fromPatientId: string, toPatientId: string) {
    const c = await coll();
    return c.findOne(
      { fromPatientId, toPatientId, status: "pending" },
      { projection: { _id: 0 } }
    );
  },

  // Các lời mời đang chờ mà một BN nhận được.
  async listPendingFor(toPatientId: string) {
    const c = await coll();
    return c
      .find({ toPatientId, status: "pending" }, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
  },

  // Chuyển trạng thái nguyên tử: chỉ đổi khi vẫn còn "pending" (chống xử lý 2 lần).
  async settle(id: string, status: Exclude<FamilyInviteStatus, "pending">) {
    const c = await coll();
    const res = await c.updateOne(
      { id, status: "pending" },
      { $set: { status, updatedAt: new Date() } }
    );
    return res.matchedCount > 0;
  },
};
