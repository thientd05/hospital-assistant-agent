import type { Doctor, DoctorPublic } from "@pr_hospitalagent/types";
import { connectDB } from "@pr_hospitalagent/api-shared";
import { nextId } from "../lib/id-generator.ts";

const COLLECTION = "doctors";
const PUBLIC_PROJECTION = { _id: 0, passwordHash: 0 } as const;

async function coll() {
  const db = await connectDB();
  return db.collection<Doctor>(COLLECTION);
}

export const doctorRepo = {
  nextId: () => nextId(COLLECTION, "BS", 3),

  async listSummary() {
    const c = await coll();
    return c
      .find(
        {},
        {
          projection: {
            _id: 0,
            id: 1,
            fullName: 1,
            title: 1,
            department: 1,
            specialty: 1,
            phone: 1,
            email: 1,
          },
        }
      )
      .sort({ id: 1 })
      .toArray();
  },

  async findById(id: string): Promise<DoctorPublic | null> {
    const c = await coll();
    return (await c.findOne(
      { id },
      { projection: PUBLIC_PROJECTION }
    )) as DoctorPublic | null;
  },

  async findByUsername(username: string): Promise<Doctor | null> {
    const c = await coll();
    return c.findOne({ username });
  },

  async insert(doctor: Doctor) {
    const c = await coll();
    await c.insertOne(doctor);
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

  async listByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const c = await coll();
    return c
      .find(
        { id: { $in: ids } },
        { projection: { id: 1, fullName: 1, _id: 0 } }
      )
      .toArray();
  },

  // DS id bệnh nhân bác sĩ này quản lý (mặc định [] nếu chưa có).
  async getManagedIds(doctorId: string): Promise<string[]> {
    const c = await coll();
    const doc = await c.findOne(
      { id: doctorId },
      { projection: { _id: 0, patientIds: 1 } }
    );
    return doc?.patientIds ?? [];
  },

  // Thêm bệnh nhân vào danh sách quản lý (idempotent).
  async addManagedPatient(doctorId: string, patientId: string) {
    const c = await coll();
    await c.updateOne(
      { id: doctorId },
      { $addToSet: { patientIds: patientId } }
    );
  },

  // Các bác sĩ đang quản lý 1 bệnh nhân (reverse lookup) — cho FE bệnh nhân.
  async listManaging(patientId: string) {
    const c = await coll();
    return c
      .find(
        { patientIds: patientId },
        { projection: { _id: 0, id: 1, fullName: 1, department: 1 } }
      )
      .sort({ id: 1 })
      .toArray();
  },
};
