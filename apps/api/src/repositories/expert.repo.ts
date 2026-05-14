import type { Expert, ExpertPublic } from "@pr_hospitalagent/types";
import { connectDB } from "@pr_hospitalagent/api-shared";
import { nextId } from "../lib/id-generator.ts";

const COLLECTION = "experts";
const PUBLIC_PROJECTION = { _id: 0, passwordHash: 0 } as const;

async function coll() {
  const db = await connectDB();
  return db.collection<Expert>(COLLECTION);
}

export const expertRepo = {
  nextId: () => nextId(COLLECTION, "CG", 3),

  async listSummary() {
    const c = await coll();
    return c
      .find(
        {},
        {
          projection: {
            _id: 0,
            id: 1,
            fullName: 1,
            title: 1,
            expertise: 1,
            phone: 1,
            email: 1,
          },
        }
      )
      .sort({ id: 1 })
      .toArray();
  },

  async findById(id: string): Promise<ExpertPublic | null> {
    const c = await coll();
    return (await c.findOne(
      { id },
      { projection: PUBLIC_PROJECTION }
    )) as ExpertPublic | null;
  },

  async findByUsername(username: string): Promise<Expert | null> {
    const c = await coll();
    return c.findOne({ username });
  },

  async insert(expert: Expert) {
    const c = await coll();
    await c.insertOne(expert);
  },

  async patch(id: string, $set: Record<string, unknown>) {
    const c = await coll();
    const res = await c.updateOne({ id }, { $set });
    return res.matchedCount > 0;
  },

  async delete(id: string) {
    const c = await coll();
    const res = await c.deleteOne({ id });
    return res.deletedCount > 0;
  },
};
