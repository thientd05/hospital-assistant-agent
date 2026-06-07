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

  // Bản ghi lịch sử khám MỚI NHẤT của 1 bệnh nhân (để so sánh khi bác sĩ "Ghi
  // nhận" — chỉ tạo bản ghi mới khi có thay đổi so với lần này).
  async latestByPatient(patientId: string): Promise<ExamRecord | null> {
    const c = await coll();
    return c.findOne({ patientId }, { projection: PROJECTION, sort: { examDate: -1 } });
  },

  // LUÔN tạo một bản ghi mới (mỗi lần "Ghi nhận" có thay đổi = một lần khám mới).
  async insertSnapshot(snap: Snapshot): Promise<ExamRecord> {
    const c = await coll();
    const now = new Date();
    const id = await this.nextId();
    const record: ExamRecord = { id, ...snap, createdAt: now, updatedAt: now };
    await c.insertOne(record);
    return record;
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
