import type { Expert } from "@pr_hospitalagent/types";
import { connectDB } from "../../../db/client.ts";

export async function handleListExperts(): Promise<string> {
  const db = await connectDB();
  const docs = await db
    .collection<Expert>("experts")
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

  return JSON.stringify({ count: docs.length, experts: docs });
}
