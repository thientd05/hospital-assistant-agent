import type { ServicePrice } from "@pr_hospitalagent/types";
import { connectDB } from "@pr_hospitalagent/api-shared";
import { nextId } from "../lib/id-generator.ts";

const COLLECTION = "serviceprices";
const PROJECTION = { _id: 0 } as const;

async function coll() {
  const db = await connectDB();
  return db.collection<ServicePrice>(COLLECTION);
}

export const servicePriceRepo = {
  nextId: () => nextId(COLLECTION, "DV", 3),

  // Sắp theo danh mục rồi tên để bảng giá dễ đọc.
  async list() {
    const c = await coll();
    return c
      .find({}, { projection: PROJECTION })
      .sort({ category: 1, name: 1 })
      .toArray();
  },
};
