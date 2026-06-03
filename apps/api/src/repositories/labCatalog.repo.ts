import type { LabCatalogEntry } from "@pr_hospitalagent/types";
import { connectDB } from "@pr_hospitalagent/api-shared";

const COLLECTION = "labcatalogs";
const PROJECTION = { _id: 0 } as const;

async function coll() {
  const db = await connectDB();
  return db.collection<LabCatalogEntry>(COLLECTION);
}

// Khớp tên không phân biệt hoa/thường (giữ ngữ nghĩa cũ của findLabEntry).
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const labCatalogRepo = {
  // Sắp theo tên cho bác sĩ dễ tìm trong dropdown chọn xét nghiệm.
  async list(): Promise<LabCatalogEntry[]> {
    const c = await coll();
    return c.find({}, { projection: PROJECTION }).sort({ name: 1 }).toArray();
  },

  async findByName(name: string): Promise<LabCatalogEntry | null> {
    const c = await coll();
    const trimmed = name.trim();
    return c.findOne(
      { name: { $regex: `^${escapeRegex(trimmed)}$`, $options: "i" } },
      { projection: PROJECTION }
    );
  },
};
