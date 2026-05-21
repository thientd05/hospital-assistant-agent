import type { Filter } from "mongodb";
import type { Appointment } from "@pr_hospitalagent/types";
import { connectDB } from "@pr_hospitalagent/api-shared";
import { nextId } from "../lib/id-generator.ts";

const COLLECTION = "appointments";

export type AppointmentListFilter = {
  doctorId?: string;
  patientId?: string;
  // Với bác sĩ: gồm cả lịch hàng chờ chung (doctorId="", status "Chờ duyệt").
  includePool?: boolean;
};

async function coll() {
  const db = await connectDB();
  return db.collection<Appointment>(COLLECTION);
}

export const appointmentRepo = {
  nextId: () => nextId(COLLECTION, "APT", 4),

  async list(opts: AppointmentListFilter = {}) {
    const c = await coll();
    let filter: Filter<Appointment> = {};
    if (opts.patientId) {
      filter = { patientId: opts.patientId };
    } else if (opts.doctorId) {
      filter = opts.includePool
        ? {
            $or: [
              { doctorId: opts.doctorId },
              { doctorId: "", status: "Chờ duyệt" },
            ],
          }
        : { doctorId: opts.doctorId };
    }
    return c.find(filter).sort({ scheduledAt: 1 }).toArray();
  },

  // Giành lịch hàng chờ chung một cách nguyên tử: chỉ thành công nếu vẫn chưa ai nhận.
  async claim(id: string, doctorId: string) {
    const c = await coll();
    const res = await c.updateOne(
      { id, doctorId: "", status: "Chờ duyệt" },
      { $set: { doctorId, status: "Đã duyệt", updatedAt: new Date() } }
    );
    return res.matchedCount > 0;
  },

  async listAll() {
    const c = await coll();
    return c.find({}, { projection: { _id: 0 } }).toArray();
  },

  async findById(id: string) {
    const c = await coll();
    return c.findOne({ id });
  },

  async insert(appointment: Appointment) {
    const c = await coll();
    await c.insertOne(appointment);
  },

  async patch(id: string, $set: Record<string, unknown>) {
    const c = await coll();
    await c.updateOne({ id }, { $set });
    return c.findOne({ id }, { projection: { _id: 0 } });
  },

  async delete(id: string) {
    const c = await coll();
    await c.deleteOne({ id });
  },
};
