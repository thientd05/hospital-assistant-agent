import type { Appointment } from "@pr_hospitalagent/types";
import { connectDB } from "@pr_hospitalagent/api-shared";
import { nextId } from "../lib/id-generator.ts";

const COLLECTION = "appointments";

async function coll() {
  const db = await connectDB();
  return db.collection<Appointment>(COLLECTION);
}

export const appointmentRepo = {
  nextId: () => nextId(COLLECTION, "APT", 4),

  async list(doctorId?: string) {
    const c = await coll();
    const filter = doctorId ? { doctorId } : {};
    return c.find(filter).sort({ scheduledAt: 1 }).toArray();
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
