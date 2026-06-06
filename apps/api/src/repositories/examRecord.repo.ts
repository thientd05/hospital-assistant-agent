import type { ExamRecord } from "@pr_hospitalagent/types";
import { connectDB } from "@pr_hospitalagent/api-shared";
import { nextId } from "../lib/id-generator.ts";

const COLLECTION = "examrecords";
const PROJECTION = { _id: 0 } as const;

async function coll() {
  const db = await connectDB();
  return db.collection<ExamRecord>(COLLECTION);
}

// Snapshot lâm sàng (phần thay đổi mỗi lần khám) — id/createdAt do repo quản lý.
type Snapshot = Omit<ExamRecord, "id" | "createdAt" | "updatedAt">;

export const examRecordRepo = {
  nextId: () => nextId(COLLECTION, "KB", 3),

  // Gộp theo ngày: cùng (patientId, day) → cập nhật bản ghi sẵn có; khác ngày →
  // tạo bản ghi mới. Tránh nhân đôi khi bác sĩ sửa nhiều lần trong một ngày.
  async upsertSnapshot(snap: Snapshot) {
    const c = await coll();
    const now = new Date();
    const existing = await c.findOne(
      { patientId: snap.patientId, day: snap.day },
      { projection: { _id: 0, id: 1 } }
    );
    if (existing) {
      await c.updateOne(
        { patientId: snap.patientId, day: snap.day },
        { $set: { ...snap, updatedAt: now } }
      );
      return existing.id;
    }
    const id = await this.nextId();
    const record: ExamRecord = { id, ...snap, createdAt: now, updatedAt: now };
    await c.insertOne(record);
    return id;
  },

  // Lịch sử khám của 1 bệnh nhân, mới nhất trước.
  async listByPatient(patientId: string): Promise<ExamRecord[]> {
    const c = await coll();
    return c
      .find({ patientId }, { projection: PROJECTION })
      .sort({ examDate: -1 })
      .toArray();
  },
};
