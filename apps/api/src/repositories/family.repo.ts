import type { Family } from "@pr_hospitalagent/types";
import { connectDB } from "@pr_hospitalagent/api-shared";
import { nextId } from "../lib/id-generator.ts";

const COLLECTION = "families";

async function coll() {
  const db = await connectDB();
  return db.collection<Family>(COLLECTION);
}

export const familyRepo = {
  nextId: () => nextId(COLLECTION, "GD", 3),

  // Gia đình của một thành viên — null nếu chưa thuộc nhóm nào.
  async findByMember(patientId: string) {
    const c = await coll();
    return c.findOne({ memberIds: patientId }, { projection: { _id: 0 } });
  },

  async findById(id: string) {
    const c = await coll();
    return c.findOne({ id }, { projection: { _id: 0 } });
  },

  async insert(family: Family) {
    const c = await coll();
    await c.insertOne(family);
  },

  // Thêm thành viên nguyên tử + idempotent: chỉ thành công khi nhóm tồn tại và
  // người này CHƯA ở trong nhóm (`$ne`). Caller đã chốt người này chưa thuộc nhóm
  // nào ở tầng service.
  async addMember(familyId: string, patientId: string) {
    const c = await coll();
    const res = await c.updateOne(
      { id: familyId, memberIds: { $ne: patientId } },
      { $addToSet: { memberIds: patientId }, $set: { updatedAt: new Date() } }
    );
    return res.matchedCount > 0;
  },

  async rename(familyId: string, name: string) {
    const c = await coll();
    const res = await c.updateOne(
      { id: familyId },
      { $set: { name, updatedAt: new Date() } }
    );
    return res.matchedCount > 0;
  },

  async removeMember(familyId: string, patientId: string) {
    const c = await coll();
    await c.updateOne(
      { id: familyId },
      { $pull: { memberIds: patientId }, $set: { updatedAt: new Date() } }
    );
  },

  async delete(familyId: string) {
    const c = await coll();
    await c.deleteOne({ id: familyId });
  },
};
