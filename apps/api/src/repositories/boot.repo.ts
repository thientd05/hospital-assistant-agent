import type { Boot, BootRole } from "@pr_hospitalagent/types";
import { connectDB } from "@pr_hospitalagent/api-shared";

const COLLECTION = "boots";

type BootDoc = Omit<Boot, "updatedAt"> & { updatedAt: Date };

async function coll() {
  const db = await connectDB();
  return db.collection<BootDoc>(COLLECTION);
}

export const bootRepo = {
  // Đọc thiếu = "" (không bootstrap).
  async getContent(role: BootRole): Promise<string> {
    const c = await coll();
    const doc = await c.findOne(
      { role },
      { projection: { _id: 0, content: 1 } }
    );
    return doc?.content ?? "";
  },

  // Ghi = upsert theo role.
  async setContent(role: BootRole, content: string) {
    const c = await coll();
    await c.updateOne(
      { role },
      { $set: { content, updatedAt: new Date() }, $setOnInsert: { role } },
      { upsert: true }
    );
  },
};
