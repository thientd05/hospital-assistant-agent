import type { Asset } from "@pr_hospitalagent/types";
import { connectDB } from "@pr_hospitalagent/api-shared";
import { nextId } from "../lib/id-generator.ts";

const COLLECTION = "assets";
const PROJECTION = { _id: 0 } as const;

async function coll() {
  const db = await connectDB();
  return db.collection<Asset>(COLLECTION);
}

export const assetRepo = {
  nextId: () => nextId(COLLECTION, "TS", 3),

  async list() {
    const c = await coll();
    return c.find({}, { projection: PROJECTION }).sort({ id: 1 }).toArray();
  },

  async listAll() {
    const c = await coll();
    return c.find({}, { projection: PROJECTION }).toArray();
  },

  async findById(id: string) {
    const c = await coll();
    return c.findOne({ id }, { projection: PROJECTION });
  },

  async insert(asset: Asset) {
    const c = await coll();
    await c.insertOne(asset);
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
