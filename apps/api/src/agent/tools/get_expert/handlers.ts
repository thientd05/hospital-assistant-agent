import type { Expert } from "@pr_hospitalagent/types";
import { connectDB } from "../../../db/client.ts";

export async function handleGetExpert(expertId: string): Promise<string> {
  const id = expertId.trim();
  if (!id) {
    return JSON.stringify({ error: "Thiếu mã chuyên gia." });
  }
  const db = await connectDB();
  const expert = await db
    .collection<Expert>("experts")
    .findOne({ id }, { projection: { _id: 0, passwordHash: 0 } });
  if (!expert) {
    return JSON.stringify({
      error: `Không tìm thấy chuyên gia với mã ${id}`,
    });
  }
  return JSON.stringify(expert);
}
