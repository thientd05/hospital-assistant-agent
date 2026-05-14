import type { Manager, ManagerPublic } from "@pr_hospitalagent/types";
import { connectDB } from "@pr_hospitalagent/api-shared";

const COLLECTION = "managers";
const PUBLIC_PROJECTION = { _id: 0, passwordHash: 0 } as const;

async function coll() {
  const db = await connectDB();
  return db.collection<Manager>(COLLECTION);
}

export const managerRepo = {
  async findById(id: string): Promise<ManagerPublic | null> {
    const c = await coll();
    return (await c.findOne(
      { id },
      { projection: PUBLIC_PROJECTION }
    )) as ManagerPublic | null;
  },

  async findByUsername(username: string): Promise<Manager | null> {
    const c = await coll();
    return c.findOne({ username });
  },

  async patch(id: string, $set: Record<string, unknown>) {
    const c = await coll();
    const res = await c.updateOne({ id }, { $set });
    return res.matchedCount > 0;
  },
};
