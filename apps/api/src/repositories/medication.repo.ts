import type { Medication } from "@pr_hospitalagent/types";
import { connectDB } from "@pr_hospitalagent/api-shared";
import { nextId } from "../lib/id-generator.ts";

const COLLECTION = "medications";
const PROJECTION = { _id: 0 } as const;

async function coll() {
  const db = await connectDB();
  return db.collection<Medication>(COLLECTION);
}

export const medicationRepo = {
  nextId: () => nextId(COLLECTION, "TH", 3),

  // Sắp theo tên cho bác sĩ dễ tìm trong form chọn thuốc.
  async list() {
    const c = await coll();
    return c.find({}, { projection: PROJECTION }).sort({ name: 1 }).toArray();
  },
};
