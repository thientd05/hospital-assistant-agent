import type { Workspace, WorkspaceKey } from "@pr_hospitalagent/types";
import { connectDB } from "@pr_hospitalagent/api-shared";

const COLLECTION = "workspaces";

type WorkspaceDoc = Omit<Workspace, "updatedAt"> & { updatedAt: Date };

async function coll() {
  const db = await connectDB();
  return db.collection<WorkspaceDoc>(COLLECTION);
}

export const workspaceRepo = {
  // Đọc thiếu = "" (không bootstrap).
  async get(ownerId: string): Promise<{ memory: string; soul: string; user: string }> {
    const c = await coll();
    const doc = await c.findOne(
      { id: ownerId },
      { projection: { _id: 0, memory: 1, soul: 1, user: 1 } }
    );
    return {
      memory: doc?.memory ?? "",
      soul: doc?.soul ?? "",
      user: doc?.user ?? "",
    };
  },

  // Ghi = upsert một field.
  async setField(ownerId: string, key: WorkspaceKey, content: string) {
    const c = await coll();
    await c.updateOne(
      { id: ownerId },
      {
        $set: { [key]: content, updatedAt: new Date() },
        $setOnInsert: { id: ownerId },
      },
      { upsert: true }
    );
  },
};
