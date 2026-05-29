import type { Skill } from "@pr_hospitalagent/types";
import { connectDB } from "@pr_hospitalagent/api-shared";

const COLLECTION = "skills";

type SkillDoc = Omit<Skill, "createdAt" | "updatedAt"> & {
  createdAt: Date;
  updatedAt: Date;
};

async function coll() {
  const db = await connectDB();
  return db.collection<SkillDoc>(COLLECTION);
}

export const skillRepo = {
  async list(): Promise<{ name: string; content: string }[]> {
    const c = await coll();
    return c
      .find({}, { projection: { _id: 0, name: 1, content: 1 } })
      .sort({ name: 1 })
      .toArray();
  },

  async findByName(name: string): Promise<{ name: string; content: string } | null> {
    const c = await coll();
    return c.findOne({ name }, { projection: { _id: 0, name: 1, content: 1 } });
  },

  // Upsert theo name. Giữ createdAt cũ, cập nhật updatedAt.
  async upsert(name: string, content: string) {
    const c = await coll();
    const now = new Date();
    await c.updateOne(
      { name },
      {
        $set: { content, updatedAt: now },
        $setOnInsert: { name, createdAt: now },
      },
      { upsert: true }
    );
  },

  async delete(name: string): Promise<boolean> {
    const c = await coll();
    const res = await c.deleteOne({ name });
    return res.deletedCount > 0;
  },
};
