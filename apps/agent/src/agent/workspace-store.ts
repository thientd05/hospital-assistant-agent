import { connectDB } from "@pr_hospitalagent/api-shared";
import type { Workspace, WorkspaceKey } from "@pr_hospitalagent/types";

const ID_RE = /^[A-Za-z0-9_-]+$/;
const COLLECTION = "workspaces";

type WorkspaceDoc = Omit<Workspace, "updatedAt"> & { updatedAt: Date };

function assertId(id: string): void {
  if (!ID_RE.test(id)) {
    throw new Error(`Mã người dùng không hợp lệ: ${id}`);
  }
}

async function collection() {
  const db = await connectDB();
  return db.collection<WorkspaceDoc>(COLLECTION);
}

/**
 * Đọc workspace của một user. Doc/field thiếu → trả "" (không cần bootstrap).
 */
export async function getWorkspace(
  ownerId: string
): Promise<{ memory: string; soul: string; user: string }> {
  assertId(ownerId);
  const coll = await collection();
  const doc = await coll.findOne(
    { id: ownerId },
    { projection: { _id: 0, memory: 1, soul: 1, user: 1 } }
  );
  return {
    memory: doc?.memory ?? "",
    soul: doc?.soul ?? "",
    user: doc?.user ?? "",
  };
}

/**
 * Ghi đè một field workspace. Upsert: tạo doc nếu chưa có.
 */
export async function setWorkspaceFile(
  ownerId: string,
  key: WorkspaceKey,
  content: string
): Promise<void> {
  assertId(ownerId);
  const coll = await collection();
  await coll.updateOne(
    { id: ownerId },
    {
      $set: { [key]: content, updatedAt: new Date() },
      $setOnInsert: { id: ownerId },
    },
    { upsert: true }
  );
}
