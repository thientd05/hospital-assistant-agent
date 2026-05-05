import type { Patient } from "@pr_hospitalagent/types";
import { connectDB } from "../../../db/client.ts";

export async function handleListPatients(): Promise<string> {
  const db = await connectDB();
  const docs = await db
    .collection<Patient>("patients")
    .find(
      {},
      {
        projection: {
          _id: 0,
          id: 1,
          name: 1,
          age: 1,
          gender: 1,
          ward: 1,
          diagnoses: 1,
        },
      }
    )
    .sort({ id: 1 })
    .toArray();

  return JSON.stringify({ count: docs.length, patients: docs });
}
